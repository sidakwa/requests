import { Directory, EvalContext, WorkflowDefinition } from '../types'

/** In-memory Directory mirroring SEACOM's org data shape. */
export function fakeDirectory(overrides?: Partial<Directory>): Directory {
  return {
    lineManagerOf: async (email) => (email === 'orphan@seacom.com' ? null : 'manager@seacom.com'),
    departmentHead: async (deptId) => (deptId === 'dept-1' ? 'head@seacom.com' : null),
    departmentChief: async (deptId) => (deptId === 'dept-1' ? 'chief@seacom.com' : null),
    roleHolders: async (role) => {
      const roles: Record<string, string[]> = {
        'head-cic': ['head.cic@seacom.com'],
        'finance-review': ['finance@seacom.com'],
        cfo: ['cfo@seacom.com'],
        cto: ['cto@seacom.com'],
        'it-manager': ['it.manager@seacom.com'],
      }
      return roles[role] ?? []
    },
    groupMembers: async (group) => {
      const groups: Record<string, string[]> = {
        sysadmins: ['sysadmin1@seacom.com', 'sysadmin2@seacom.com'],
        'security-team': ['security@seacom.com'],
      }
      return groups[group] ?? []
    },
    lookup: async (table, key) => {
      if (table === 'system_owners' && key === 'netbox') return 'netbox.owner@seacom.com'
      return null
    },
    ...overrides,
  }
}

/** The generalised CAPEX chain — value-based conditional stages replacing buildApprovalChain(). */
export const capexDefinition: WorkflowDefinition = {
  id: 'capex-approval',
  version: 1,
  name: 'CAPEX Approval Workflow',
  category: 'financial',
  request_type: 'capex',
  status: 'active',
  sla_default_hours: 48,
  stages: [
    {
      id: 'dept-head',
      name: 'Department Head',
      type: 'approval',
      approver: { resolve_by: 'department_head' },
      sla_hours: 24,
    },
    {
      id: 'chief',
      name: 'Chief/Executive',
      type: 'approval',
      condition: 'request.amount_usd > 10000',
      approver: { resolve_by: 'department_chief' },
    },
    {
      id: 'head-cic',
      name: 'Head of CIC',
      type: 'approval',
      condition: 'request.amount_usd > 50000',
      approver: { resolve_by: 'role', role: 'head-cic', label: 'Head of CIC' },
    },
    {
      id: 'finance-review',
      name: 'Finance Review',
      type: 'approval',
      condition: 'request.amount_usd > 100000',
      approver: { resolve_by: 'role', role: 'finance-review', label: 'Finance Review' },
    },
    {
      id: 'cfo',
      name: 'CFO/CEO',
      type: 'approval',
      condition: 'request.amount_usd > 100000',
      approver: { resolve_by: 'role', role: 'cfo', label: 'CFO/CEO' },
    },
  ],
}

export function capexContext(amountUsd: number): EvalContext {
  return {
    request: { amount_usd: amountUsd, currency: 'USD', department_id: 'dept-1' },
    requester: { email: 'requester@seacom.com', department_id: 'dept-1' },
  }
}
