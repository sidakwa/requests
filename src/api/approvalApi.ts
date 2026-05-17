import { supabase } from '@/lib/supabase'

export const approvalApi = {
  async submitDecision(approvalId: string, decision: 'approved' | 'rejected' | 'returned', comments?: string) {
    // Start a transaction
    const { data: approval, error: fetchError } = await supabase
      .from('approval_actions')
      .select('*, funding_requests(*)')
      .eq('id', approvalId)
      .single()
    
    if (fetchError) throw fetchError
    
    // Update the approval action
    const { error: updateError } = await supabase
      .from('approval_actions')
      .update({ action: decision, comments })
      .eq('id', approvalId)
    
    if (updateError) throw updateError
    
    // Determine next steps based on decision
    if (decision === 'approved') {
      // Check if there are more pending approvals
      const { data: pendingApprovals } = await supabase
        .from('approval_actions')
        .select('id')
        .eq('request_id', approval.request_id)
        .eq('action', 'pending')
      
      if (!pendingApprovals || pendingApprovals.length === 0) {
        // All approvals complete
        await supabase
          .from('funding_requests')
          .update({ status: 'Approved', approved_at: new Date().toISOString() })
          .eq('id', approval.request_id)
      }
    } else if (decision === 'rejected') {
      await supabase
        .from('funding_requests')
        .update({ status: 'Rejected' })
        .eq('id', approval.request_id)
    } else if (decision === 'returned') {
      await supabase
        .from('funding_requests')
        .update({ status: 'Returned' })
        .eq('id', approval.request_id)
    }
    
    // Create audit log entry
    await supabase.from('audit_log').insert({
      request_id: approval.request_id,
      action: decision,
      user_id: approval.approver_email,
      timestamp: new Date().toISOString(),
      details: comments
    })
    
    return { success: true }
  }
}
