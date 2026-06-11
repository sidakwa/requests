import { supabase } from '@/lib/supabase'

export const approvalApi = {
  async submitDecision(approvalId: string, decision: 'approved' | 'rejected' | 'returned', actorId: string, comments?: string) {
    const { error } = await supabase.rpc('submit_approval_decision', {
      p_approval_id: approvalId,
      p_decision:    decision,
      p_actor_id:    actorId,
      p_comments:    comments ?? null,
    })
    if (error) throw error
    return { success: true }
  }
}
