// ── Workflow Engine ────────────────────────────────────────────────
// Pure state machine over RequestInstance. No I/O: callers persist the
// returned instance and dispatch the returned events (emails, audit log).
//
// Contract (see docs/workflow-definitions.md):
// - Instantiation snapshots the definition version; in-flight requests never migrate.
// - A false stage condition skips the stage and emits stage.skipped for the audit trail.
// - Transitions are idempotent: replaying an identical decision is a no-op with no events.
// - Terminal states (approved/rejected/cancelled/completed) accept no transitions.

import {
  ApprovalRule,
  Decision,
  Directory,
  EngineEvent,
  EvalContext,
  RequestInstance,
  RequestStatus,
  RuntimeStage,
  StageDefinition,
  WorkflowDefinition,
} from './types'
import { evaluateCondition } from './conditions'
import { resolveApprover } from './resolvers'

export class TransitionError extends Error {}

const TERMINAL: ReadonlySet<RequestStatus> = new Set(['approved', 'rejected', 'cancelled', 'completed'])

export function isTerminal(status: RequestStatus): boolean {
  return TERMINAL.has(status)
}

export function currentStage(instance: RequestInstance): RuntimeStage | null {
  if (instance.current_stage_index < 0) return null
  return instance.stages[instance.current_stage_index] ?? null
}

function quorumNeeded(rule: ApprovalRule, approverCount: number): number {
  if (rule === 'all') return approverCount
  if (rule === 'any') return 1
  const n = parseInt(rule.slice('quorum:'.length), 10)
  if (isNaN(n) || n < 1) throw new TransitionError(`Invalid approval rule '${rule}'`)
  return Math.min(n, approverCount)
}

function statusForActiveStage(stage: RuntimeStage): RequestStatus {
  return stage.type === 'fulfilment' ? 'in_fulfilment' : 'in_progress'
}

// ── Instantiation ──────────────────────────────────────────────────

export interface InstantiationResult {
  instance: RequestInstance
  events: EngineEvent[]
}

