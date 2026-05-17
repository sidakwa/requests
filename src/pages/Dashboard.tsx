import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  CheckCircle2, Clock, XCircle, FileText, TrendingUp, DollarSign,
  Plus, Search, AlertTriangle, RotateCcw, Filter, Building2
} from 'lucide-react'
import { format } from 'date-fns'

interface FundingRequest {
  id: string
  request_number: string
  title: string
  description: string
  department_id: string
  business_unit: string
  legal_entity_id: string
  currency: string
  amount: number
  budget_type: 'CAPEX' | 'OPEX'
  status: string
  current_approver: string
  required_by_date: string
  cost_centre: string
  gl_code: string
  vendor: string
  created_at: string
  segment?: string
  department?: { name: string }
  legal_entity?: { name: string; code: string }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  Approved: { label: 'Approved', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  Pending: { label: 'Pending', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
  in_review: { label: 'In Review', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
  Returned: { label: 'Returned', color: 'text-orange-700', bg: 'bg-orange-100', icon: RotateCcw },
  Rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
  Draft: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100', icon: FileText },
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<FundingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterBU, setFilterBU] = useState('all')
  const [filterClass, setFilterClass] = useState('all')

  useEffect(() => {
    if (user) {
      fetchRequests()
    }
  }, [user])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('funding_requests')
        .select(`
          *,
          department:departments(name),
          legal_entity:legal_entities(name, code)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setRequests(data || [])
    } catch (err) {
      console.error('Error fetching requests:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats from real data
  const stats = {
    total: requests.length,
    approved: requests.filter(r => r.status === 'Approved').length,
    inReview: requests.filter(r => r.status === 'Pending' || r.status === 'in_review').length,
    returned: requests.filter(r => r.status === 'Returned').length,
    rejected: requests.filter(r => r.status === 'Rejected').length,
    totalUSD: requests.reduce((sum, r) => sum + (r.amount || 0), 0),
    capex: requests.filter(r => r.budget_type === 'CAPEX').reduce((sum, r) => sum + (r.amount || 0), 0),
    opex: requests.filter(r => r.budget_type === 'OPEX').reduce((sum, r) => sum + (r.amount || 0), 0),
  }

  // Filter requests
  const filtered = requests.filter(r => {
    if (search && !r.title?.toLowerCase().includes(search.toLowerCase()) && !r.request_number?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (filterBU !== 'all' && r.business_unit !== filterBU) return false
    if (filterClass !== 'all' && r.budget_type !== filterClass) return false
    return true
  })

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.Pending
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />{config.label}
      </span>
    )
  }

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', ZAR: 'R', KES: 'KSh', MZN: 'MT', TZS: 'TSh', UGX: 'USh' }
    const symbol = symbols[currency] || currency
    if (currency === 'ZAR') {
      return `${symbol} ${(amount / 1000).toFixed(0)}k`
    }
    return `${symbol} ${amount.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div><div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div><div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-1"></div></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>)}
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funding Portal</h1>
          <p className="text-sm text-gray-500 mt-0.5">All funding requests across SEACOM group</p>
        </div>
        <Button onClick={() => navigate('/new-request')} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" /> New Request
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-3"><p className="text-xs opacity-90">Total</p><p className="text-xl font-bold">{stats.total}</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-3"><p className="text-xs opacity-90">Approved</p><p className="text-xl font-bold">{stats.approved}</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-3"><p className="text-xs opacity-90">In Review</p><p className="text-xl font-bold">{stats.inReview}</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-3"><p className="text-xs opacity-90">Returned</p><p className="text-xl font-bold">{stats.returned}</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-3"><p className="text-xs opacity-90">Rejected</p><p className="text-xl font-bold">{stats.rejected}</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-3"><p className="text-xs opacity-90">Total (USD)</p><p className="text-xl font-bold">${(stats.totalUSD / 1000).toFixed(0)}k</p></CardContent>
        </Card>
      </div>

      {/* CAPEX/OPEX Summary */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>CAPEX: R {(stats.capex / 1000).toFixed(0)}k</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>OPEX: R {(stats.opex / 1000).toFixed(0)}k</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search title or ref..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Returned">Returned</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBU} onValueChange={setFilterBU}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All BUs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All BUs</SelectItem>
            <SelectItem value="DI">DI - Digital Infrastructure</SelectItem>
            <SelectItem value="DS">DS - Digital Services</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="CAPEX + OPEX" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">CAPEX + OPEX</SelectItem>
            <SelectItem value="CAPEX">CAPEX Only</SelectItem>
            <SelectItem value="OPEX">OPEX Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      <p className="text-sm text-gray-500">{filtered.length} results</p>

      {/* Requests List */}
      <div className="space-y-3">
        {filtered.map((req) => (
          <Card key={req.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/request/${req.id}`)}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs text-gray-500">{req.request_number}</span>
                    {getStatusBadge(req.status)}
                    <Badge variant="outline" className="text-xs">{req.business_unit}</Badge>
                    <Badge variant="outline" className="text-xs">{req.budget_type}</Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{req.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">{req.description?.substring(0, 100)}...</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{req.legal_entity?.name}</span>
                    <span>📋 {req.department?.name || 'N/A'}</span>
                    <span>🏢 {req.vendor || 'N/A'}</span>
                    <span>📅 Due: {req.required_by_date ? format(new Date(req.required_by_date), 'yyyy-MM-dd') : 'N/A'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(req.amount, req.currency)}</p>
                  <p className="text-xs text-gray-400">{req.currency}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {['PN', 'PN', 'SM', 'FH'].slice(0, req.budget_type === 'CAPEX' ? 4 : 2).map((initial, i) => (
                      <Avatar key={i} className="w-6 h-6"><AvatarFallback className="text-[10px] bg-gray-200">{initial}</AvatarFallback></Avatar>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No funding requests found. Create your first request!
          </div>
        )}
      </div>
    </div>
  )
}
