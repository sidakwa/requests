import { describe, it, expect } from 'vitest'
import { applyDecision, cancelRequest, currentStage, instantiateWorkflow, TransitionError } from '../engine'
import { RequestInstance, WorkflowDefinition } from '../types'
import { capexContext, capexDefinition, fakeDirectory } from './fixtures'

const dir = fakeDirectory()

async function instantiate(amountUsd: number) {
  return instantiateWorkflow(capexDefinition, capexContext(amountUsd), dir)
}

function activeStageIds(instance: RequestInstance): string[] {
  return instance.stages.filter(s => s.status !== 'skipped').map(s => s.id)
}

describe('instantiation & value-based routing (DoA parity)', () => {
  it('≤ $10k routes to Department Head only', async () => {
    const { instance } = await instantiate(8000)
    expect(activeStageIds(instance)).toEqual(['dept-head'])
    expect(currentStage(instance)?.id).toBe('dept-head')
    expect(currentStage(instance)?.approvers[0].email).toBe('head@seacom.com')
  })

  it('≤ $50k adds Chief/Executive', async () => {
    const { instance } = await instantiate(45000)
    expect(activeStageIds(instance)).toEqual(['dept-head', 'chief'])
  })

  it('≤ $100k adds Head of CIC', async () => {
    const { instance } = await instantiate(99000)
    expect(activeStageIds(instance)).toEqual(['dept-head', 'chief', 'head-cic'])
  })

  it('> $100k runs the full 5-stage chain', async () => {
    const { instance } = await instantiate(250000)
    expect(activeStageIds(instance)).toEqual(['dept-head', 'chief', 'head-cic', 'finance-review', 'cfo'])
  })

  it('records skipped stages in the audit events', async () => {
    const { events } = await instantiate(8000)
    const skipped = events.filter(e => e.type === 'stage.skipped').map(e => e.stage_id)
    expect(skipped).toEqual(['chief', 'head-cic', 'finance-review', 'cfo'])
    expect(events[0].type).toBe('request.submitted')
    expect(events.at(-1)).toMatchObject({ type: 'stage.entered', stage_id: 'dept-head' })
  })

  it('pins the workflow version on the instance', async () => {
    const { instance } = await instantiate(8000)
    expect(instance.workflow_slug).toBe('capex-approval')
    expect(instance.workflow_version).toBe(1)
  })

  it('auto-approves when every stage is skipped', async () => {
    const def: WorkflowDefinition = {
      ...capexDefinition,
      stages: capexDefinition.stages.map(s => ({ ...s, condition: 'request.amount_usd > 999999999' })),
    }
    const { instance, events } = await instantiateWorkflow(def, capexContext(1), dir)
    expect(instance.status).toBe('approved')
    expect(events.at(-1)).toMatchObject({ type: 'request.approved', data: { auto: true } })
  })

  it('refuses to instantiate a non-active workflow', async () => {
    const def = { ...capexDefinition, status: 'draft' as const }
    await expect(instantiateWorkflow(def, capexContext(1), dir)).rejects.toThrow(TransitionError)
  })

  it('fails loudly when an approver cannot be resolved', async () => {
    const ctx = capexContext(8000)
    ctx.request.department_id = 'dept-without-head'
    ctx.requester.department_id = 'dept-without-head'
    await expect(instantiateWorkflow(capexDefinition, ctx, dir)).rejects.toThrow(/no head configured/)
  })
})

describe('sequential approval transitions', () => {
  it('advances through the chain and approves at the end', async () => {
    let { instance } = await instantiate(45000)

    const step1 = applyDecision(instance, 'dept-head', 'head@seacom.com', 'approved')
    instance = step1.instance
    expect(step1.events.map(e => e.type)).toEqual(['approval.recorded', 'stage.approved', 'stage.entered'])
    expect(currentStage(instance)?.id).toBe('chief')
    expect(instance.status).toBe('in_progress')

    const step2 = applyDecision(instance, 'chief', 'chief@seacom.com', 'approved')
    instance = step2.instance
    expect(instance.status).toBe('approved')
    expect(instance.current_stage_index).toBe(-1)
    expect(step2.events.at(-1)?.type).toBe('request.approved')
  })

  it('rejection terminates the request by default', async () => {
    const { instance } = await instantiate(45000)
    const { instance: next, events } = applyDecision(instance, 'dept-head', 'head@seacom.com', 'rejected', 'No budget')
    expect(next.status).toBe('rejected')
    expect(events.map(e => e.type)).toContain('request.rejected')
    expect(next.stages[0].approvers[0].comments).toBe('No budget')
  })

  it('return-for-info puts the request back with the requester', async () => {
    const { instance } = await instantiate(45000)
    const { instance: next, events } = applyDecision(instance, 'dept-head', 'head@seacom.com', 'returned', 'Need quotes')
    expect(next.status).toBe('returned')
    expect(events.at(-1)).toMatchObject({ type: 'request.returned', data: { comments: 'Need quotes' } })
  })
})

