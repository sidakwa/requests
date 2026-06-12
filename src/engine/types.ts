// ── Workflow Definition Schema ─────────────────────────────────────
// The data contract the engine consumes. Definitions are stored as JSON
// in `workflow_definitions.definition` and versioned: in-flight requests
// snapshot the definition at submit time and never migrate mid-flow.
// See docs/workflow-definitions.md for the authoring guide.

export type StageType =
  | 'approval'
  | 'parallel_approval'
  | 'fulfilment'
  | 'info_gathering'

export type ResolveBy =
  | 'line_manager'
  | 'department_head'
  | 'department_chief'
  | 'role'
  | 'named_user'
  | 'group'
  | 'expression'

export interface ApproverSpec {
  resolve_by: ResolveBy
  /** for resolve_by: role */
  role?: string
  /** for resolve_by: named_user */
  user?: string
  /** for resolve_by: group */
  group?: string
  /** for resolve_by: expression — evaluated against the request context */
  expr?: string
  /** display label shown in chains/emails; defaults per resolver type */
  label?: string
}

/** all = everyone must approve; any = first approval advances; quorum:N = N approvals advance */
export type ApprovalRule = 'all' | 'any' | `quorum:${number}`

export type OnReject = 'terminate' | 'notify_only' | `return_to_stage:${string}`

export interface EscalationSpec {
  after_hours: number
  to: ApproverSpec
}

export interface StageDefinition {
  id: string
  name: string
  type: StageType
  /** boolean expression over the request context; false ⇒ stage skipped */
  condition?: string
  /** single-approver stages (approval / fulfilment / info_gathering) */
  approver?: ApproverSpec
  /** parallel_approval stages */
  approvers?: ApproverSpec[]
  approval_rule?: ApprovalRule
  sla_hours?: number
  reminders_hours?: number[]
  escalation?: EscalationSpec
  actions_allowed?: Array<'approve' | 'reject' | 'return_for_info' | 'delegate'>
  on_reject?: OnReject
}

export interface CompletionAction {
  action: string
  target?: string
  after_days?: number
  condition?: string
}

export interface WorkflowDefinition {
  id: string // unique slug
  version: number
  name: string
  category: string
  request_type: string // links to a form schema
  status: 'draft' | 'active' | 'deprecated'
  sla_default_hours?: number
  stages: StageDefinition[]
  on_complete?: CompletionAction[]
}

// ── Runtime Model ──────────────────────────────────────────────────
// What the engine produces at instantiation and mutates on decisions.
// Persisted as JSON on the request row (`workflow_snapshot` + `stage_state`).

export type RequestStatus =
  | 'in_progress'
  | 'in_fulfilment'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'cancelled'
  | 'completed'

export type StageStatus = 'pending' | 'active' | 'approved' | 'rejected' | 'skipped'

export type Decision = 'approved' | 'rejected' | 'returned'

export interface ApproverState {
  email: string
  label: string
  decision: 'pending' | Decision
  acted_at?: string
  comments?: string
}

export interface RuntimeStage {
  id: string
  name: string
  type: StageType
  status: StageStatus
  approval_rule: ApprovalRule
  approvers: ApproverState[]
  sla_hours?: number
  on_reject: OnReject
  entered_at?: string
  completed_at?: string
}

export interface RequestInstance {
  workflow_slug: string
  workflow_version: number
  status: RequestStatus
  stages: RuntimeStage[]
  /** index into stages of the active stage; -1 when terminal */
  current_stage_index: number
}

// ── Events ─────────────────────────────────────────────────────────
// Every transition emits events consumed by the notification engine
// and persisted to the immutable audit log (request_events).

export type EngineEventType =
  | 'request.submitted'
  | 'stage.entered'
  | 'stage.skipped'
  | 'stage.approved'
  | 'stage.rejected'
  | 'approval.recorded'
  | 'request.approved'
  | 'request.rejected'
  | 'request.returned'
  | 'request.completed'

export interface EngineEvent {
  type: EngineEventType
  stage_id?: string
  actor_email?: string
  data?: Record<string, unknown>
}

// ── Evaluation Context ─────────────────────────────────────────────
// Conditions and expression resolvers are evaluated against this shape:
//   request.<field>   → submitted form values (+ computed fields like amount_usd)
//   requester.<field> → email, department_id, business_unit, …

export interface EvalContext {
  request: Record<string, unknown>
  requester: Record<string, unknown>
}

// ── Directory ──────────────────────────────────────────────────────
// Org-structure lookups injected into the engine so approver resolution
// is testable and source-agnostic (Supabase today, AD/LDAP later).

export interface Directory {
  lineManagerOf(email: string): Promise<string | null>
  departmentHead(departmentId: string): Promise<string | null>
  departmentChief(departmentId: string): Promise<string | null>
  roleHolders(role: string): Promise<string[]>
  groupMembers(group: string): Promise<string[]>
  /** backs the lookup('<table>', key) expression function */
  lookup(table: string, key: string): Promise<string | null>
}
