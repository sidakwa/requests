# Workflow Definition Format

This is the contract the workflow engine (`src/engine/`) consumes. Workflows,
forms, and catalog entries are **data** stored in Supabase — adding a new
request type is three `INSERT`s, never a code deployment.

## How a request type is wired together

| Table | What it holds | Key columns |
|---|---|---|
| `catalog_items` | The tile in the Request Catalog | `slug`, `workflow_slug`, `request_type`, optional `launch_path` |
| `workflow_definitions` | Versioned workflow JSON | `slug`, `version`, `status`, `definition` |
| `form_schemas` | Versioned form JSON | `request_type`, `version`, `schema` |

A catalog item points at a workflow by `workflow_slug` and at a form by
`request_type`. The engine always loads the **highest active version**. If
`launch_path` is set, the tile opens a dedicated page instead of the generic
dynamic form (this is how CAPEX keeps its custom wizard).

Submitted requests live in `catalog_requests`. The full definition is
snapshotted onto the row (`workflow_snapshot`) at submit time — **in-flight
requests never migrate** when you publish a new version. Every transition is
appended to `request_events`, which is an insert-only audit log (a trigger
blocks UPDATE/DELETE).

## Workflow definition JSON

```json
{
  "id": "system-access",
  "version": 1,
  "name": "System Access Request",
  "category": "it-access",
  "request_type": "access-request",
  "status": "active",
  "sla_default_hours": 24,
  "stages": [
    { "id": "manager-approval", "name": "Manager Approval", "type": "approval",
      "approver": { "resolve_by": "department_head" }, "sla_hours": 24 },
    { "id": "security-review", "name": "Security Review", "type": "approval",
      "condition": "request.access_level == 'privileged'",
      "approver": { "resolve_by": "role", "role": "it-security" },
      "on_reject": "return_to_stage:manager-approval" },
    { "id": "grant-access", "name": "Grant Access", "type": "fulfilment",
      "approver": { "resolve_by": "group", "group": "sysadmins" } }
  ]
}
```

### Top-level fields

- `id` — kebab-case slug, must equal `workflow_definitions.slug`
- `version` — positive integer; bump it (new row) for any change, never edit a version with in-flight requests
- `status` — `draft` | `active` | `deprecated`; only `active` can be instantiated
- `request_type` — links to the form schema
- `sla_default_hours` — fallback SLA for stages without their own

### Stages

- `type`:
  - `approval` — one resolver; the resolved person approves/rejects/returns
  - `parallel_approval` — list of `approvers`, governed by `approval_rule`
  - `fulfilment` — execution stage (e.g. sysadmins granting access); completing it ends the request as `completed`. Group-resolved stages are shared queues: **first member to action wins** (`approval_rule` defaults to `any` for groups, `all` otherwise)
  - `info_gathering` — reserved; behaves like `approval` today
- `condition` — boolean expression; when false the stage is **skipped** and a
  `stage.skipped` event is written to the audit trail. This is how value-based
  routing works (see the CAPEX definition: stages gated on `request.amount_usd`)
- `approval_rule` — `all` | `any` | `quorum:N` (parallel and group stages)
- `on_reject` — `terminate` (default) | `notify_only` (rejection recorded;
  request continues if the rule is still satisfiable) | `return_to_stage:<id>`
  (that stage and everything after it is reset and re-entered)
- `sla_hours`, `reminders_hours`, `escalation` — stored and validated; reminder /
  escalation dispatch is the next phase (needs a scheduled job)

### Approver resolution (`resolve_by`)

| `resolve_by` | Extra field | Resolves to |
|---|---|---|
| `department_head` | — | `departments.head_email` for `request.department_id` |
| `department_chief` | — | `departments.chief_email` for `request.department_id` |
| `line_manager` | — | `profiles.manager_email` of the requester |
| `role` | `role` | every email in `org_roles` with that `role_slug` |
| `named_user` | `user` | that email |
| `group` | `group` | every email in `org_groups` with that `group_slug` (shared queue) |
| `expression` | `expr` | e.g. `lookup('system_owners', request.system)` against `lookup_values`, or any expression yielding an email |

Resolution happens at submit time and fails loudly (the user is told exactly
what is unconfigured, e.g. "Group 'sysadmins' has no members"). **The seed
data assigns placeholder members to `it-security`, `sysadmins`, and
`engineering-ops` — update `org_roles` / `org_groups` before piloting.**

### Condition expression language

Evaluated by `src/engine/conditions.ts` (a real parser — definitions can never
execute code). Available on both workflow stages and form fields.

- Context: `request.<field>` (form values; `amount_usd` is auto-derived from
  `amount` + `currency`), `requester.email`, `requester.department_id`
- Operators: `==` `!=` `>` `>=` `<` `<=`, `and` `or` `not`, `in` / `not in`,
  parentheses, lists `['a', 'b']`, literals (numbers, `'strings'`, `true/false/null`)
- Missing fields are falsy, never errors

## Form schema JSON

```json
{
  "request_type": "access-request",
  "version": 1,
  "fields": [
    { "id": "title", "label": "Request Summary", "type": "text", "required": true },
    { "id": "department_id", "label": "Department", "type": "lookup",
      "source": "lookup:departments", "required": true },
    { "id": "access_level", "label": "Access Level", "type": "select",
      "options": [ { "value": "standard", "label": "Standard" },
                    { "value": "privileged", "label": "Privileged" } ] },
    { "id": "expiry_date", "label": "Expiry", "type": "date",
      "condition": "request.time_bound == true",
      "required_if": "request.time_bound == true" }
  ]
}
```

- Field types: `text`, `textarea`, `number`, `money`, `date`, `select`,
  `multiselect`, `boolean`, `user_picker`, `lookup`
- `condition` hides a field (hidden fields are neither validated nor persisted);
  `required_if` makes it conditionally mandatory
- `source: "lookup:departments"` is special-cased to the departments table;
  any other `lookup:<slug>` reads `lookup_values` rows for that `table_slug`
- Validation knobs: `min`/`max` (numbers), `min_length`/`max_length` (text),
  static `options` membership
- Include a `department_id` field whenever the workflow uses
  `department_head` / `department_chief` resolution

## Adding a new request type (checklist)

1. Insert the form schema into `form_schemas` (`request_type`, `version: 1`)
2. Insert the workflow JSON into `workflow_definitions` (`status: 'active'`);
   it is validated by `validateWorkflowDefinition` on load — test locally with
   the engine test fixtures if unsure
3. Populate any `org_roles` / `org_groups` / `lookup_values` the workflow references
4. Insert the `catalog_items` row — the tile appears in the catalog immediately

## Engine guarantees (tested in `src/engine/__tests__/`)

- Version pinning: requests snapshot the definition; publishing v2 never touches in-flight v1 requests
- Idempotent transitions: replaying the same decision (duplicate email-link clicks) is a silent no-op
- Skipped stages are recorded in the audit trail, not silently dropped
- Terminal states (`approved`, `rejected`, `cancelled`, `completed`) accept no transitions
- Every transition emits events that are persisted to `request_events` and drive emails