describe('idempotency & guards', () => {
  it('replaying an identical decision is a silent no-op', async () => {
    let { instance } = await instantiate(45000)
    instance = applyDecision(instance, 'dept-head', 'head@seacom.com', 'approved').instance

    const replay = applyDecision(instance, 'dept-head', 'head@seacom.com', 'approved')
    expect(replay.noop).toBe(true)
    expect(replay.events).toEqual([])
    expect(replay.instance).toBe(instance) // unchanged, same reference
  })

  it('replay is a no-op even after the request reached a terminal state', async () => {
    let { instance } = await instantiate(8000)
    instance = applyDecision(instance, 'dept-head', 'head@seacom.com', 'approved').instance
    expect(instance.status).toBe('approved')
    const replay = applyDecision(instance, 'dept-head', 'head@seacom.com', 'approved')
    expect(replay.noop).toBe(true)
  })

  it('a conflicting second decision by the same approver is an error', async () => {
    let { instance } = await instantiate(45000)
    instance = applyDecision(instance, 'dept-head', 'head@seacom.com', 'approved').instance
    expect(() => applyDecision(instance, 'dept-head', 'head@seacom.com', 'rejected')).toThrow(TransitionError)
  })

  it('rejects decisions from non-approvers', async () => {
    const { instance } = await instantiate(8000)
    expect(() => applyDecision(instance, 'dept-head', 'intruder@seacom.com', 'approved')).toThrow(/not an approver/)
  })

  it('rejects decisions on a stage that is not active', async () => {
    const { instance } = await instantiate(45000)
    expect(() => applyDecision(instance, 'chief', 'chief@seacom.com', 'approved')).toThrow(/not the active stage/)
  })

  it('rejects any new action on a terminal request', async () => {
    let { instance } = await instantiate(8000)
    instance = applyDecision(instance, 'dept-head', 'head@seacom.com', 'approved').instance
    expect(() => applyDecision(instance, 'dept-head', 'head@seacom.com', 'rejected')).toThrow(/no further actions/)
  })

  it('approver matching is case-insensitive', async () => {
    const { instance } = await instantiate(8000)
    const { instance: next } = applyDecision(instance, 'dept-head', 'HEAD@seacom.com', 'approved')
    expect(next.status).toBe('approved')
  })
})

describe('parallel approval', () => {
  const parallelDef = (rule: 'all' | 'any' | 'quorum:2'): WorkflowDefinition => ({
    id: 'exec-signoff',
    version: 1,
    name: 'Exec Sign-off',
    category: 'financial',
    request_type: 'capex',
    status: 'active',
    stages: [
      {
        id: 'exec',
        name: 'Executive Sign-off',
        type: 'parallel_approval',
        approvers: [
          { resolve_by: 'role', role: 'cfo' },
          { resolve_by: 'role', role: 'cto' },
          { resolve_by: 'role', role: 'head-cic' },
        ],
        approval_rule: rule,
      },
    ],
  })

  it("rule 'all' waits for every approver", async () => {
    let { instance } = await instantiateWorkflow(parallelDef('all'), capexContext(1), dir)
    instance = applyDecision(instance, 'exec', 'cfo@seacom.com', 'approved').instance
    expect(instance.status).toBe('in_progress')
    instance = applyDecision(instance, 'exec', 'cto@seacom.com', 'approved').instance
    expect(instance.status).toBe('in_progress')
    instance = applyDecision(instance, 'exec', 'head.cic@seacom.com', 'approved').instance
    expect(instance.status).toBe('approved')
  })

  it("rule 'any' advances on the first approval", async () => {
    let { instance } = await instantiateWorkflow(parallelDef('any'), capexContext(1), dir)
    instance = applyDecision(instance, 'exec', 'cto@seacom.com', 'approved').instance
    expect(instance.status).toBe('approved')
  })

  it("rule 'quorum:2' advances on the second approval", async () => {
    let { instance } = await instantiateWorkflow(parallelDef('quorum:2'), capexContext(1), dir)
    instance = applyDecision(instance, 'exec', 'cfo@seacom.com', 'approved').instance
    expect(instance.status).toBe('in_progress')
    instance = applyDecision(instance, 'exec', 'head.cic@seacom.com', 'approved').instance
    expect(instance.status).toBe('approved')
  })

  it("rule 'all': one rejection terminates even with notify_only unsatisfiable", async () => {
    const { instance } = await instantiateWorkflow(parallelDef('all'), capexContext(1), dir)
    const result = applyDecision(instance, 'exec', 'cfo@seacom.com', 'rejected')
    expect(result.instance.status).toBe('rejected')
  })

  it('notify_only rejection lets a satisfiable quorum continue', async () => {
    const def = parallelDef('quorum:2')
    def.stages[0].on_reject = 'notify_only'
    let { instance } = await instantiateWorkflow(def, capexContext(1), dir)
    instance = applyDecision(instance, 'exec', 'cfo@seacom.com', 'rejected', 'concerns').instance
    expect(instance.status).toBe('in_progress')
    instance = applyDecision(instance, 'exec', 'cto@seacom.com', 'approved').instance
    instance = applyDecision(instance, 'exec', 'head.cic@seacom.com', 'approved').instance
    expect(instance.status).toBe('approved')
  })

  it('deduplicates the same person resolved by multiple specs', async () => {
    const def = parallelDef('all')
    def.stages[0].approvers = [
      { resolve_by: 'role', role: 'cfo' },
      { resolve_by: 'named_user', user: 'cfo@seacom.com' },
    ]
    const { instance } = await instantiateWorkflow(def, capexContext(1), dir)
    expect(instance.stages[0].approvers).toHaveLength(1)
  })
})