export async function instantiateWorkflow(
  definition: WorkflowDefinition,
  ctx: EvalContext,
  directory: Directory,
  now: () => string = () => new Date().toISOString()
): Promise<InstantiationResult> {
  if (definition.status !== 'active') {
    throw new TransitionError(`Workflow '${definition.id}' v${definition.version} is ${definition.status}, not active`)
  }

  const events: EngineEvent[] = [{ type: 'request.submitted' }]
  const stages: RuntimeStage[] = []

  for (const stageDef of definition.stages) {
    const included = evaluateCondition(stageDef.condition, ctx)
    if (!included) {
      stages.push(buildRuntimeStage(definition, stageDef, [], 'skipped'))
      events.push({ type: 'stage.skipped', stage_id: stageDef.id, data: { condition: stageDef.condition } })
      continue
    }
    const specs = stageDef.type === 'parallel_approval'
      ? (stageDef.approvers ?? [])
      : (stageDef.approver ? [stageDef.approver] : [])
    if (!specs.length) {
      throw new TransitionError(`Stage '${stageDef.id}' has no approver/assignee configured`)
    }
    const resolved = (await Promise.all(specs.map(s => resolveApprover(s, ctx, directory)))).flat()
    // De-duplicate: the same person resolved via two specs approves once.
    const seen = new Set<string>()
    const approvers = resolved.filter(a => {
      const key = a.email.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    stages.push(buildRuntimeStage(definition, stageDef, approvers.map(a => ({
      email: a.email,
      label: a.label,
      decision: 'pending' as const,
    })), 'pending'))
  }

  const instance: RequestInstance = {
    workflow_slug: definition.id,
    workflow_version: definition.version,
    status: 'in_progress',
    stages,
    current_stage_index: -1,
  }

  const firstActive = stages.findIndex(s => s.status === 'pending')
  if (firstActive === -1) {
    // Every stage was skipped by its condition — auto-approve.
    instance.status = 'approved'
    events.push({ type: 'request.approved', data: { auto: true } })
  } else {
    activateStage(instance, firstActive, events, now)
  }

  return { instance, events }
}

function buildRuntimeStage(
  definition: WorkflowDefinition,
  stageDef: StageDefinition,
  approvers: RuntimeStage['approvers'],
  status: RuntimeStage['status']
): RuntimeStage {
  // Group-resolved single stages are shared queues — first member to action
  // them completes the stage, unless an explicit approval_rule says otherwise.
  const defaultRule: ApprovalRule =
    stageDef.type !== 'parallel_approval' && stageDef.approver?.resolve_by === 'group' ? 'any' : 'all'
  return {
    id: stageDef.id,
    name: stageDef.name,
    type: stageDef.type,
    status,
    approval_rule: stageDef.approval_rule ?? defaultRule,
    approvers,
    sla_hours: stageDef.sla_hours ?? definition.sla_default_hours,
    on_reject: stageDef.on_reject ?? 'terminate',
  }
}

function activateStage(
  instance: RequestInstance,
  index: number,
  events: EngineEvent[],
  now: () => string
): void {
  const stage = instance.stages[index]
  stage.status = 'active'
  stage.entered_at = now()
  instance.current_stage_index = index
  instance.status = statusForActiveStage(stage)
  events.push({
    type: 'stage.entered',
    stage_id: stage.id,
    data: { approvers: stage.approvers.map(a => a.email) },
  })
}

// ── Decisions ──────────────────────────────────────────────────────

export interface DecisionResult {
  instance: RequestInstance
  events: EngineEvent[]
  /** true when the call was a duplicate and nothing changed */
  noop: boolean
}

export function applyDecision(
  input: RequestInstance,
  stageId: string,
  approverEmail: string,
  decision: Decision,
  comments?: string,
  now: () => string = () => new Date().toISOString()
): DecisionResult {
  const email = approverEmail.toLowerCase()

  // Idempotency: an identical decision already recorded anywhere is a no-op,
  // even if the workflow has since moved on (duplicate email-link clicks).
  const priorStage = input.stages.find(s => s.id === stageId)
  if (!priorStage) throw new TransitionError(`Unknown stage '${stageId}'`)
  const prior = priorStage.approvers.find(a => a.email.toLowerCase() === email)
  if (prior && prior.decision === decision) {
    return { instance: input, events: [], noop: true }
  }

  if (isTerminal(input.status)) {
    throw new TransitionError(`Request is ${input.status}; no further actions are possible`)
  }

  const instance: RequestInstance = structuredClone(input)
  const events: EngineEvent[] = []
  const stage = currentStage(instance)

  if (!stage || stage.id !== stageId) {
    throw new TransitionError(
      `Stage '${stageId}' is not the active stage${stage ? ` (currently '${stage.id}')` : ''}`
    )
  }

  const approver = stage.approvers.find(a => a.email.toLowerCase() === email)
  if (!approver) {
    throw new TransitionError(`${approverEmail} is not an approver on stage '${stageId}'`)
  }
  if (approver.decision !== 'pending') {
    throw new TransitionError(
      `${approverEmail} already recorded '${approver.decision}' on stage '${stageId}'`
    )
  }

  approver.decision = decision
  approver.acted_at = now()
  approver.comments = comments
  events.push({
    type: 'approval.recorded',
    stage_id: stage.id,
    actor_email: approverEmail,
    data: { decision, comments },
  })

  if (decision === 'returned') {
    instance.status = 'returned'
    instance.current_stage_index = -1
    events.push({ type: 'request.returned', stage_id: stage.id, actor_email: approverEmail, data: { comments } })
    return { instance, events, noop: false }
  }

  if (decision === 'rejected') {
    return handleRejection(instance, stage, approverEmail, comments, events, now)
  }

  // decision === 'approved' — check whether the stage's rule is now satisfied
  const approvedCount = stage.approvers.filter(a => a.decision === 'approved').length
  if (approvedCount >= quorumNeeded(stage.approval_rule, stage.approvers.length)) {
    completeStage(instance, stage, events, now)
  }
  return { instance, events, noop: false }
}

function handleRejection(
  instance: RequestInstance,
  stage: RuntimeStage,
  actorEmail: string,
  comments: string | undefined,
  events: EngineEvent[],
  now: () => string
): DecisionResult {
  const onReject = stage.on_reject ?? 'terminate'

  if (onReject.startsWith('return_to_stage:')) {
    const targetId = onReject.slice('return_to_stage:'.length)
    const targetIndex = instance.stages.findIndex(s => s.id === targetId)
    if (targetIndex === -1) throw new TransitionError(`on_reject targets unknown stage '${targetId}'`)
    // Reset the target stage and everything after it, then re-enter the target.
    for (let i = targetIndex; i < instance.stages.length; i++) {
      const s = instance.stages[i]
      if (s.status === 'skipped') continue
      s.status = 'pending'
      s.entered_at = undefined
      s.completed_at = undefined
      s.approvers = s.approvers.map(a => ({ email: a.email, label: a.label, decision: 'pending' as const }))
    }
    events.push({ type: 'stage.rejected', stage_id: stage.id, actor_email: actorEmail, data: { comments, returned_to: targetId } })
    activateStage(instance, targetIndex, events, now)
    return { instance, events, noop: false }
  }

  if (onReject === 'notify_only') {
    // Rejection is recorded but only terminates if the stage rule can no
    // longer be satisfied by the remaining pending approvers.
    const approved = stage.approvers.filter(a => a.decision === 'approved').length
    const pending = stage.approvers.filter(a => a.decision === 'pending').length
    if (approved + pending >= quorumNeeded(stage.approval_rule, stage.approvers.length)) {
      events.push({ type: 'stage.rejected', stage_id: stage.id, actor_email: actorEmail, data: { comments, advisory: true } })
      return { instance, events, noop: false }
    }
  }

  // Default: terminate
  stage.status = 'rejected'
  stage.completed_at = now()
  instance.status = 'rejected'
  instance.current_stage_index = -1
  events.push({ type: 'stage.rejected', stage_id: stage.id, actor_email: actorEmail, data: { comments } })
  events.push({ type: 'request.rejected', stage_id: stage.id, actor_email: actorEmail, data: { comments } })
  return { instance, events, noop: false }
}

function completeStage(
  instance: RequestInstance,
  stage: RuntimeStage,
  events: EngineEvent[],
  now: () => string
): void {
  stage.status = 'approved'
  stage.completed_at = now()
  events.push({ type: 'stage.approved', stage_id: stage.id })

  const nextIndex = instance.stages.findIndex(
    (s, i) => i > instance.current_stage_index && s.status === 'pending'
  )
  if (nextIndex !== -1) {
    activateStage(instance, nextIndex, events, now)
    return
  }

  instance.current_stage_index = -1
  if (stage.type === 'fulfilment') {
    instance.status = 'completed'
    events.push({ type: 'request.completed', stage_id: stage.id })
  } else {
    instance.status = 'approved'
    events.push({ type: 'request.approved', stage_id: stage.id })
  }
}

// ── Cancellation ───────────────────────────────────────────────────

export function cancelRequest(input: RequestInstance): RequestInstance {
  if (isTerminal(input.status)) {
    throw new TransitionError(`Request is ${input.status}; it cannot be cancelled`)
  }
  const instance = structuredClone(input)
  instance.status = 'cancelled'
  instance.current_stage_index = -1
  return instance
}
