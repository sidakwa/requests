import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Eye, Clock, CheckCircle2, XCircle, RotateCcw, FileText, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

interface FundingRequest {
  id: string
  request_number: string
  title: string
  amount: number
  currency: string
  status: string
  current_step?: number
  total_steps?: number
  current_approver_email?: string
  doa_level?: string
  created_at: string
}

const statusConfig = {
  Pending:  { icon: Clock,        color: 'text-yellow-700 bg-yellow-50', label: 'Pending' },
  Approved: { icon: CheckCircle2, color: 'text-green-700 bg-green-50',   label: 'Approved' },
  Rejected: { icon: XCircle,      color: 'text-red-700 bg-red-50',       label: 'Rejected' },
  Returned: { icon: RotateCcw,    color: 'text-orange-700 bg-orange-50', label: 'Returned' },
  Draft:    { icon: FileText,     color: 'text-gray-700 bg-gray-50',     label: 'Draft' },
}

export default function MyRequests() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [requests, setRequests] = useState<FundingRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    if (user) fetchRequests()
  }, [user])

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('funding_requests')
        .select('id, request_number, title, amount, currency, status, current_step, total_steps, current_approver_email, doa_level, created_at')
        .eq('requester_email', user?.email)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch {
      // silently handled
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = requests.filter(req =>
    req.title?.toLowerCase().includes(search.toLowerCase()) ||
    req.request_number?.toLowerCase().includes(search.toLowerCase())
  )

  const pendingCount  = requests.filter(r => r.status === 'Pending').length
  const approvedCount = requests.filter(r => r.status === 'Approved').length
  const returnedCount = requests.filter(r => r.status === 'Returned').length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Requests</h1>
          <p className="text-gray-500 mt-1">Track your funding requests through the approval pipeline</p>
        </div>
        <Button onClick={() => navigate('/new-request')} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> New Request
        </Button>
      </div>

      {/* Summary KPIs */}
      {!loading && requests.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-yellow-50 border-yellow-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
                  <p className="text-sm text-yellow-600">Awaiting Approval</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-700">{approvedCount}</p>
                  <p className="text-sm text-green-600">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <RotateCcw className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-orange-700">{returnedCount}</p>
                  <p className="text-sm text-orange-600">Need Revision</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>Browse and track all your submitted funding requests</CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by title or request number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">No requests found</p>
              <p className="text-sm mt-1">Create your first request to get started.</p>
              <Button className="mt-4 bg-blue-600" onClick={() => navigate('/new-request')}>
                <Plus className="w-4 h-4 mr-2" /> New Request
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map(req => {
                  const sc = statusConfig[req.status as keyof typeof statusConfig] || statusConfig.Draft
                  const Icon = sc.icon
                  const hasProgress = req.total_steps && req.total_steps > 0
                  const progressPct = req.status === 'Approved'
                    ? 100
                    : hasProgress
                    ? Math.round((((req.current_step || 1) - 1) / req.total_steps!) * 100)
                    : 0

                  return (
                    <TableRow key={req.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/request/${req.id}`)}>
                      <TableCell className="font-mono text-sm text-gray-600">{req.request_number}</TableCell>
                      <TableCell className="font-medium max-w-xs truncate">{req.title}</TableCell>
                      <TableCell className="text-blue-700 font-semibold whitespace-nowrap">
                        {req.currency} {req.amount?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${sc.color} border-0 gap-1`}>
                          <Icon className="w-3 h-3" />
                          {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hasProgress ? (
                          <div className="space-y-1 min-w-[120px]">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>
                                {req.status === 'Approved'
                                  ? 'Complete'
                                  : req.status === 'Pending'
                                  ? `Step ${req.current_step}/${req.total_steps}`
                                  : req.status}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  req.status === 'Approved' ? 'bg-green-500' :
                                  req.status === 'Rejected' || req.status === 'Returned' ? 'bg-red-400' :
                                  'bg-blue-500'
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            {req.status === 'Pending' && req.current_approver_email && (
                              <p className="text-xs text-gray-400 truncate max-w-[160px]" title={req.current_approver_email}>
                                Awaiting: {req.current_approver_email}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                        {format(new Date(req.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/request/${req.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