describe('return_to_stage and fulfilment', () => {
  const accessDef: WorkflowDefinition = {
    id: 'system-access',
    version: 1,
    name: 'System Access Request',
    category: 'it-access',
    request_type: 'access-request',
    status: 'active',
    stages: [
      { id: 'manager', name: 'Manager Approval', type: 'approval', approver: { resolve_by: 'line_manager' } },
      {
        id: 'security',
        name: 'Security Review',
        type: 'approval',
        condition: "request.access_level == 'privileged'",
        approver: { resolve_by: 'group', group: 'security-team' },
        on_reject: 'return_to_stage:manager',
      },
      { id: 'grant', name: 'Grant Access', type: 'fulfilment', approver: { resolve_by: 'group', group: 'sysadmins' }, approval_rule: 'any' },
    ],
  }

  const accessCtx = (level: string) => ({
    request: { system: 'netbox', access_level: level },
    requester: { email: 'user@seacom.com', department_id: 'dept-1' },
  })

  it('return_to_stage resets the target stage and everything after it', async () => {
    let { instance } = await instantiateWorkflow(accessDef, accessCtx('privileged'), dir)
    instance = applyDecision(instance, 'manager', 'manager@seacom.com', 'approved').instance
    expect(currentStage(instance)?.id).toBe('security')

    const { instance: next, events } = applyDecision(instance, 'security', 'security@seacom.com', 'rejected', 'tighten scope')
    expect(next.status).toBe('in_progress')
    expect(currentStage(next)?.id).toBe('manager')
    expect(next.stages[0].approvers[0].decision).toBe('pending') // reset
    expect(events.some(e => e.type === 'stage.rejected' && e.data?.returned_to === 'manager')).toBe(true)
  })

  it('skips conditional stages and completes via fulfilment', async () => {
    let { instance } = await instantiateWorkflow(accessDef, accessCtx('standard'), dir)
    expect(instance.stages[1].status).toBe('skipped')

    instance = applyDecision(instance, 'manager', 'manager@seacom.com', 'approved').instance
    expect(instance.status).toBe('in_fulfilment')
    expect(currentStage(instance)?.id).toBe('grant')

    // group queue: first-to-action ('any' rule)
    const done = applyDecision(instance, 'grant', 'sysadmin2@seacom.com', 'approved')
    expect(done.instance.status).toBe('completed')
    expect(done.events.at(-1)?.type).toBe('request.completed')
  })

  it('expression resolver supports lookup()', async () => {
    const def: WorkflowDefinition = {
      ...accessDef,
      id: 'owner-routed',
      stages: [{
        id: 'owner',
        name: 'System Owner',
        type: 'approval',
        approver: { resolve_by: 'expression', expr: "lookup('system_owners', request.system)" },
      }],
    }
    const { instance } = await instantiateWorkflow(def, accessCtx('standard'), dir)
    expect(instance.stages[0].approvers[0].email).toBe('netbox.owner@seacom.com')
  })
})

describe('cancellation', () => {
  it('cancels an in-flight request', async () => {
    const { instance } = await instantiate(45000)
    expect(cancelRequest(instance).status).toBe('cancelled')
  })

  it('refuses to cancel a terminal request', async () => {
    let { instance } = await instantiate(8000)
    instance = applyDecision(instance, 'dept-head', 'head@seacom.com', 'approved').instance
    expect(() => cancelRequest(instance)).toThrow(TransitionError)
  })
})
