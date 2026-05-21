import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, TrendingUp, DollarSign, FileCheck, Clock, Calendar, PieChart, BarChart3 } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

interface FundingRequest {
  id: string
  request_number: string
  title: string
  amount: number
  currency: string
  budget_type: 'CAPEX' | 'OPEX'
  business_unit: string
  status: string
  created_at: string
  required_by_date: string
}

interface MonthlyData {
  month: string
  total: number
  approved: number
  pending: number
  capex: number
  opex: number
}

export default function Reports() {
  const { userRole } = useAuth()
  const [requests, setRequests] = useState<FundingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [statusData, setStatusData] = useState<any[]>([])
  const [buData, setBuData] = useState<any[]>([])
  const [budgetTypeData, setBudgetTypeData] = useState<any[]>([])
  const [topRequests, setTopRequests] = useState<FundingRequest[]>([])

  useEffect(() => {
    const fetchData = async () => {
      let query = supabase.from('funding_requests').select('*')
      
      const { data, error } = await query
      
      if (!error && data) {
        setRequests(data)
        processChartData(data)
      }
      setLoading(false)
    }
    
    fetchData()
  }, [])

  const processChartData = (data: FundingRequest[]) => {
    // 1. Monthly trend data
    const monthlyMap = new Map()
    data.forEach(req => {
      const date = new Date(req.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleString('default', { month: 'short' })
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthName,
          total: 0,
          approved: 0,
          pending: 0,
          capex: 0,
          opex: 0
        })
      }
      
      const monthData = monthlyMap.get(monthKey)
      monthData.total += req.amount
      if (req.status === 'Approved') monthData.approved += req.amount
      if (req.status === 'Pending') monthData.pending += req.amount
      if (req.budget_type === 'CAPEX') monthData.capex += req.amount
      if (req.budget_type === 'OPEX') monthData.opex += req.amount
    })
    
    setMonthlyData(Array.from(monthlyMap.values()).slice(-6))

    // 2. Status distribution
    const statusCount = {
      Approved: 0,
      Pending: 0,
      Returned: 0,
      Rejected: 0,
      Draft: 0
    }
    data.forEach(req => {
      if (statusCount[req.status as keyof typeof statusCount] !== undefined) {
        statusCount[req.status as keyof typeof statusCount]++
      }
    })
    setStatusData(Object.entries(statusCount).map(([name, value]) => ({ name, value })))

    // 3. Business Unit distribution
    const buMap = new Map()
    data.forEach(req => {
      buMap.set(req.business_unit, (buMap.get(req.business_unit) || 0) + req.amount)
    })
    setBuData(Array.from(buMap.entries()).map(([name, value]) => ({ name, value })))

    // 4. Budget Type distribution
    const budgetMap = new Map()
    data.forEach(req => {
      budgetMap.set(req.budget_type, (budgetMap.get(req.budget_type) || 0) + req.amount)
    })
    setBudgetTypeData(Array.from(budgetMap.entries()).map(([name, value]) => ({ name, value })))

    // 5. Top 5 requests by amount
    setTopRequests([...data].sort((a, b) => b.amount - a.amount).slice(0, 5))
  }

  const formatCurrency = (amount: number) => {
    return `$${(amount / 1000).toFixed(0)}k`
  }

  const totalAmount = requests.reduce((sum, r) => sum + r.amount, 0)
  const approvedAmount = requests.filter(r => r.status === 'Approved').reduce((sum, r) => sum + r.amount, 0)
  const pendingAmount = requests.filter(r => r.status === 'Pending').reduce((sum, r) => sum + r.amount, 0)
  const capexTotal = requests.filter(r => r.budget_type === 'CAPEX').reduce((sum, r) => sum + r.amount, 0)
  const opexTotal = requests.filter(r => r.budget_type === 'OPEX').reduce((sum, r) => sum + r.amount, 0)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-500 mt-1">Real-time insights from your funding requests</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{requests.length}</div>
            <p className="text-xs opacity-75 mt-1">Total funding requests</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${(totalAmount / 1000).toFixed(0)}k</div>
            <p className="text-xs opacity-75 mt-1">Across all requests</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${(approvedAmount / 1000).toFixed(0)}k</div>
            <p className="text-xs opacity-75 mt-1">Approved funding</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${(pendingAmount / 1000).toFixed(0)}k</div>
            <p className="text-xs opacity-75 mt-1">Awaiting decision</p>
          </CardContent>
        </Card>
      </div>

      {/* CAPEX/OPEX Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Budget Type Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-around">
              <div className="text-center">
                <p className="text-sm text-gray-500">CAPEX</p>
                <p className="text-2xl font-bold text-blue-600">${(capexTotal / 1000).toFixed(0)}k</p>
                <p className="text-xs text-gray-400">{((capexTotal / totalAmount) * 100).toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">OPEX</p>
                <p className="text-2xl font-bold text-green-600">${(opexTotal / 1000).toFixed(0)}k</p>
                <p className="text-xs text-gray-400">{((opexTotal / totalAmount) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Average Request Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-600">
                ${(totalAmount / requests.length / 1000).toFixed(0)}k
              </p>
              <p className="text-sm text-gray-500 mt-2">Average per request</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend - Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Monthly Funding Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip formatter={(value: number) => [`$${(value / 1000).toFixed(0)}k`, 'Amount']} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3B82F6" name="Total" strokeWidth={2} />
                <Line type="monotone" dataKey="approved" stroke="#10B981" name="Approved" strokeWidth={2} />
                <Line type="monotone" dataKey="pending" stroke="#F59E0B" name="Pending" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Request Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={statusData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.filter(d => d.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Business Unit - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Business Unit Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={buData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip formatter={(value: number) => [`$${(value / 1000).toFixed(0)}k`, 'Amount']} />
                <Bar dataKey="value" fill="#3B82F6">
                  {buData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget Type - Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              CAPEX vs OPEX Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip formatter={(value: number) => [`$${(value / 1000).toFixed(0)}k`, 'Amount']} />
                <Legend />
                <Area type="monotone" dataKey="capex" stackId="1" stroke="#3B82F6" fill="#3B82F6" name="CAPEX" />
                <Area type="monotone" dataKey="opex" stackId="1" stroke="#10B981" fill="#10B981" name="OPEX" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Top 5 Highest Value Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Request #</th>
                  <th className="text-left py-3 px-4">Title</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-center py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {topRequests.map((req) => (
                  <tr key={req.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm">{req.request_number}</td>
                    <td className="py-3 px-4">{req.title}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        req.budget_type === 'CAPEX' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {req.budget_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatCurrency(req.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        req.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
