import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock, CheckCircle2, XCircle, RotateCcw, AlertCircle } from 'lucide-react'
import type { RecentActivity as RecentActivityType } from '@/api/dashboardApi'

interface RecentActivityProps {
  activities: RecentActivityType[]
  loading: boolean
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-500', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
  returned: { label: 'Returned', color: 'bg-orange-500', icon: RotateCcw }
}

const priorityConfig = {
  urgent: { label: 'Urgent', variant: 'destructive' as const },
  high: { label: 'High', variant: 'destructive' as const },
  medium: { label: 'Medium', variant: 'default' as const },
  low: { label: 'Low', variant: 'secondary' as const }
}

export function RecentActivity({ activities, loading }: RecentActivityProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recent activity to display
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{activity.title}</h4>
                    {getPriorityBadge(activity.priority)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{activity.requester_name}</span>
                    <span>${activity.amount.toLocaleString()} {activity.currency}</span>
                    <span>{new Date(activity.created_at).toLocaleDateString()}</span>
                    {activity.days_pending > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activity.days_pending} days
                      </span>
                    )}
                  </div>
                </div>
                {getStatusBadge(activity.status)}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
