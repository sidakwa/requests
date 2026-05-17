import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock, FileText, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import type { DashboardStats } from '@/api/types'

interface StatsCardsProps {
  stats: DashboardStats | null
  loading: boolean
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Pending Approvals
          </CardTitle>
          <Clock className="w-4 h-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
          {stats.urgentApprovals > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                {stats.urgentApprovals} urgent
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            My Requests
          </CardTitle>
          <FileText className="w-4 h-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.myRequests.total}</div>
          <div className="flex flex-wrap gap-2 mt-1 text-xs">
            <span className="text-green-600">{stats.myRequests.approved} approved</span>
            <span className="text-yellow-600">{stats.myRequests.pending} pending</span>
            <span className="text-red-600">{stats.myRequests.rejected} rejected</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Budget Utilization
          </CardTitle>
          <DollarSign className="w-4 h-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${(stats.budget.utilized / 1000000).toFixed(1)}M
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span>{stats.budget.percentage.toFixed(1)}% utilized</span>
              <span>${(stats.budget.remaining / 1000000).toFixed(1)}M left</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 rounded-full h-2 transition-all"
                style={{ width: `${Math.min(stats.budget.percentage, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Avg Approval Time
          </CardTitle>
          <TrendingUp className="w-4 h-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgApprovalDays}</div>
          <p className="text-xs text-gray-500 mt-1">Days to approve</p>
        </CardContent>
      </Card>
    </div>
  )
}
