import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, Clock, XCircle, RotateCcw, User, Building2, DollarSign, Calendar, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface ApprovalAction {
  id: string
  approver_email: string
  action: string
  comments: string
  created_at: string
}

interface FundingRequest {
  id: string
  request_number: string
  title: string
  description: string
  amount: number
  currency: string
  budget_type: string
  business_unit: string
  status: string
  current_approver: string
  required_by_date: string
  vendor: string
  cost_centre: string
  gl_code: string
  submitted_at: string
  created_at: string
  department?: { name: string }
  legal_entity?: { name: string; code: string }
}

export default function ViewRequest() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [request, setRequest] = useState<FundingRequest | null>(null)
  const [approvals, setApprovals] = useState<ApprovalAction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchRequest()
      fetchApprovals()
    }
  }, [id])

  const fetchRequest = async () => {
    try {
      console.log('Fetching request with ID:', id)
      const { data, error } = await supabase
        .from('funding_requests')
        .select(`
          *,
          department:departments(name),
          legal_entity:legal_entities(name, code)
        `)
        .eq('id', id)
        .single()
      
      if (error) {
        console.error('Error fetching request:', error)
        toast.error('Failed to load request')
        return
      }
      
      console.log('Request data:', data)
      setRequest(data)
    } catch (err) {
      console.error('Error:', err)
      toast.error('Failed to load request')
    }
  }

  const fetchApprovals = async () => {
    try {
      console.log('Fetching approvals for request ID:', id)
      const { data, error } = await supabase
        .from('approval_actions')
        .select('*')
        .eq('request_id', id)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error fetching approvals:', error)
        return
      }
      
      console.log('Approvals data:', data)
      setApprovals(data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
      case 'returned':
        return <Badge className="bg-orange-100 text-orange-700"><RotateCcw className="w-3 h-3 mr-1" /> Returned</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>
      default:
        return <Badge variant="outline">{status || 'Draft'}</Badge>
    }
  }

  const getActionIcon = (action: string) => {
    switch (action?.toLowerCase()) {
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />
      case 'returned': return <RotateCcw className="w-4 h-4 text-orange-500" />
      default: return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Request not found</h2>
        <p className="text-gray-500 mt-2">The request you're looking for doesn't exist or you don't have access.</p>
        <Button className="mt-4" onClick={() => navigate('/my-requests')}>Back to My Requests</Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
          <p className="text-sm text-gray-500">Request #{request.request_number} • Submitted on {format(new Date(request.submitted_at || request.created_at), 'PPP')}</p>
        </div>
        {getStatusBadge(request.status)}
      </div>

      {/* Request Details */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Title</p>
              <p className="font-medium">{request.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-medium">{request.currency} {request.amount?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Department</p>
              <p className="font-medium">{request.department?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Classification</p>
              <p className="font-medium">{request.budget_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Business Unit</p>
              <p className="font-medium">{request.business_unit}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Legal Entity</p>
              <p className="font-medium">{request.legal_entity?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Vendor</p>
              <p className="font-medium">{request.vendor || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cost Centre</p>
              <p className="font-medium">{request.cost_centre || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">GL Code</p>
              <p className="font-medium">{request.gl_code || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Required By</p>
              <p className="font-medium">{request.required_by_date ? format(new Date(request.required_by_date), 'PPP') : 'Not set'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Business Justification</p>
            <p className="mt-1">{request.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Approval Workflow */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Requester step */}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">1. Requester</p>
                <p className="text-sm text-gray-600">You</p>
                <Badge variant="outline" className="mt-1 bg-green-50 text-green-700">✓ Submitted</Badge>
              </div>
            </div>

            {/* Approval steps */}
            {approvals.length === 0 ? (
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">2. Line Manager</p>
                  <p className="text-sm text-gray-600">Awaiting approval</p>
                  <Badge variant="outline" className="mt-1 bg-yellow-50 text-yellow-700">Pending</Badge>
                </div>
              </div>
            ) : (
              approvals.map((approval, idx) => (
                <div key={approval.id} className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    approval.action === 'approved' ? 'bg-green-100' :
                    approval.action === 'rejected' ? 'bg-red-100' :
                    approval.action === 'returned' ? 'bg-orange-100' : 'bg-gray-200'
                  }`}>
                    {getActionIcon(approval.action)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{idx + 2}. {approval.approver_email?.split('@')[0] || 'Approver'}</p>
                    <p className="text-sm text-gray-600">
                      {approval.action === 'approved' ? 'Approved' :
                       approval.action === 'rejected' ? 'Rejected' :
                       approval.action === 'returned' ? 'Returned for correction' : 'Pending'}
                    </p>
                    {approval.comments && (
                      <p className="text-sm text-gray-500 mt-1">Comment: {approval.comments}</p>
                    )}
                    <Badge variant="outline" className="mt-1 bg-gray-50">
                      {approval.action === 'approved' ? '✓ Approved' :
                       approval.action === 'rejected' ? '✗ Rejected' :
                       approval.action === 'returned' ? '↩ Returned' : '⏳ Pending'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/my-requests')}>
          Back to My Requests
        </Button>
        <Button variant="outline" onClick={() => { fetchRequest(); fetchApprovals(); }}>
          Refresh Status
        </Button>
      </div>
    </div>
  )
}
