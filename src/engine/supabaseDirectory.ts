// ── Supabase Directory ─────────────────────────────────────────────
// Phase-1 org-structure source for approver resolution: departments,
// profiles.manager_email, org_roles, org_groups, lookup_values.
// Swappable for AD/LDAP later — the engine only sees the Directory interface.

import { supabase } from '@/lib/supabase'
import { Directory } from './types'

export const supabaseDirectory: Directory = {
  async lineManagerOf(email) {
    if (!email) return null
    const { data } = await supabase
      .from('profiles')
      .select('manager_email')
      .ilike('email', email)
      .maybeSingle()
    return data?.manager_email || null
  },

  async departmentHead(departmentId) {
    if (!departmentId) return null
    const { data } = await supabase
      .from('departments')
      .select('head_email')
      .eq('id', departmentId)
      .maybeSingle()
    return data?.head_email || null
  },

  async departmentChief(departmentId) {
    if (!departmentId) return null
    const { data } = await supabase
      .from('departments')
      .select('chief_email')
      .eq('id', departmentId)
      .maybeSingle()
    return data?.chief_email || null
  },

  async roleHolders(role) {
    const { data } = await supabase
      .from('org_roles')
      .select('email')
      .eq('role_slug', role)
    return (data ?? []).map(r => r.email)
  },

  async groupMembers(group) {
    const { data } = await supabase
      .from('org_groups')
      .select('email')
      .eq('group_slug', group)
    return (data ?? []).map(r => r.email)
  },

  async lookup(table, key) {
    const { data } = await supabase
      .from('lookup_values')
      .select('value')
      .eq('table_slug', table)
      .eq('key', key)
      .maybeSingle()
    return data?.value || null
  },
}
