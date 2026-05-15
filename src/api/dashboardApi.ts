import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export interface DashboardStats {
  pendingApprovals: number
  urgentApprovals: number
  myRequests: {
    total: number
    approved: number
    pending: number
    rejected: number
    returned: number
  }
  budget: {
    total: number
    utilized: number
    remaining: number
    percentage: number
  }
  avgApprovalDays: number
}

export interface RecentActivity {
  id: string
  title: string
  requester_name: string
  amount: number
  currency: string
  created_at: string
  status: string
  priority: string
  days_pending: number
}

export interface QuickStats {
  totalRequests: number
  totalAmount: number
  approvedAmount: number
  pendingAmount: number
}

export const dashboardApi = {
  // Get dashboard statistics for current user
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    // Get user's role and department from profiles
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role, department, approver_level')
      .eq('id', userId)
      .single()

    // Get pending approvals where user is approver
    const { count: pendingApprovals } = await supabase
      .from('approvals')
      .select('*', { count: 'exact', head: true })
      .eq('approver_id', userId)
      .eq('status', 'pending')
      .eq('is_current', true)

    // Get urgent approvals (pending > 3 days)
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    
    const { count: urgentApprovals } = await supabase
      .from('approvals')
      .select('*', { count: 'exact', head: true })
      .eq('approver_id', userId)
      .eq('status', 'pending')
      .eq('is_current', true)
      .lt('created_at', threeDaysAgo.toISOString())

    // Get user's requests statistics
    const { data: userRequests } = await supabase
      .from('requests')
      .select('status')
      .eq('requester_id', userId)

    const myRequests = {
      total: userRequests?.length || 0,
      approved: userRequests?.filter(r => r.status === 'approved').length || 0,
      pending: userRequests?.filter(r => r.status === 'pending').length || 0,
      rejected: userRequests?.filter(r => r.status === 'rejected').length || 0,
      returned: userRequests?.filter(r => r.status === 'returned').length || 0
    }

    // Get budget statistics for user's department
    const currentYear = new Date().getFullYear()
    const { data: budgetData } = await supabase
      .from('budgets')
      .select('total_budget, utilized_budget')
      .eq('department', userProfile?.department)
      .eq('year', currentYear)
      .single()

    // Calculate average approval days
    const { data: completedApprovals } = await supabase
      .from('approvals')
      .select('created_at, updated_at')
      .eq('approver_id', userId)
      .neq('status', 'pending')
      .not('updated_at', 'is', null)

    let avgApprovalDays = 0
    if (completedApprovals && completedApprovals.length > 0) {
      const totalDays = completedApprovals.reduce((sum, approval) => {
        const created = new Date(approval.created_at)
        const resolved = new Date(approval.updated_at)
        const days = (resolved.getTime() - created.getTime()) / (1000 * 3600 * 24)
        return sum + days
      }, 0)
      avgApprovalDays = totalDays / completedApprovals.length
    }

    return {
      pendingApprovals: pendingApprovals || 0,
      urgentApprovals: urgentApprovals || 0,
      myRequests,
      budget: {
        total: budgetData?.total_budget || 0,
        utilized: budgetData?.utilized_budget || 0,
        remaining: (budgetData?.total_budget || 0) - (budgetData?.utilized_budget || 0),
        percentage: budgetData?.total_budget 
          ? (budgetData.utilized_budget / budgetData.total_budget) * 100 
          : 0
      },
      avgApprovalDays: parseFloat(avgApprovalDays.toFixed(1))
    }
  },

  // Get recent activity
  async getRecentActivity(userId: string, limit: number = 5): Promise<RecentActivity[]> {
    // Get requests where user is either requester or approver
    const { data: requestsAsRequester } = await supabase
      .from('requests')
      .select(`
        id,
        title,
        amount,
        currency,
        created_at,
        status,
        priority,
        requester:profiles!requests_requester_id_fkey(full_name)
      `)
      .eq('requester_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Get requests where user is approver
    const { data: requestsAsApprover } = await supabase
      .from('approvals')
      .select(`
        request:requests(
          id,
          title,
          amount,
          currency,
          created_at,
          status,
          priority,
          requester:profiles!requests_requester_id_fkey(full_name)
        )
      `)
      .eq('approver_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Combine and deduplicate
    const allRequests = [
      ...(requestsAsRequester || []).map(r => ({
        id: r.id,
        title: r.title,
        requester_name: r.requester?.full_name || 'Unknown',
        amount: r.amount,
        currency: r.currency,
        created_at: r.created_at,
        status: r.status,
        priority: r.priority,
        days_pending: Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000 * 3600 * 24))
      })),
      ...(requestsAsApprover || [])
        .filter(a => a.request)
        .map(a => ({
          id: a.request.id,
          title: a.request.title,
          requester_name: a.request.requester?.full_name || 'Unknown',
          amount: a.request.amount,
          currency: a.request.currency,
          created_at: a.request.created_at,
          status: a.request.status,
          priority: a.request.priority,
          days_pending: Math.floor((Date.now() - new Date(a.request.created_at).getTime()) / (1000 * 3600 * 24))
        }))
    ]

    // Remove duplicates by id and sort by date
    const unique = Array.from(new Map(allRequests.map(item => [item.id, item])).values())
    return unique.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, limit)
  },

  // Get quick stats for dashboard
  async getQuickStats(userId: string): Promise<QuickStats> {
    const { data: requests } = await supabase
      .from('requests')
      .select('amount, status')
      .eq('requester_id', userId)

    const totalRequests = requests?.length || 0
    const totalAmount = requests?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
    const approvedAmount = requests?.reduce((sum, r) => 
      r.status === 'approved' ? sum + (r.amount || 0) : sum, 0
    ) || 0
    const pendingAmount = requests?.reduce((sum, r) => 
      r.status === 'pending' ? sum + (r.amount || 0) : sum, 0
    ) || 0

    return {
      totalRequests,
      totalAmount,
      approvedAmount,
      pendingAmount
    }
  }
}
