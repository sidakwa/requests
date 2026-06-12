// ── Platform API ───────────────────────────────────────────────────
// Glue between the pure workflow engine and Supabase: loads catalog
// configuration, persists request instances, appends the audit trail,
// and dispatches notification emails off engine events.

import { supabase } from '@/lib/supabase'
import { convertToUSD } from '@/lib/currency'
import {
  EngineEvent,
  EvalContext,
  RequestInstance,
  WorkflowDefinition,
  applyDecision,
  cancelRequest,
  currentStage,
  instantiateWorkflow,
  validateWorkflowDefinition,
} from '@/engine'
import { supabaseDirectory } from '@/engine/supabaseDirectory'
import { FieldOption, FormSchema, FormValues, pruneHiddenValues, validateForm } from '@/forms'

export interface CatalogItem {
  id: string
  slug: string
  name: string
  description: string | null
  category: string
  icon: string | null
  workflow_slug: string
  request_type: string
  launch_path: string | null
  status: string
  sort_order: number
}

export interface CatalogRequestRow {
  id: string
  request_number: string
  catalog_slug: string
  workflow_slug: string
  workflow_version: number
  workflow_snapshot: WorkflowDefinition
  instance: RequestInstance
  form_data: FormValues
  title: string
  requester_email: string
  status: string
  current_stage_id: string | null
  current_approver_emails: string[]
  participant_emails: string[]
  created_at: string
  updated_at: string
}

export interface RequestEventRow {
  id: number
  request_id: string
  event_type: string
  stage_id: string | null
  actor_email: string | null
  data: Record<string, unknown> | null
  created_at: string
}

// ── Catalog & configuration ────────────────────────────────────────

