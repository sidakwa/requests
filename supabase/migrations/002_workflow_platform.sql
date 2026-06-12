-- ════════════════════════════════════════════════════════════════════
-- 002: Workflow Platform Foundation
-- Turns the CAPEX portal into a request-catalog + workflow-engine platform.
-- Workflows, forms, and catalog entries are DATA — new request types are
-- added by inserting rows, never by deploying code.
-- See docs/workflow-definitions.md for the definition format.
-- ════════════════════════════════════════════════════════════════════

-- ── Admin helper ─────────────────────────────────────────────────────
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── Catalog & configuration tables ───────────────────────────────────

create table if not exists public.workflow_definitions (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null,
  version      integer not null,
  name         text not null,
  category     text not null,
  request_type text not null,
  status       text not null default 'draft' check (status in ('draft', 'active', 'deprecated')),
  definition   jsonb not null,
  created_at   timestamptz not null default now(),
  unique (slug, version)
);

create table if not exists public.form_schemas (
  id           uuid primary key default gen_random_uuid(),
  request_type text not null,
  version      integer not null,
  schema       jsonb not null,
  created_at   timestamptz not null default now(),
  unique (request_type, version)
);

create table if not exists public.catalog_items (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text,
  category      text not null,
  icon          text,                 -- lucide icon name for the catalog tile
  workflow_slug text not null,
  request_type  text not null,
  -- When set, the tile launches a dedicated page (e.g. the CAPEX wizard)
  -- instead of the generic dynamic form.
  launch_path   text,
  status        text not null default 'active' check (status in ('draft', 'active', 'retired')),
  sort_order    integer not null default 100,
  created_at    timestamptz not null default now()
);

-- ── Org structure for approver resolution ────────────────────────────

create table if not exists public.org_roles (
  id        uuid primary key default gen_random_uuid(),
  role_slug text not null,
  email     text not null,
  unique (role_slug, email)
);

create table if not exists public.org_groups (
  id         uuid primary key default gen_random_uuid(),
  group_slug text not null,
  email      text not null,
  unique (group_slug, email)
);

-- Backs the lookup('<table>', key) resolver expression and lookup-sourced
-- form fields.
create table if not exists public.lookup_values (
  id         uuid primary key default gen_random_uuid(),
  table_slug text not null,
  key        text not null,
  value      text not null,
  label      text,
  unique (table_slug, key)
);

-- Line-manager resolution source (Phase 1: maintained by admins / AD sync)
alter table public.profiles add column if not exists manager_email text;

-- ── Generic requests (every non-CAPEX catalog type lands here) ───────

create sequence if not exists public.catalog_request_seq;

