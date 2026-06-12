// ── Approver Resolution ────────────────────────────────────────────
// Turns an ApproverSpec into concrete approver emails at stage-entry time,
// via the injected Directory (org structure source). Resolution honours
// delegation by the Directory implementation, not here.

import { ApproverSpec, Directory, EvalContext } from './types'
import { evaluateExpression } from './conditions'

export class ResolutionError extends Error {
  constructor(public spec: ApproverSpec, message: string) {
    super(message)
  }
}

const DEFAULT_LABELS: Record<ApproverSpec['resolve_by'], string> = {
  line_manager: 'Line Manager',
  department_head: 'Department Head',
  department_chief: 'Chief/Executive',
  role: 'Role Approver',
  named_user: 'Approver',
  group: 'Group Queue',
  expression: 'Approver',
}

export interface ResolvedApprover {
  email: string
  label: string
}

// `lookup('<table>', <expr>)` is the one supported expression function —
// the key expression is evaluated locally, the lookup goes to the Directory.
const LOOKUP_RE = /^lookup\(\s*'([^']+)'\s*,\s*(.+)\)\s*$/

export async function resolveApprover(
  spec: ApproverSpec,
  ctx: EvalContext,
  directory: Directory
): Promise<ResolvedApprover[]> {
  const label = spec.label || (spec.resolve_by === 'role' && spec.role ? spec.role : DEFAULT_LABELS[spec.resolve_by])

  const fail = (msg: string): never => { throw new ResolutionError(spec, msg) }

  switch (spec.resolve_by) {
    case 'named_user': {
      if (!spec.user) fail('named_user resolver requires "user"')
      return [{ email: spec.user!, label }]
    }
    case 'line_manager': {
      const email = await directory.lineManagerOf(String(ctx.requester.email ?? ''))
      if (!email) fail(`No line manager found for ${ctx.requester.email}`)
      return [{ email: email!, label }]
    }
    case 'department_head': {
      const deptId = String(ctx.request.department_id ?? ctx.requester.department_id ?? '')
      const email = await directory.departmentHead(deptId)
      if (!email) fail('This department has no head configured. Please contact an admin.')
      return [{ email: email!, label }]
    }
    case 'department_chief': {
      const deptId = String(ctx.request.department_id ?? ctx.requester.department_id ?? '')
      const email = await directory.departmentChief(deptId)
      if (!email) fail('This department has no chief configured. Please contact an admin.')
      return [{ email: email!, label }]
    }
    case 'role': {
      if (!spec.role) fail('role resolver requires "role"')
      const emails = await directory.roleHolders(spec.role!)
      if (!emails.length) fail(`No users hold role '${spec.role}'`)
      return emails.map(email => ({ email, label }))
    }
    case 'group': {
      if (!spec.group) fail('group resolver requires "group"')
      const emails = await directory.groupMembers(spec.group!)
      if (!emails.length) fail(`Group '${spec.group}' has no members`)
      return emails.map(email => ({ email, label }))
    }
    case 'expression': {
      if (!spec.expr) fail('expression resolver requires "expr"')
      const lookupMatch = LOOKUP_RE.exec(spec.expr!.trim())
      if (lookupMatch) {
        const key = evaluateExpression(lookupMatch[2], ctx)
        const email = await directory.lookup(lookupMatch[1], String(key ?? ''))
        if (!email) fail(`lookup('${lookupMatch[1]}', '${key}') resolved to no one`)
        return [{ email: email!, label }]
      }
      const value = evaluateExpression(spec.expr!, ctx)
      if (typeof value !== 'string' || !value.includes('@')) {
        fail(`Expression '${spec.expr}' did not resolve to an email (got ${JSON.stringify(value)})`)
      }
      return [{ email: value as string, label }]
    }
    default:
      return fail(`Unknown resolve_by '${(spec as ApproverSpec).resolve_by}'`)
  }
}