export async function fetchCatalog(): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from('catalog_items')
    .select('*')
    .eq('status', 'active')
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function fetchCatalogItem(slug: string): Promise<CatalogItem> {
  const { data, error } = await supabase
    .from('catalog_items')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

/** Latest active version of a workflow — submissions always pin the newest. */
export async function fetchWorkflowDefinition(slug: string): Promise<WorkflowDefinition> {
  const { data, error } = await supabase
    .from('workflow_definitions')
    .select('definition')
    .eq('slug', slug)
    .eq('status', 'active')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error(`No active workflow definition found for '${slug}'`)
  return validateWorkflowDefinition(data.definition)
}

export async function fetchFormSchema(requestType: string): Promise<FormSchema> {
  const { data, error } = await supabase
    .from('form_schemas')
    .select('schema')
    .eq('request_type', requestType)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error(`No form schema found for request type '${requestType}'`)
  return data.schema as FormSchema
}

/** Resolve options for a `source: "lookup:<table>"` form field. */
export async function fetchLookupOptions(source: string): Promise<FieldOption[]> {
  const table = source.replace(/^lookup:/, '')
  if (table === 'departments') {
    const { data } = await supabase.from('departments').select('id, name').order('name')
    return (data ?? []).map(d => ({ value: d.id, label: d.name }))
  }
  const { data } = await supabase
    .from('lookup_values')
    .select('key, label, value')
    .eq('table_slug', table)
  return (data ?? []).map(r => ({ value: r.key, label: r.label || r.value }))
}

// ── Submission ─────────────────────────────────────────────────────

function buildContext(formData: FormValues, requesterEmail: string): EvalContext {
  const request: Record<string, unknown> = { ...formData }
  // Money fields routed by USD thresholds: derive amount_usd when an
  // amount/currency pair is present (mirrors the CAPEX DoA gotcha — never
  // compare local-currency amounts against USD thresholds).
  if (typeof request.amount === 'number') {
    request.amount_usd = convertToUSD(request.amount, String(request.currency ?? 'USD'))
  }
  return {
    request,
    requester: { email: requesterEmail, department_id: formData.department_id },
  }
}

function instanceColumns(instance: RequestInstance) {
  const stage = currentStage(instance)
  const participants = new Set<string>()
  for (const s of instance.stages) for (const a of s.approvers) participants.add(a.email)
  return {
    instance,
    status: instance.status,
    current_stage_id: stage?.id ?? null,
    current_approver_emails: stage
      ? stage.approvers.filter(a => a.decision === 'pending').map(a => a.email)
      : [],
    participant_emails: [...participants],
  }
}

async function appendEvents(requestId: string, events: EngineEvent[], actorEmail?: string): Promise<void> {
  if (!events.length) return
  const rows = events.map(e => ({
    request_id: requestId,
    event_type: e.type,
    stage_id: e.stage_id ?? null,
    actor_email: e.actor_email ?? actorEmail ?? null,
    data: e.data ?? null,
  }))
  const { error } = await supabase.from('request_events').insert(rows)
  if (error) console.error('Failed to append audit events:', error.message)
}

export async function submitCatalogRequest(params: {
  item: CatalogItem
  schema: FormSchema
  formData: FormValues
  requesterEmail: string
}): Promise<CatalogRequestRow> {
  const { item, schema, requesterEmail } = params
  const formData = pruneHiddenValues(schema, params.formData)

  const errors = validateForm(schema, formData)
  if (errors.length) {
    throw new Error(errors.map(e => e.message).join('; '))
  }

  const definition = await fetchWorkflowDefinition(item.workflow_slug)
  const ctx = buildContext(formData, requesterEmail)
  const { instance, events } = await instantiateWorkflow(definition, ctx, supabaseDirectory)

  const title = String(formData.title ?? item.name)
  const { data: row, error } = await supabase
    .from('catalog_requests')
    .insert({
      catalog_slug: item.slug,
      workflow_slug: definition.id,
      workflow_version: definition.version,
      workflow_snapshot: definition,
      form_data: formData,
      title,
      requester_email: requesterEmail,
      ...instanceColumns(instance),
    })
    .select()
    .single()
  if (error) throw error

  await appendEvents(row.id, events, requesterEmail)
  notifyForEvents(row as CatalogRequestRow, events)
  return row as CatalogRequestRow
}

// ── Queues & detail ────────────────────────────────────────────────

export async function listMyCatalogRequests(email: string): Promise<CatalogRequestRow[]> {
  const { data, error } = await supabase
    .from('catalog_requests')
    .select('*')
    .ilike('requester_email', email)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CatalogRequestRow[]
}

export async function listMyQueue(email: string): Promise<CatalogRequestRow[]> {
  const { data, error } = await supabase
    .from('catalog_requests')
    .select('*')
    .contains('current_approver_emails', [email])
    .in('status', ['in_progress', 'in_fulfilment'])
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as CatalogRequestRow[]
}

export async function getCatalogRequest(id: string): Promise<{ request: CatalogRequestRow; events: RequestEventRow[] }> {
  const [{ data: request, error }, { data: events, error: eventsError }] = await Promise.all([
    supabase.from('catalog_requests').select('*').eq('id', id).single(),
    supabase.from('request_events').select('*').eq('request_id', id).order('id'),
  ])
  if (error) throw error
  if (eventsError) throw eventsError
  return { request: request as CatalogRequestRow, events: (events ?? []) as RequestEventRow[] }
}

// ── Decisions ──────────────────────────────────────────────────────

export async function decideCatalogRequest(params: {
  request: CatalogRequestRow
  decision: 'approved' | 'rejected' | 'returned'
  actorEmail: string
  comments?: string
}): Promise<CatalogRequestRow> {
  const { request, decision, actorEmail, comments } = params
  if (!request.current_stage_id) throw new Error('Request has no active stage')

  const result = applyDecision(request.instance, request.current_stage_id, actorEmail, decision, comments)
  if (result.noop) return request

  const { data: updated, error } = await supabase
    .from('catalog_requests')
    .update(instanceColumns(result.instance))
    .eq('id', request.id)
    .select()
    .single()
  if (error) throw error

  await appendEvents(request.id, result.events, actorEmail)
  notifyForEvents(updated as CatalogRequestRow, result.events, actorEmail)
  return updated as CatalogRequestRow
}

export async function cancelCatalogRequest(request: CatalogRequestRow): Promise<CatalogRequestRow> {
  const instance = cancelRequest(request.instance)
  const { data: updated, error } = await supabase
    .from('catalog_requests')
    .update(instanceColumns(instance))
    .eq('id', request.id)
    .select()
    .single()
  if (error) throw error
  await appendEvents(request.id, [{ type: 'request.completed', data: { cancelled: true } }], request.requester_email)
  return updated as CatalogRequestRow
}

// ── Notifications (email-first, fire-and-forget) ───────────────────
// Reuses the send-approval-email edge function. Email failure must never
// block a submission or a decision — same contract as the CAPEX flow.

function notifyForEvents(row: CatalogRequestRow, events: EngineEvent[], actorEmail?: string): void {
  const amount = typeof row.form_data.amount === 'number' ? row.form_data.amount : 0
  const currency = String(row.form_data.currency ?? 'USD')

  for (const event of events) {
    if (event.type === 'stage.entered') {
      const stage = row.instance.stages.find(s => s.id === event.stage_id)
      if (!stage) continue
      const stageNumber = row.instance.stages.filter(s => s.status !== 'skipped').findIndex(s => s.id === stage.id) + 1
      const totalSteps = row.instance.stages.filter(s => s.status !== 'skipped').length
      supabase.functions.invoke('send-approval-email', {
        body: {
          requestId: row.id,
          requestNumber: row.request_number,
          requestTitle: row.title,
          requestAmount: amount,
          requestCurrency: currency,
          requesterEmail: row.requester_email,
          description: String(row.form_data.justification ?? row.form_data.description ?? ''),
          doaLevel: stage.name,
          previousApprover: actorEmail ?? null,
          totalSteps,
          approvers: stage.approvers
            .filter(a => a.decision === 'pending')
            .map(a => ({ email: a.email, role: a.label, step: stageNumber })),
        },
      }).catch(() => {})
    }

    if (event.type === 'request.approved' || event.type === 'request.rejected' || event.type === 'request.returned') {
      supabase.functions.invoke('send-approval-email', {
        body: {
          notificationType: 'status_update',
          requestId: row.id,
          requestNumber: row.request_number,
          requestTitle: row.title,
          requestAmount: amount,
          requestCurrency: currency,
          requesterEmail: row.requester_email,
          newStatus: event.type.split('.')[1],
          approverName: actorEmail,
          comments: (event.data?.comments as string) ?? undefined,
        },
      }).catch(() => {})
    }
  }
}
