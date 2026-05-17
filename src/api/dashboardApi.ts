import { supabase } from '@/lib/supabase'

export const dashboardApi = {
  async getDashboardData(userId: string, userRole: string) {
    let query = supabase
      .from('funding_requests')
      .select(`
        *,
        legal_entity:legal_entities(name, code),
        department:departments(name)
      `)
      .order('created_at', { ascending: false })
    
    // Apply RLS-based filtering
    if (userRole === 'submitter') {
      query = query.eq('requester_email', userId)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  }
}
