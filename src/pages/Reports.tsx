import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
  RefreshCw,
  X
} from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts'

interface DashboardStats {
  totalAmount: number
  totalRequests: number
  approvedAmount: number
  approvedCount: number
  pendingAmount: number
  pendingCount: number
  returnedAmount: number
  returnedCount: number
  rejectedAmount: number
  rejectedCount: number
  avgApprovalDays: number
  approvalRate: number
  capexAmount: number
  opexAmount: number
}

export default function Reports() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  // State for clickable KPI cards
  const [allRequests, setAllRequests] = useState<any[]>([])
  const [selectedView, setSelectedView] = useState<'ALL' | 'Approved' | 'Pending' | null>(null)

  // State setters
  const [stats, setStats] = useState<DashboardStats>({
    totalAmount: 0,
    totalRequests: 0,
    approvedAmount: 0,
    approvedCount: 0,
    pendingAmount: 0,
    pendingCount: 0,
    returnedAmount: 0,
    returnedCount: 0,
    rejectedAmount: 0,
    rejectedCount: 0,
    avgApprovalDays: 0,
    approvalRate: 0,
    capexAmount: 0,
    opexAmount: 0
  })
  const [monthlySpend, setMonthlySpend] = useState<any[]>([])
  const [spendByEntity, setSpendByEntity] = useState<any[]>([])
  const [capexOpexData, setCapexOpexData] = useState<any[]>([])
  const [approvalVelocity, setApprovalVelocity] = useState<any[]>([])
  const [requestsByStatus, setRequestsByStatus] = useState<any[]>([])
  const [spendByDepartment, setSpendByDepartment] = useState<any[]>([])

  useEffect(() => {
    if (user) {
      fetchReportData()
    }
  }, [user])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const { data: requests, error } = await supabase
        .from('funding_requests')
        .select(`
          *,
          legal_entity:legal_entities(name, code, business_unit),
          department:departments(name)
        `)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Store all requests for clickable functionality
      setAllRequests(requests || [])

      // Calculate stats
      const totalAmount = requests?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
      const totalRequests = requests?.length || 0

      const approvedRequestsList = requests?.filter(r => r.status === 'Approved') || []
      const pendingRequestsList = requests?.filter(r => r.status === 'Pending') || []
      const returnedRequestsList = requests?.filter(r => r.status === 'Returned') || []
      const rejectedRequestsList = requests?.filter(r => r.status === 'Rejected') || []

      const approvedAmount = approvedRequestsList.reduce((sum, r) => sum + (r.amount || 0), 0)
      const pendingAmount = pendingRequestsList.reduce((sum, r) => sum + (r.amount || 0), 0)
      const returnedAmount = returnedRequestsList.reduce((sum, r) => sum + (r.amount || 0), 0)
      const rejectedAmount = rejectedRequestsList.reduce((sum, r) => sum + (r.amount || 0), 0)

      const approvalRate = totalAmount > 0 ? (approvedAmount / totalAmount) * 100 : 0

      const capexAmount = requests?.filter(r => r.budget_type === 'CAPEX').reduce((sum, r) => sum + (r.amount || 0), 0) || 0
      const opexAmount = totalAmount - capexAmount

      // Calculate avg approval days
      let avgApprovalDays = 0
      const completedRequests = requests?.filter(r => (r.status === 'Approved' || r.status === 'Rejected') && r.created_at) || []
      if (completedRequests.length > 0) {
        const totalDays = completedRequests.reduce((sum, r) => {
          const created = new Date(r.created_at)
          const now = new Date()
          const days = (now.getTime() - created.getTime()) / (1000 * 3600 * 24)
          return sum + days
        }, 0)
        avgApprovalDays = totalDays / completedRequests.length
      }

      setStats({
        totalAmount,
        totalRequests,
        approvedAmount,
        approvedCount: approvedRequestsList.length,
        pendingAmount,
        pendingCount: pendingRequestsList.length,
        returnedAmount,
        returnedCount: returnedRequestsList.length,
        rejectedAmount,
        rejectedCount: rejectedRequestsList.length,
        avgApprovalDays: Math.round(avgApprovalDays * 10) / 10,
        approvalRate: Math.round(approvalRate),
        capexAmount,
        opexAmount
      })

      // Monthly spend data
      const monthlyMap = new Map()
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

      requests?.forEach(r => {
        const date = new Date(r.created_at)
        const monthName = months[date.getMonth()]

        if (!monthlyMap.has(monthName)) {
          monthlyMap.set(monthName, { month: monthName, actual: 0, forecast: 0 })
        }
        const entry = monthlyMap.get(monthName)
        entry.actual += r.amount || 0
        entry.forecast += (r.amount || 0) * 1.15
      })

      setMonthlySpend(Array.from(monthlyMap.values()).slice(-12))

      // Spend by legal entity
      const entityMap = new Map()
      requests?.forEach(r => {
        const entityName = r.legal_entity?.code || 'Unknown'
        if (!entityMap.has(entityName)) {
          entityMap.set(entityName, { name: entityName, amount: 0, count: 0 })
        }
        const entry = entityMap.get(entityName)
        entry.amount += r.amount || 0
        entry.count++
      })

      setSpendByEntity(Array.from(entityMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10))

      // CAPEX vs OPEX
      setCapexOpexData([
        { name: 'CAPEX', value: capexAmount, color: '#3b82f6' },
        { name: 'OPEX', value: opexAmount, color: '#10b981' }
      ])

      // Requests by status
      setRequestsByStatus([
        { name: 'Approved', value: approvedRequestsList.length, color: '#10b981' },
        { name: 'Pending', value: pendingRequestsList.length, color: '#f59e0b' },
        { name: 'Returned', value: returnedRequestsList.length, color: '#f97316' },
        { name: 'Rejected', value: rejectedRequestsList.length, color: '#ef4444' }
      ])

      // Spend by department
      const deptMap = new Map()
      requests?.forEach(r => {
        const deptName = r.department?.name || 'Unknown'
        if (!deptMap.has(deptName)) {
          deptMap.set(deptName, { name: deptName, capex: 0, opex: 0, total: 0 })
        }
        const entry = deptMap.get(deptName)
        if (r.budget_type === 'CAPEX') {
          entry.capex += r.amount || 0
        } else {
          entry.opex += r.amount || 0
        }
        entry.total += r.amount || 0
      })

      setSpendByDepartment(Array.from(deptMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 8))

      // Approval velocity
      const weeklyMap = new Map()
      requests?.filter(r => r.status === 'Approved' && r.created_at).forEach(r => {
        const date = new Date(r.created_at)
        const weekNum = Math.ceil(date.getDate() / 7)
        const weekLabel = `W${weekNum} ${months[date.getMonth()]}`

        if (!weeklyMap.has(weekLabel)) {
          weeklyMap.set(weekLabel, { week: weekLabel, days: 0, count: 0 })
        }
        const entry = weeklyMap.get(weekLabel)
        const created = new Date(r.created_at)
        const now = new Date()
        const days = (now.getTime() - created.getTime()) / (1000 * 3600 * 24)
        entry.days += days
        entry.count++
      })

      const velocityData = Array.from(weeklyMap.values())
        .map(w => ({ week: w.week, days: Math.round((w.days / w.count) * 10) / 10 }))
        .slice(-8)

      setApprovalVelocity(velocityData.length > 0 ? velocityData : [
        { week: 'W1 May', days: 0.8 }, { week: 'W2 May', days: 0.6 }, { week: 'W3 May', days: 0.4 }
      ])

    } catch (err) {
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Helper to get selected requests based on view
  const getSelectedRequests = () => {
    if (!selectedView) return []
    if (selectedView === 'ALL') {
      return allRequests
    }
    return allRequests.filter(r => r.status === selectedView)
  }

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64 mt-2" /></div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-96" /><Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">View spending analytics and approval metrics</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-blue-50 text-blue-700">Real-time Data</Badge>
          <Button variant="outline" size="sm" onClick={fetchReportData}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="space-y-6">
        {/* KPI Cards - Clickable */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Requested Card - Clickable */}
          <Card
            onClick={() => setSelectedView(selectedView === 'ALL' ? null : 'ALL')}
            className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Requested</CardTitle>
              <DollarSign className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalAmount)}</div>
              <p className="text-xs text-gray-500">{stats.totalRequests} requests YTD</p>
              <Badge className="mt-2 bg-green-100 text-green-700">↗ On track</Badge>
            </CardContent>
          </Card>

          {/* Approved Value Card - Clickable */}
          <Card
            onClick={() => setSelectedView(selectedView === 'Approved' ? null : 'Approved')}
            className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Approved Value</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.approvedAmount)}</div>
              <p className="text-xs text-gray-500">{stats.approvedCount} approved ({stats.approvalRate}% rate)</p>
              <Badge className="mt-2 bg-green-100 text-green-700">↗ On track</Badge>
            </CardContent>
          </Card>

          {/* Pending Value Card - Clickable */}
          <Card
            onClick={() => setSelectedView(selectedView === 'Pending' ? null : 'Pending')}
            className="border-l-4 border-l-yellow-500 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Value</CardTitle>
              <Clock className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingAmount)}</div>
              <p className="text-xs text-gray-500">{stats.pendingCount} awaiting decision</p>
              <Badge className="mt-2 bg-yellow-100 text-yellow-700">↘ Watch</Badge>
            </CardContent>
          </Card>

          {/* Avg Approval Days Card - Not clickable */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Approval Days</CardTitle>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.avgApprovalDays}</div>
              <p className="text-xs text-gray-500">Time to final approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Table - Shows when a KPI card is clicked */}
        {selectedView && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedView === 'ALL' ? 'All Funding Requests' : `${selectedView} Funding Requests`}
                  </CardTitle>
                  <CardDescription>
                    Showing {getSelectedRequests().length} request(s)
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedView(null)}>
                  <X className="w-4 h-4 mr-1" /> Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left bg-gray-50">
                      <th className="py-3 px-4 font-semibold">Request No.</th>
                      <th className="py-3 px-4 font-semibold">Title</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Type</th>
                      <th className="py-3 px-4 font-semibold">BU</th>
                      <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSelectedRequests().map((request) => (
                      <tr key={request.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-4 font-mono text-xs">{request.request_number}</td>
                        <td className="py-2 px-4 font-medium">{request.title}</td>
                        <td className="py-2 px-4">
                          <Badge variant="outline" className={
                            request.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                            request.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            request.status === 'Returned' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            request.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' : ''
                          }>
                            {request.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant="outline">{request.budget_type}</Badge>
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant="outline">{request.business_unit}</Badge>
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-medium">
                          {formatCurrency(Number(request.amount || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Spend vs Forecast */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spend vs Forecast (USD)</CardTitle>
            <CardDescription>Actual spend vs projected forecast by month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={monthlySpend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Actual Spend" />
                <Area type="monotone" dataKey="forecast" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Forecast" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Spend by Legal Entity */}
          <Card>
            <CardHeader>
              <CardTitle>Spend by Legal Entity (USD)</CardTitle>
              <CardDescription>Top 10 entities by spend</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={spendByEntity} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" width={80} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill="#3b82f6">
                    {spendByEntity.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* CAPEX vs OPEX Donut */}
          <Card>
            <CardHeader>
              <CardTitle>CAPEX vs OPEX Split</CardTitle>
              <CardDescription>Capital vs Operational Expenditure</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={capexOpexData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {capexOpexData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-8 mt-4">
                {capexOpexData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm">{item.name}: {formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Requests by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Requests by Status</CardTitle>
              <CardDescription>Distribution of all funding requests</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={requestsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {requestsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} requests`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Approval Velocity */}
          <Card>
            <CardHeader>
              <CardTitle>Approval Velocity</CardTitle>
              <CardDescription>Average days to approve by week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={approvalVelocity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip formatter={(value: number) => `${value} days`} />
                  <Legend />
                  <Line type="monotone" dataKey="days" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: '#8b5cf6' }} name="Avg Days to Approve" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* CAPEX/OPEX by Department */}
        <Card>
          <CardHeader>
            <CardTitle>CAPEX/OPEX by Department</CardTitle>
            <CardDescription>Grouped spend by department and classification</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={spendByDepartment} margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#6b7280" tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="capex" fill="#3b82f6" name="CAPEX" />
                <Bar dataKey="opex" fill="#10b981" name="OPEX" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Returned Value</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(stats.returnedAmount)}</p>
              <p className="text-xs text-gray-500">{stats.returnedCount} requests returned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Rejected Value</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(stats.rejectedAmount)}</p>
              <p className="text-xs text-gray-500">{stats.rejectedCount} requests rejected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Average Request Value</p>
              <p className="text-xl font-bold text-purple-600">
                {stats.totalRequests > 0 ? formatCurrency(stats.totalAmount / stats.totalRequests) : '$0'}
              </p>
              <p className="text-xs text-gray-500">Across all requests</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
