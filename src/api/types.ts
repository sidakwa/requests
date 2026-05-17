// ── Dashboard Stats ───────────────────────────────────────────────
export interface DashboardStats {
  pendingApprovals: number
  urgentApprovals: number
  myRequests: {
    total: number
    approved: number
    pending: number
    rejected: number
  }
  budget: {
    utilized: number
    remaining: number
    percentage: number
  }
  avgApprovalDays: number
}

// ── Quick Stats ───────────────────────────────────────────────────
export interface QuickStats {
  totalRequests: number
  totalAmount: number
  approvedAmount: number
  pendingAmount: number
}

// ── Recent Activity ───────────────────────────────────────────────
export interface RecentActivity {
  id: string
  title: string
  requester_name: string
  amount: number
  currency: string
  created_at: string
  status: 'pending' | 'approved' | 'rejected' | 'returned'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  days_pending: number
}