create table if not exists public.catalog_requests (
  id                 uuid primary key default gen_random_uuid(),
  request_number     text not null unique
                     default ('REQ-' || to_char(now(), 'YYYY') || '-' ||
                              lpad(nextval('public.catalog_request_seq')::text, 4, '0')),
  catalog_slug       text not null references public.catalog_items(slug),
  workflow_slug      text not null,
  workflow_version   integer not null,
  -- Definition snapshot at submit time: in-flight requests never migrate.
  workflow_snapshot  jsonb not null,
  -- Engine RequestInstance (stages, approver states, cursor).
  instance           jsonb not null,
  form_data          jsonb not null default '{}'::jsonb,
  title              text not null,
  requester_email    text not null,
  status             text not null default 'in_progress'
                     check (status in ('in_progress','in_fulfilment','approved','rejected','returned','cancelled','completed')),
  current_stage_id   text,
  -- Denormalised for inbox queries + RLS: whose turn is it / who was involved.
  current_approver_emails text[] not null default '{}',
  participant_emails      text[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists catalog_requests_requester_idx on public.catalog_requests (requester_email);
create index if not exists catalog_requests_status_idx    on public.catalog_requests (status);
create index if not exists catalog_requests_current_approvers_idx on public.catalog_requests using gin (current_approver_emails);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists catalog_requests_touch on public.catalog_requests;
create trigger catalog_requests_touch
  before update on public.catalog_requests
  for each row execute function public.touch_updated_at();

-- ── Immutable audit trail ────────────────────────────────────────────
-- Insert-only: no UPDATE/DELETE policies exist and a trigger blocks both
-- even for the table owner running through PostgREST.

create table if not exists public.request_events (
  id          bigint generated always as identity primary key,
  request_id  uuid not null references public.catalog_requests(id),
  event_type  text not null,
  stage_id    text,
  actor_email text,
  data        jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists request_events_request_idx on public.request_events (request_id);

create or replace function public.forbid_event_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'request_events is an immutable audit log';
end;
$$;

drop trigger if exists request_events_immutable on public.request_events;
create trigger request_events_immutable
  before update or delete on public.request_events
  for each row execute function public.forbid_event_mutation();

-- ── Row Level Security ───────────────────────────────────────────────

alter table public.workflow_definitions enable row level security;
alter table public.form_schemas         enable row level security;
alter table public.catalog_items        enable row level security;
alter table public.org_roles            enable row level security;
alter table public.org_groups           enable row level security;
alter table public.lookup_values        enable row level security;
alter table public.catalog_requests     enable row level security;
alter table public.request_events       enable row level security;

-- Configuration: readable by everyone signed in, writable by admins only.
do $$
declare t text;
begin
  foreach t in array array['workflow_definitions','form_schemas','catalog_items','org_roles','org_groups','lookup_values']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin())', t || '_admin_write', t);
  end loop;
end $$;

-- Requests: visible to the requester, anyone in the approval chain, and admins.
drop policy if exists catalog_requests_select on public.catalog_requests;
create policy catalog_requests_select on public.catalog_requests
  for select to authenticated
  using (
    requester_email = (auth.jwt() ->> 'email')
    or (auth.jwt() ->> 'email') = any (participant_emails)
    or public.is_platform_admin()
  );

drop policy if exists catalog_requests_insert on public.catalog_requests;
create policy catalog_requests_insert on public.catalog_requests
  for insert to authenticated
  with check (requester_email = (auth.jwt() ->> 'email'));

-- Updates advance the engine state: only participants (current approvers act,
-- requester cancels/resubmits) and admins.
drop policy if exists catalog_requests_update on public.catalog_requests;
create policy catalog_requests_update on public.catalog_requests
  for update to authenticated
  using (
    requester_email = (auth.jwt() ->> 'email')
    or (auth.jwt() ->> 'email') = any (participant_emails)
    or public.is_platform_admin()
  );

drop policy if exists request_events_select on public.request_events;
create policy request_events_select on public.request_events
  for select to authenticated
  using (
    exists (
      select 1 from public.catalog_requests r
      where r.id = request_id
        and (r.requester_email = (auth.jwt() ->> 'email')
             or (auth.jwt() ->> 'email') = any (r.participant_emails)
             or public.is_platform_admin())
    )
  );

drop policy if exists request_events_insert on public.request_events;
create policy request_events_insert on public.request_events
  for insert to authenticated
  with check (
    exists (
      select 1 from public.catalog_requests r
      where r.id = request_id
        and (r.requester_email = (auth.jwt() ->> 'email')
             or (auth.jwt() ->> 'email') = any (r.participant_emails))
    )
  );

-- ════════════════════════════════════════════════════════════════════
-- SEEDS — the first three catalog entries
-- ════════════════════════════════════════════════════════════════════

-- Role/group assignments below marked PLACEHOLDER must be updated by an
-- admin to the real people/teams before relying on those stages.
insert into public.org_roles (role_slug, email) values
  ('head-cic',       'head.cic@seacom.com'),
  ('finance-review', 'finance@seacom.com'),
  ('cfo',            'cfo@seacom.com'),
  ('it-security',    'head.cic@seacom.com')   -- PLACEHOLDER: set to the real security reviewer
on conflict do nothing;

insert into public.org_groups (group_slug, email) values
  ('sysadmins',       'head.cic@seacom.com'),  -- PLACEHOLDER: real sysadmin queue members
  ('engineering-ops', 'head.cic@seacom.com')   -- PLACEHOLDER: real engineering fulfilment queue
on conflict do nothing;

-- ── 1. CAPEX (generalised from the previously hardcoded chain) ──────
-- Exact parity with buildApprovalChain(): USD thresholds 10k/50k/100k.
insert into public.workflow_definitions (slug, version, name, category, request_type, status, definition)
values ('capex-approval', 1, 'CAPEX Approval Workflow', 'financial', 'capex', 'active', '{
  "id": "capex-approval",
  "version": 1,
  "name": "CAPEX Approval Workflow",
  "category": "financial",
  "request_type": "capex",
  "status": "active",
  "sla_default_hours": 48,
  "stages": [
    { "id": "dept-head", "name": "Department Head", "type": "approval",
      "approver": { "resolve_by": "department_head" }, "sla_hours": 24 },
    { "id": "chief", "name": "Chief/Executive", "type": "approval",
      "condition": "request.amount_usd > 10000",
      "approver": { "resolve_by": "department_chief" } },
    { "id": "head-cic", "name": "Head of CIC", "type": "approval",
      "condition": "request.amount_usd > 50000",
      "approver": { "resolve_by": "role", "role": "head-cic", "label": "Head of CIC" } },
    { "id": "finance-review", "name": "Finance Review", "type": "approval",
      "condition": "request.amount_usd > 100000",
      "approver": { "resolve_by": "role", "role": "finance-review", "label": "Finance Review" } },
    { "id": "cfo", "name": "CFO/CEO", "type": "approval",
      "condition": "request.amount_usd > 100000",
      "approver": { "resolve_by": "role", "role": "cfo", "label": "CFO/CEO" } }
  ]
}'::jsonb)
on conflict (slug, version) do nothing;

insert into public.form_schemas (request_type, version, schema)
values ('capex', 1, '{
  "request_type": "capex",
  "version": 1,
  "fields": [
    { "id": "title", "label": "Request Title", "type": "text", "required": true },
    { "id": "department_id", "label": "Department", "type": "lookup", "source": "lookup:departments", "required": true },
    { "id": "amount", "label": "Amount", "type": "money", "required": true, "currency_field": "currency", "min": 0 },
    { "id": "currency", "label": "Currency", "type": "select", "required": true, "default": "USD",
      "options": [
        { "value": "USD", "label": "USD" }, { "value": "ZAR", "label": "ZAR" }, { "value": "EUR", "label": "EUR" },
        { "value": "GBP", "label": "GBP" }, { "value": "KES", "label": "KES" }, { "value": "MZN", "label": "MZN" },
        { "value": "TZS", "label": "TZS" }, { "value": "UGX", "label": "UGX" }
      ] },
    { "id": "justification", "label": "Business Justification", "type": "textarea", "required": true, "min_length": 50 }
  ]
}'::jsonb)
on conflict (request_type, version) do nothing;

insert into public.catalog_items (slug, name, description, category, icon, workflow_slug, request_type, launch_path, sort_order)
values ('capex', 'CAPEX / Funding Request', 'Capital expenditure approval with value-based DoA routing', 'financial', 'CircleDollarSign', 'capex-approval', 'capex', '/new-request', 10)
on conflict (slug) do nothing;

-- ── 2. IT System Access ──────────────────────────────────────────────
insert into public.workflow_definitions (slug, version, name, category, request_type, status, definition)
values ('system-access', 1, 'System Access Request', 'it-access', 'access-request', 'active', '{
  "id": "system-access",
  "version": 1,
  "name": "System Access Request",
  "category": "it-access",
  "request_type": "access-request",
  "status": "active",
  "sla_default_hours": 24,
  "stages": [
    { "id": "manager-approval", "name": "Manager Approval", "type": "approval",
      "approver": { "resolve_by": "department_head", "label": "Department Head" }, "sla_hours": 24 },
    { "id": "security-review", "name": "Security Review", "type": "approval",
      "condition": "request.access_level == ''privileged''",
      "approver": { "resolve_by": "role", "role": "it-security", "label": "IT Security" },
      "on_reject": "return_to_stage:manager-approval" },
    { "id": "grant-access", "name": "Grant Access", "type": "fulfilment",
      "approver": { "resolve_by": "group", "group": "sysadmins", "label": "Sysadmin Queue" } }
  ]
}'::jsonb)
on conflict (slug, version) do nothing;

insert into public.form_schemas (request_type, version, schema)
values ('access-request', 1, '{
  "request_type": "access-request",
  "version": 1,
  "fields": [
    { "id": "title", "label": "Request Summary", "type": "text", "required": true,
      "placeholder": "e.g. NetBox read-write access for new NOC engineer" },
    { "id": "department_id", "label": "Department", "type": "lookup", "source": "lookup:departments", "required": true,
      "help": "Used to route the approval to your department head" },
    { "id": "system", "label": "System / Application", "type": "select", "required": true,
      "options": [
        { "value": "ad", "label": "Active Directory" }, { "value": "vpn", "label": "VPN" },
        { "value": "jira", "label": "Jira" }, { "value": "netbox", "label": "NetBox" },
        { "value": "openstack", "label": "OpenStack" }, { "value": "jumpbox", "label": "Jumpboxes" },
        { "value": "other", "label": "Other (describe below)" }
      ] },
    { "id": "other_system", "label": "Other System", "type": "text",
      "condition": "request.system == ''other''", "required_if": "request.system == ''other''" },
    { "id": "access_level", "label": "Access Level", "type": "select", "required": true, "default": "standard",
      "options": [
        { "value": "standard", "label": "Standard user access" },
        { "value": "privileged", "label": "Privileged / root / admin access" }
      ],
      "help": "Privileged access adds a security review stage" },
    { "id": "for_user", "label": "Access For (if not yourself)", "type": "user_picker",
      "help": "Leave blank when requesting for yourself" },
    { "id": "time_bound", "label": "Time-bound access?", "type": "boolean", "default": false },
    { "id": "expiry_date", "label": "Access Expiry Date", "type": "date",
      "condition": "request.time_bound == true", "required_if": "request.time_bound == true",
      "help": "Access should be revoked after this date" },
    { "id": "justification", "label": "Business Justification", "type": "textarea", "required": true, "min_length": 30 }
  ]
}'::jsonb)
on conflict (request_type, version) do nothing;

insert into public.catalog_items (slug, name, description, category, icon, workflow_slug, request_type, sort_order)
values ('system-access', 'System / Application Access', 'Request access to AD, VPN, Jira, NetBox, OpenStack, jumpboxes and more', 'it-access', 'KeyRound', 'system-access', 'access-request', 20)
on conflict (slug) do nothing;

-- ── 3. Infrastructure Change ─────────────────────────────────────────
insert into public.workflow_definitions (slug, version, name, category, request_type, status, definition)
values ('infrastructure-change', 1, 'Infrastructure Change Request', 'infrastructure', 'infra-change', 'active', '{
  "id": "infrastructure-change",
  "version": 1,
  "name": "Infrastructure Change Request",
  "category": "infrastructure",
  "request_type": "infra-change",
  "status": "active",
  "sla_default_hours": 48,
  "stages": [
    { "id": "dept-head-approval", "name": "Department Head Approval", "type": "approval",
      "approver": { "resolve_by": "department_head" }, "sla_hours": 24 },
    { "id": "chief-approval", "name": "Production Change Sign-off", "type": "approval",
      "condition": "request.environment == ''production''",
      "approver": { "resolve_by": "department_chief", "label": "Chief (Production Sign-off)" } },
    { "id": "implement", "name": "Implementation", "type": "fulfilment",
      "approver": { "resolve_by": "group", "group": "engineering-ops", "label": "Engineering Ops Queue" } }
  ]
}'::jsonb)
on conflict (slug, version) do nothing;

insert into public.form_schemas (request_type, version, schema)
values ('infra-change', 1, '{
  "request_type": "infra-change",
  "version": 1,
  "fields": [
    { "id": "title", "label": "Change Summary", "type": "text", "required": true,
      "placeholder": "e.g. Open firewall 443/tcp from DMZ to billing API" },
    { "id": "department_id", "label": "Department", "type": "lookup", "source": "lookup:departments", "required": true },
    { "id": "change_type", "label": "Change Type", "type": "select", "required": true,
      "options": [
        { "value": "firewall-rule", "label": "Firewall rule" }, { "value": "dns-change", "label": "DNS change" },
        { "value": "routing-change", "label": "Routing change" }, { "value": "vm-provisioning", "label": "New server / VM" },
        { "value": "rack-space", "label": "Rack space / colocation / cross-connect" },
        { "value": "circuit", "label": "Circuit provisioning or modification" },
        { "value": "maintenance-window", "label": "Maintenance window" }
      ] },
    { "id": "environment", "label": "Environment", "type": "select", "required": true,
      "options": [
        { "value": "production", "label": "Production" },
        { "value": "lab", "label": "Lab / Staging" }
      ],
      "help": "Production changes require chief sign-off" },
    { "id": "description", "label": "Technical Description", "type": "textarea", "required": true, "min_length": 30 },
    { "id": "implementation_date", "label": "Requested Implementation Date", "type": "date", "required": true },
    { "id": "rollback_plan", "label": "Rollback Plan", "type": "textarea",
      "condition": "request.environment == ''production''",
      "required_if": "request.environment == ''production''" }
  ]
}'::jsonb)
on conflict (request_type, version) do nothing;

insert into public.catalog_items (slug, name, description, category, icon, workflow_slug, request_type, sort_order)
values ('infrastructure-change', 'Infrastructure Change', 'Firewall, DNS, routing, provisioning, rack space, circuits, maintenance windows', 'infrastructure', 'Network', 'infrastructure-change', 'infra-change', 30)
on conflict (slug) do nothing;
