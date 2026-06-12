-- ════════════════════════════════════════════════════════════════════
-- 004: RLS hardening for original CAPEX tables
-- Ensures every table used by the client has RLS enabled and has
-- appropriately scoped policies covering all write paths.
-- Safe to re-run (uses IF NOT EXISTS / DO NOTHING patterns).
-- ════════════════════════════════════════════════════════════════════

-- ── Helper: re-uses the admin check from migration 002 ───────────
-- public.is_platform_admin() already exists from 002.

-- ── profiles ─────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists profiles_select   on public.profiles;
drop policy if exists profiles_insert   on public.profiles;
drop policy if exists profiles_update   on public.profiles;

-- Users can read their own profile; admins can read all
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_platform_admin());

-- Users can create their own profile (new user on first login)
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

-- Users can update their own profile; admins can update any
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());

-- ── funding_requests ─────────────────────────────────────────────
alter table public.funding_requests enable row level security;

drop policy if exists funding_requests_select on public.funding_requests;
drop policy if exists funding_requests_insert on public.funding_requests;
drop policy if exists funding_requests_update on public.funding_requests;

-- Visible to the requester, anyone in the approval chain, and admins
create policy funding_requests_select on public.funding_requests
  for select to authenticated
  using (
    requester_email = (auth.jwt() ->> 'email')
    or current_approver_email = (auth.jwt() ->> 'email')
    or public.is_platform_admin()
    or exists (
      select 1 from public.approval_actions aa
      where aa.request_id = id
        and aa.approver_email = (auth.jwt() ->> 'email')
    )
  );

-- Only the authenticated user can create their own requests
create policy funding_requests_insert on public.funding_requests
  for insert to authenticated
  with check (requester_email = (auth.jwt() ->> 'email'));

-- Requester can update their own; current approver can advance the chain; admins can update any
create policy funding_requests_update on public.funding_requests
  for update to authenticated
  using (
    requester_email = (auth.jwt() ->> 'email')
    or current_approver_email = (auth.jwt() ->> 'email')
    or public.is_platform_admin()
  );

-- ── approval_actions ─────────────────────────────────────────────
alter table public.approval_actions enable row level security;

drop policy if exists approval_actions_select on public.approval_actions;
drop policy if exists approval_actions_insert on public.approval_actions;
drop policy if exists approval_actions_update on public.approval_actions;

create policy approval_actions_select on public.approval_actions
  for select to authenticated
  using (
    approver_email = (auth.jwt() ->> 'email')
    or public.is_platform_admin()
    or exists (
      select 1 from public.funding_requests fr
      where fr.id = request_id
        and fr.requester_email = (auth.jwt() ->> 'email')
    )
  );

create policy approval_actions_insert on public.approval_actions
  for insert to authenticated
  with check (approver_email = (auth.jwt() ->> 'email') or public.is_platform_admin());

create policy approval_actions_update on public.approval_actions
  for update to authenticated
  using (approver_email = (auth.jwt() ->> 'email') or public.is_platform_admin());

-- ── Configuration tables (read: authenticated; write: admin only) ─
do $$
declare t text;
begin
  foreach t in array array['doa_rules','departments','legal_entities','business_units','currencies','approval_matrix']
  loop
    begin
      execute format('alter table public.%I enable row level security', t);
    exception when undefined_table then
      -- table doesn't exist in this project variant — skip
    end;

    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('
      create policy %I on public.%I
        for select to authenticated using (true)',
      t || '_read', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format('
      create policy %I on public.%I
        for all to authenticated
        using (public.is_platform_admin())
        with check (public.is_platform_admin())',
      t || '_admin_write', t
    );
  end loop;
end $$;
