-- ════════════════════════════════════════════════════════════════════
-- 005: Fix circular RLS policies on funding_requests ↔ approval_actions
--
-- Migration 004 created two SELECT policies that subquery each other:
--   • funding_requests_select  → exists(select from approval_actions…)
--   • approval_actions_select  → exists(select from funding_requests…)
-- PostgreSQL detects the cycle and throws error 42P17 ("infinite
-- recursion detected in policy") on every SELECT from either table.
--
-- Fix: introduce a SECURITY DEFINER helper that queries approval_actions
-- directly (bypassing its own RLS), then call it from the
-- funding_requests policy.  Remove the reverse cross-reference from
-- approval_actions_select — requesters read the approval chain from
-- funding_requests.approval_chain (JSONB), not from this table.
-- ════════════════════════════════════════════════════════════════════

-- ── Helper: did the calling JWT user ever act on a given request? ──
-- SECURITY DEFINER + fixed search_path: safe, cannot be hijacked.
create or replace function public.user_acted_on_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.approval_actions
    where request_id = p_request_id
      and approver_email = (auth.jwt() ->> 'email')
  );
$$;

-- ── funding_requests SELECT policy ────────────────────────────────
-- Uses the helper instead of an inline subquery → no cycle.
drop policy if exists funding_requests_select on public.funding_requests;
create policy funding_requests_select on public.funding_requests
  for select to authenticated
  using (
    requester_email       = (auth.jwt() ->> 'email')
    or current_approver_email = (auth.jwt() ->> 'email')
    or public.is_platform_admin()
    or public.user_acted_on_request(id)
  );

-- ── approval_actions SELECT policy ────────────────────────────────
-- Cross-reference to funding_requests removed; approvers see their
-- own rows, admins see all.
drop policy if exists approval_actions_select on public.approval_actions;
create policy approval_actions_select on public.approval_actions
  for select to authenticated
  using (
    approver_email = (auth.jwt() ->> 'email')
    or public.is_platform_admin()
  );
