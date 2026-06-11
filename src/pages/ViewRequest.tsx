import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, ArrowLeft, Calendar, DollarSign,
  FileText, Clock, CheckCircle2, XCircle,
  RotateCcw, ChevronRight, User, Building2
} from 'lucide-react'
import { format } from 'date-fns'
import { useCurrencyConversion } from '@/hooks/useCurrencyConversion'
import { toast } from 'sonner'

interface FundingRequest {
  id: string
  request_number: string
  title: string
  description: string
  amount: number
  amount_usd: number
  currency: string
  budget_type: string
  business_unit: string
  status: string
  requester_email: string
  created_at: string
  department_id: string
  legal_entity_id: string
  project_number?: string
  doa_level?: string
  approval_comments?: string
  current_step?: number
  total_steps?: number
  current_approver_email?: string
  approval_chain?: ApprovalChainStep[]
  department?: { name: string }
  legal_entity?: { name: string; code: string }
}

interface ApprovalChainStep {
  step: number
  name: string
  email: string
  role: string
  required: boolean
}

interface ApprovalAction {
  id: string
  approver_email: string
  action: string
  comments: string
  created_at: string
}

// Map action → visual config
const actionConfig = {
  approved:  { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700 border-green-200',  label: 'Approved' },
  rejected:  { icon: XCircle,      color: 'text-red-600',   bg: 'bg-red-50 border-red-200',     dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700 border-red-200',         label: 'Rejected' },
  returned:  { icon: RotateCcw,    color: 'text-orange-600',bg: 'bg-orange-50 border-orange-200',dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Returned' },
  cancelled: { icon: XCircle,      color: 'text-gray-400',  bg: 'bg-gray-50 border-gray-200 opacity-60', dot: 'bg-gray-300', badge: 'bg-gray-100 text-gray-400 border-gray-200', label: 'Cancelled' },
  pending:   { icon: Clock,        color: 'text-yellow-600',bg: 'bg-yellow-50 border-yellow-200',dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Pending' },
  waiting:   { icon: Clock,        color: 'text-gray-400',  bg: 'bg-gray-50 border-gray-200',   dot: 'bg-gray-300',   badge: 'bg-gray-100 text-gray-500 border-gray-200',       label: 'Awaiting' },
}

export default function ViewRequest() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { formatCurrency, formatUSD } = useCurrencyConversion()
  const [request, setRequest] = useState<FundingRequest | null>(null)
  const [approvalHistory, setApprovalHistory] = useState<ApprovalAction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchRequest()
  }, [id])

  const fetchRequest = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data: requestData, error: requestError } = await supabase
        .from('funding_requests')
        .select(`*, department:departments(name), legal_entity:legal_entities(name, code)`)
        .eq('id', id)
        .single()

      if (requestError) throw requestError
      setRequest(requestData)

      const { data: historyData, error: historyError } = await supabase
        .from('approval_actions')
        .select('*')
        .eq('request_id', id)
        .order('created_at', { ascending: true })

      if (!historyError && historyData) {
        setApprovalHistory(historyData)
      }
    } catch {
      toast.error('Failed to load request details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Request not found</p>
        <Button onClick={() => navigate('/my-requests')} className="mt-4">Back to My Requests</Button>
      </div>
    )
  }

  // Derive the displayed status (if there are still pending actions, it's not truly approved)
  const hasPendingActions = approvalHistory.some(a => a.action === 'pending')
  const effectiveStatus   = (hasPendingActions && request.status === 'Approved') ? 'Pending' : request.status

  const statusCfg = {
    Approved: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Approved' },
    Pending:  { icon: Clock,        color: 'text-yellow-600', bg: 'bg-yellow-50',
      label: request.current_step && request.total_steps
        ? `Pending · Step ${request.current_step} of ${request.total_steps}`
        : 'Pending Review' },
    Rejected: { icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-50',    label: 'Rejected' },
    Returned: { icon: RotateCcw,    color: 'text-orange-600', bg: 'bg-orange-50', label: 'Returned for Revision' },
    Draft:    { icon: FileText,     color: 'text-gray-600',   bg: 'bg-gray-50',   label: 'Draft' },
  }
  const sc       = statusCfg[effectiveStatus as keyof typeof statusCfg] || statusCfg.Draft
  const StatusIcon = sc.icon

  // Build the pipeline view by merging approval_chain JSON with actual approval_actions
  const chain: ApprovalChainStep[] = request.approval_chain || []
  const pipelineSteps = chain.filter(s => s.required).map(step => {
    const action = approvalHistory.find(a => a.approver_email === step.email)
    const isCurrent = request.current_approver_email === step.email && effectiveStatus === 'Pending'
    const state = action?.action || (isCurrent ? 'pending' : 'waiting')
    return { ...step, action, state }
  })

  const isOwner = request.requester_email === user?.email

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
              <Badge className={`${sc.bg} ${sc.color} border-0`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {sc.label}
              </Badge>
            </div>
            <p className="text-gray-500">Request #{request.request_number}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Description */}
          {request.description && (
            <Card>
              <CardHeader><CardTitle>Executive Summary</CardTitle></CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{request.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Request Details */}
          <Card>
            <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Amount</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(request.amount, request.currency)}</p>
                  {request.currency !== 'USD' && request.amount_usd && (
                    <p className="text-sm text-gray-400">≈ {formatUSD(request.amount_usd)}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Budget Type</p>
                  <Badge variant="outline">{request.budget_type}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Business Unit</p>
                  <div className="flex items-center gap-1">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <p>{request.business_unit}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Department</p>
                  <p>{request.department?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Legal Entity</p>
                  <p>{request.legal_entity?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Project Number</p>
                  <p className="font-mono text-sm">{request.project_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Submitted</p>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p>{format(new Date(request.created_at), 'MMMM dd, yyyy')}</p>
                  </div>
                </div>
                {request.doa_level && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">DoA Level</p>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 border">{request.doa_level}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Approval Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle>Approval Pipeline</CardTitle>
              {request.total_steps && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>
                      {effectiveStatus === 'Approved'
                        ? `All ${request.total_steps} stage(s) complete`
                        : effectiveStatus === 'Pending'
                        ? `Stage ${request.current_step} of ${request.total_steps}`
                        : effectiveStatus}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        effectiveStatus === 'Approved' ? 'bg-green-500' :
                        effectiveStatus === 'Rejected' || effectiveStatus === 'Returned' ? 'bg-red-400' :
                        'bg-blue-600'
                      }`}
                      style={{
                        width: effectiveStatus === 'Approved'
                          ? '100%'
                          : `${(((request.current_step || 1) - 1) / (request.total_steps || 1)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {pipelineSteps.length > 0 ? (
                <div className="space-y-3">
                  {pipelineSteps.map((step, idx) => {
                    const cfg = actionConfig[step.state as keyof typeof actionConfig] || actionConfig.waiting
                    const Icon = cfg.icon
                    const isLast = idx === pipelineSteps.length - 1
                    return (
                      <div key={step.step}>
                        <div className={`flex gap-3 p-4 rounded-lg border ${cfg.bg}`}>
                          <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            <Icon className={`w-5 h-5 ${cfg.color}`} />
                            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2 flex-wrap">
                              <div>
                                <p className="font-semibold text-gray-900">{step.name}</p>
                                <p className="text-sm text-gray-500">{step.email}</p>
                                <p className="text-xs text-gray-400 mt-0.5">Stage {step.step}</p>
                              </div>
                              <Badge className={`${cfg.badge} border text-xs`}>{cfg.label}</Badge>
                            </div>
                            {step.action?.comments && (
                              <p className="text-sm text-gray-600 mt-2 bg-white/60 p-2 rounded">
                                "{step.action.comments}"
                              </p>
                            )}
                            {step.action?.created_at && step.state !== 'pending' && step.state !== 'waiting' && (
                              <p className="text-xs text-gray-400 mt-1">
                                {format(new Date(step.action.created_at), 'MMM dd, yyyy h:mm a')}
                              </p>
                            )}
                          </div>
                        </div>
                        {!isLast && (
                          <div className="flex justify-center my-1">
                            <ChevronRight className="w-4 h-4 text-gray-300 rotate-90" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Fallback: show raw approval_actions if no chain JSON
                approvalHistory.length > 0 ? (
                  <div className="space-y-3">
                    {approvalHistory.map((step, idx) => {
                      const cfg = actionConfig[step.action as keyof typeof actionConfig] || actionConfig.pending
                      const Icon = cfg.icon
                      return (
                        <div key={step.id} className={`flex gap-3 p-4 rounded-lg border ${cfg.bg}`}>
                          <Icon className={`w-5 h-5 flex-shrink-0 ${cfg.color}`} />
                          <div className="flex-1">
                            <div className="flex justify-between items-start gap-2 flex-wrap">
                              <div>
                                <p className="font-medium text-gray-900">{step.approver_email}</p>
                                <p className="text-xs text-gray-400">Stage {idx + 1}</p>
                              </div>
                              <Badge className={`${cfg.badge} border text-xs`}>{cfg.label}</Badge>
                            </div>
                            {step.comments && (
                              <p className="text-sm text-gray-600 mt-2">"{step.comments}"</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {format(new Date(step.created_at), 'MMM dd, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No approval stages recorded yet.</p>
                )
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {['Rejected', 'Returned'].includes(effectiveStatus) && isOwner && (
                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => navigate(`/edit-request/${request.id}`)}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Edit &amp; Resubmit
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => navigate('/my-requests')}>
                <FileText className="w-4 h-4 mr-2" /> View All My Requests
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/approvals')}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Approvals Inbox
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Request Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Request Number</p>
                <p className="font-mono text-sm font-medium">{request.request_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <Badge className={`${sc.bg} ${sc.color} border-0 mt-1`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {sc.label}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">DOA Level</p>
                <p className="text-sm">{request.doa_level || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Submitted</p>
                <p className="text-sm">{format(new Date(request.created_at), 'MMMM dd, yyyy')}</p>
              </div>
              {request.requester_email && (
                <div>
                  <p className="text-xs text-gray-500">Requester</p>
                  <div className="flex items-center gap-1 mt-1">
                    <User className="w-3 h-3 text-gray-400" />
                    <p className="text-sm">{request.requester_email}</p>
                  </div>
                </div>
              )}
              {effectiveStatus === 'Pending' && request.current_approver_email && (
                <div>
                  <p className="text-xs text-gray-500">Awaiting Approval From</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-yellow-500" />
                    <p className="text-sm text-yellow-700">{request.current_approver_email}</p>
                  </div>
                </div>
              )}
              {request.total_steps && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Approval Progress</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${effectiveStatus === 'Approved' ? 'bg-green-500' : 'bg-blue-600'}`}
                        style={{
                          width: effectiveStatus === 'Approved'
                            ? '100%'
                            : `${(((request.current_step || 1) - 1) / request.total_steps) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {effectiveStatus === 'Approved' ? request.total_steps : (request.current_step || 1) - 1}/{request.total_steps}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Financial Details</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">Requested Amount</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(request.amount, request.currency)}</p>
              </div>
              {request.currency !== 'USD' && request.amount_usd && (
                <div>
                  <p className="text-xs text-gray-500">USD Equivalent</p>
                  <p className="text-sm text-gray-600">{formatUSD(request.amount_usd)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Currency</p>
                <p className="text-sm">{request.currency}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Classification</p>
                <Badge variant="outline" className="mt-1">{request.budget_type}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
