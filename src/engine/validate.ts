// ── Workflow Definition Validation ─────────────────────────────────
// Definitions are admin-authored data; validate them on save (admin UI)
// and defensively on load before instantiation.

import { z } from 'zod'
import { WorkflowDefinition } from './types'
import { evaluateCondition } from './conditions'

const slug = z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/, 'must be a kebab-case slug')

const approverSpecSchema = z.object({
  resolve_by: z.enum(['line_manager', 'department_head', 'department_chief', 'role', 'named_user', 'group', 'expression']),
  role: z.string().min(1).optional(),
  user: z.string().email().optional(),
  group: z.string().min(1).optional(),
  expr: z.string().min(1).optional(),
  label: z.string().optional(),
}).superRefine((spec, ctx) => {
  const required: Record<string, keyof typeof spec> = {
    role: 'role', named_user: 'user', group: 'group', expression: 'expr',
  }
  const field = required[spec.resolve_by]
  if (field && !spec[field]) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `resolve_by '${spec.resolve_by}' requires '${field}'` })
  }
})

const approvalRule = z.union([
  z.literal('all'),
  z.literal('any'),
  z.string().regex(/^quorum:[1-9][0-9]*$/),
])

const onReject = z.union([
  z.literal('terminate'),
  z.literal('notify_only'),
  z.string().regex(/^return_to_stage:[a-z0-9][a-z0-9-]*$/),
])

const stageSchema = z.object({
  id: slug,
  name: z.string().min(1),
  type: z.enum(['approval', 'parallel_approval', 'fulfilment', 'info_gathering']),
  condition: z.string().optional(),
  approver: approverSpecSchema.optional(),
  approvers: z.array(approverSpecSchema).optional(),
  approval_rule: approvalRule.optional(),
  sla_hours: z.number().positive().optional(),
  reminders_hours: z.array(z.number().positive()).optional(),
  escalation: z.object({ after_hours: z.number().positive(), to: approverSpecSchema }).optional(),
  actions_allowed: z.array(z.enum(['approve', 'reject', 'return_for_info', 'delegate'])).optional(),
  on_reject: onReject.optional(),
}).superRefine((stage, ctx) => {
  if (stage.type === 'parallel_approval') {
    if (!stage.approvers?.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `parallel_approval stage '${stage.id}' requires 'approvers'` })
    }
  } else if (!stage.approver) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `stage '${stage.id}' requires 'approver'` })
  }
  if (stage.condition) {
    try {
      evaluateCondition(stage.condition, { request: {}, requester: {} })
    } catch (err) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `stage '${stage.id}' condition does not parse: ${(err as Error).message}` })
    }
  }
})

export const workflowDefinitionSchema = z.object({
  id: slug,
  version: z.number().int().positive(),
  name: z.string().min(1),
  category: slug,
  request_type: slug,
  status: z.enum(['draft', 'active', 'deprecated']),
  sla_default_hours: z.number().positive().optional(),
  stages: z.array(stageSchema).min(1),
  on_complete: z.array(z.object({
    action: z.string().min(1),
    target: z.string().optional(),
    after_days: z.number().positive().optional(),
    condition: z.string().optional(),
  })).optional(),
}).superRefine((def, ctx) => {
  const ids = new Set<string>()
  for (const stage of def.stages) {
    if (ids.has(stage.id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate stage id '${stage.id}'` })
    }
    ids.add(stage.id)
  }
  for (const stage of def.stages) {
    if (stage.on_reject?.startsWith('return_to_stage:')) {
      const target = stage.on_reject.slice('return_to_stage:'.length)
      if (!ids.has(target)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `stage '${stage.id}' on_reject targets unknown stage '${target}'` })
      }
    }
  }
})

export function validateWorkflowDefinition(input: unknown): WorkflowDefinition {
  return workflowDefinitionSchema.parse(input) as WorkflowDefinition
}
