import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, CheckCircle2, Clock, TrendingUp } from 'lucide-react'

interface KPICardsProps {
  totalAmount: number
  totalRequests: number
  approvedAmount: number
  approvedCount: number
  pendingAmount: number
  pendingCount: number
  avgApprovalDays: number
}

export function KPICards({ totalAmount, totalRequests, approvedAmount, approvedCount, pendingAmount, pendingCount, avgApprovalDays }: KPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Requested - Blue */}
      <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Requested (USD)</CardTitle>
          <DollarSign className="w-4 h-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">${(totalAmount / 1000000).toFixed(2)}M</div>
          <p className="text-xs text-gray-500 mt-1">{totalRequests} requests</p>
          <Badge className="mt-2 bg-green-100 text-green-700 hover:bg-green-100">↗ On track</Badge>
        </CardContent>
      </Card>

      {/* Approved Value - Green */}
      <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Approved Value (USD)</CardTitle>
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">${(approvedAmount / 1000000).toFixed(2)}M</div>
          <p className="text-xs text-gray-500 mt-1">{approvedCount} approved</p>
          <Badge className="mt-2 bg-green-100 text-green-700 hover:bg-green-100">↗ On track</Badge>
        </CardContent>
      </Card>

      {/* Pending Value - Yellow */}
      <Card className="border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Pending Value (USD)</CardTitle>
          <Clock className="w-4 h-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">${(pendingAmount / 1000000).toFixed(2)}M</div>
          <p className="text-xs text-gray-500 mt-1">{pendingCount} in flight</p>
          <Badge className="mt-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-100">↘ Watch</Badge>
        </CardContent>
      </Card>

      {/* Avg Approval Days - Purple */}
      <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Avg Approval Days</CardTitle>
          <TrendingUp className="w-4 h-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{avgApprovalDays.toFixed(1)}d</div>
          <p className="text-xs text-gray-500 mt-1">Time to final approval</p>
        </CardContent>
      </Card>
    </div>
  )
}
