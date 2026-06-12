import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  CheckCircle2, XCircle, Clock, RotateCcw,
  Building2, DollarSign, Calendar,
  MessageSquare, Loader2, Eye
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { decideCatalogRequest, getCatalogRequest } from '@/api/platformApi'

interface ApprovalRequest {
  id: string            // approval_action id (funding) or synthetic id (catalog)
  request_id: string
  approver_email: string
  action: string
  comments: string
  created_at: string
  request_number: string
  title: string
  description: string
  amount: number
  currency: string
  budget_type: string
  business_unit: string
  status: string
  current_step?: number
  total_steps?: number
  requester_email?: string
  doa_level?: string
  source?: 'catalog'   // undefined = legacy funding request
}

export default function ApprovalsInbox() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null)
  const [showDecisionDialog, setShowDecisionDialog] = useState(false)
  const [decisionAction, setDecisionAction] = useState<'approved' | 'rejected' | 'returned'>('approved')
  const [decisionComments, setDecisionComments] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) fetchApprovals()
  }, [user])

  const fetchApprovals = async () => {
    setLoading(true)
    try {
      // ── Funding: pending ───────────────────────────────────────────────────
      const { data: pendingRequests, error: pendingReqErr } = await supabase
        .from('funding_requests')
        .select('id, request_number, title, description, amount, currency, budget_type, business_unit, status, current_step, total_steps, requester_email, doa_level, created_at')
        .eq('current_approver_email', user?.email)
        .eq('status', 'Pending')
        .order('created_at', { ascending: false })

      if (pendingReqErr) throw pendingReqErr

      const pendingRequestIds = (pendingRequests || []).map(r => r.id)
      let pendingActions: { id: string; request_id: string; created_at: string }[] = []
      if (pendingRequestIds.length > 0) {
        const { data: pa } = await supabase
          .from('approval_actions')
          .select('id, request_id, created_at')
          .in('request_id', pendingRequestIds)
          .eq('approver_email', user?.email)
          .eq('action', 'pending')
        pendingActions = pa || []
      }

      const pendingFunding: ApprovalRequest[] = (pendingRequests || []).map(req => {
        const action = pendingActions.find(a => a.request_id === req.id)
        return {
          id: action?.id || '',
          request_id: req.id,
          approver_email: user?.email || '',
          action: 'pending',
          comments: '',
          created_at: req.created_at,
          request_number: req.request_number,
          title: req.title,
          description: req.description,
          amount: req.amount,
          currency: req.currency,
          budget_type: req.budget_type,
          business_unit: req.business_unit,
          status: req.status,
          current_step: req.current_step,
          total_steps: req.total_steps,
          requester_email: req.requester_email,
          doa_level: req.doa_level,
        }
      })

      // ── Catalog: pending ───────────────────────────────────────────────────
      const { data: pendingCatalog } = await supabase
        .from('catalog_requests')
        .select('id, request_number, catalog_slug, title, form_data, instance, requester_email, status, current_stage_id, created_at')
        .contains('current_approver_emails', [user?.email])
        .in('status', ['in_progress', 'in_fulfilment'])
        .order('created_at', { ascending: false })

      const pendingCatalogCombined: ApprovalRequest[] = (pendingCatalog || []).map((req: any) => {
        const nonSkipped = (req.instance?.stages ?? []).filter((s: any) => s.status !== 'skipped')
        const stageIndex = nonSkipped.findIndex((s: any) => s.id === req.current_stage_id)
        const stage = nonSkipped[stageIndex]
        return {
          id: `cat-pending-${req.id}`,
          request_id: req.id,
          approver_email: user?.email || '',
          action: 'pending',
          comments: '',
          created_at: req.created_at,
          request_number: req.request_number,
          title: req.title,
          description: String(req.form_data?.justification ?? req.form_data?.description ?? ''),
          amount: typeof req.form_data?.amount === 'number' ? req.form_data.amount : 0,
          currency: String(req.form_data?.currency ?? 'USD'),
          budget_type: req.catalog_slug,
          business_unit: String(req.form_data?.business_unit ?? req.catalog_slug ?? ''),
          status: 'Pending',
          current_step: stageIndex >= 0 ? stageIndex + 1 : 1,
          total_steps: nonSkipped.length,
          requester_email: req.requester_email,
          doa_level: stage?.name ?? '',
          source: 'catalog' as const,
        }
      })

      // ── Funding: actioned ──────────────────────────────────────────────────
      const { data: actionedActions, error: actionedErr } = await supabase
        .from('approval_actions')
        .select('id, request_id, approver_email, action, comments, created_at')
        .eq('approver_email', user?.email)
        .in('action', ['approved', 'rejected', 'returned'])
        .order('created_at', { ascending: false })

      if (actionedErr) throw actionedErr

      const actionedRequestIds = (actionedActions || []).map(a => a.request_id)
      let actionedRequests: any[] = []
      if (actionedRequestIds.length > 0) {
        const { data: ar } = await supabase
          .from('funding_requests')
          .select('id, request_number, title, description, amount, currency, budget_type, business_unit, status, current_step, total_steps, requester_email, doa_level')
          .in('id', actionedRequestIds)
        actionedRequests = ar || []
      }

      const actionedFunding: ApprovalRequest[] = (actionedActions || [])
        .map(action => {
          const req = actionedRequests.find(r => r.id === action.request_id)
          if (!req) return null
          return {
            id: action.id,
            request_id: action.request_id,
            approver_email: action.approver_email,
            action: action.action,
            comments: action.comments || '',
            created_at: action.created_at,
            request_number: req.request_number,
            title: req.title,
            description: req.description,
            amount: req.amount,
            currency: req.currency,
            budget_type: req.budget_type,
            business_unit: req.business_unit,
            status: req.status,
            current_step: req.current_step,
            total_steps: req.total_steps,
            requester_email: req.requester_email,
            doa_level: req.doa_level,
          }
        })
        .filter(Boolean) as ApprovalRequest[]

      // ── Catalog: actioned ──────────────────────────────────────────────────
      const { data: catalogEvents } = await supabase
        .from('request_events')
        .select('request_id, data, created_at')
        .eq('actor_email', user?.email)
        .eq('event_type', 'approval.recorded')
        .order('created_at', { ascending: false })

      const catalogActionedIds = [...new Set((catalogEvents || []).map((e: any) => e.request_id))]
      let actionedCatalogRows: any[] = []
      if (catalogActionedIds.length > 0) {
        const { data: ar } = await supabase
          .from('catalog_requests')
          .select('id, request_number, catalog_slug, title, form_data, instance, requester_email, status, current_stage_id, created_at')
          .in('id', catalogActionedIds)
        actionedCatalogRows = ar || []
      }

      const actionedCatalog: ApprovalRequest[] = actionedCatalogRows.map((req: any) => {
        const event = (catalogEvents || []).find((e: any) => e.request_id === req.id)
        const decision = (event?.data as any)?.decision || 'approved'
        const nonSkipped = (req.instance?.stages ?? []).filter((s: any) => s.status !== 'skipped')
        return {
          id: `cat-actioned-${req.id}`,
          request_id: req.id,
          approver_email: user?.email || '',
          action: decision,
          comments: (event?.data as any)?.comments || '',
          created_at: event?.created_at || req.created_at,
          request_number: req.request_number,
          title: req.title,
          description: String(req.form_data?.justification ?? req.form_data?.description ?? ''),
          amount: typeof req.form_data?.amount === 'number' ? req.form_data.amount : 0,
          currency: String(req.form_data?.currency ?? 'USD'),
          budget_type: req.catalog_slug,
          business_unit: String(req.form_data?.business_unit ?? req.catalog_slug ?? ''),
          status: req.status,
          current_step: nonSkipped.length,
          total_steps: nonSkipped.length,
          requester_email: req.requester_email,
          doa_level: '',
          source: 'catalog' as const,
        }
      })

      setApprovals([...pendingFunding, ...pendingCatalogCombined, ...actionedFunding, ...actionedCatalog])
    } catch (err) {
      toast.error('Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }

  // Advance workflow to next approver, notifying them by email.
  // On final approval, notify the requester.
  const advanceWorkflow = async (
    requestId: string,
    currentStep: number,
    totalSteps: number,
    approverDisplayName: string
  ) => {
    const nextStep = currentStep + 1

    if (nextStep > totalSteps) {
      // All steps done — fully approved
      const { error: updateError } = await supabase
        .from('funding_requests')
        .update({ status: 'Approved', current_step: nextStep, current_approver_email: null })
        .eq('id', requestId)
        .eq('current_step', currentStep)
      if (updateError) throw updateError

      // Notify requester of full approval
      const { data: req } = await supabase
        .from('funding_requests')
        .select('request_number, title, amount, currency, requester_email, doa_level')
        .eq('id', requestId)
        .single()

      if (req?.requester_email) {
        supabase.functions.invoke('send-approval-email', {
          body: {
            notificationType: 'status_update',
            requestId,
            requestNumber: req.request_number,
            requestTitle: req.title,
            requestAmount: req.amount,
            requestCurrency: req.currency,
            requesterEmail: req.requester_email,
            newStatus: 'approved',
            approverName: approverDisplayName,
            totalSteps,
          },
        }).catch(() => {})
      }
    } else {
      // Fetch chain to find next approver
      const { data: req, error: fetchError } = await supabase
        .from('funding_requests')
        .select('approval_chain, request_number, title, amount, currency, requester_email, doa_level, description')
        .eq('id', requestId)
        .single()
      if (fetchError) throw fetchError

      const chain: any[] = req.approval_chain || []
      const nextApproverEntry = chain[nextStep - 1]
      const nextApprover = nextApproverEntry?.email
      const nextNextEntry = chain[nextStep]  // entry after the next approver

      const { error: updateError } = await supabase
        .from('funding_requests')
        .update({ current_step: nextStep, current_approver_email: nextApprover })
        .eq('id', requestId)
        .eq('current_step', currentStep)
      if (updateError) throw updateError

      if (nextApprover) {
        supabase.functions.invoke('send-approval-email', {
          body: {
            notificationType: 'approval_request',
            requestId,
            requestNumber: req.request_number,
            requestTitle: req.title,
            requestAmount: req.amount,
            requestCurrency: req.currency,
            requesterEmail: req.requester_email || '',
            doaLevel: req.doa_level || '',
            description: req.description || '',
            previousApprover: approverDisplayName,
            totalSteps,
            approvers: [{
              email: nextApprover,
              role: nextApproverEntry?.name || 'Approver',
              step: nextStep,
              nextApprover: nextNextEntry?.name || null,
            }],
          },
        }).catch(() => {})
      }
    }
  }

  const handleDecision = async () => {
    if (!selectedRequest) return

    setSubmitting(true)
    try {
      // ── Catalog request: delegate to the workflow engine ───────────────────
      if (selectedRequest.source === 'catalog') {
        const { request } = await getCatalogRequest(selectedRequest.request_id)
        await decideCatalogRequest({
          request,
          decision: decisionAction,
          actorEmail: user!.email!,
          comments: decisionComments || undefined,
        })
        const label = decisionAction === 'approved' ? 'approved' : decisionAction === 'rejected' ? 'rejected' : 'returned'
        toast.success(`Request ${label} successfully`)
        fetchApprovals()
        setShowDecisionDialog(false)
        setDecisionComments('')
        setSelectedRequest(null)
        return
      }

      // ── Funding request: legacy approval_actions flow ──────────────────────
      const { error: updateError } = await supabase
        .from('approval_actions')
        .update({ action: decisionAction, comments: decisionComments })
        .eq('id', selectedRequest.id)
        .eq('approver_email', user!.email!)
      if (updateError) throw updateError

      const approverDisplayName = profile?.full_name || user?.email || 'Approver'

      if (decisionAction === 'approved') {
        await advanceWorkflow(
          selectedRequest.request_id,
          selectedRequest.current_step || 1,
          selectedRequest.total_steps || 0,
          approverDisplayName
        )
      } else if (decisionAction === 'rejected') {
        await supabase.from('funding_requests')
          .update({ status: 'Rejected', current_approver_email: null })
          .eq('id', selectedRequest.request_id)
        await supabase.from('approval_actions')
          .update({ action: 'cancelled' })
          .eq('request_id', selectedRequest.request_id)
          .eq('action', 'pending')
          .neq('id', selectedRequest.id)

        if (selectedRequest.requester_email) {
          supabase.functions.invoke('send-approval-email', {
            body: {
              notificationType: 'status_update',
              requestId: selectedRequest.request_id,
              requestNumber: selectedRequest.request_number,
              requestTitle: selectedRequest.title,
              requestAmount: selectedRequest.amount,
              requestCurrency: selectedRequest.currency,
              requesterEmail: selectedRequest.requester_email,
              newStatus: 'rejected',
              approverName: approverDisplayName,
              comments: decisionComments || undefined,
              approvalStep: selectedRequest.current_step,
              totalSteps: selectedRequest.total_steps,
            },
          }).catch(() => {})
        }
      } else if (decisionAction === 'returned') {
        await supabase.from('funding_requests')
          .update({ status: 'Returned', current_approver_email: null })
          .eq('id', selectedRequest.request_id)
        await supabase.from('approval_actions')
          .update({ action: 'cancelled' })
          .eq('request_id', selectedRequest.request_id)
          .eq('action', 'pending')
          .neq('id', selectedRequest.id)

        if (selectedRequest.requester_email) {
          supabase.functions.invoke('send-approval-email', {
            body: {
              notificationType: 'status_update',
              requestId: selectedRequest.request_id,
              requestNumber: selectedRequest.request_number,
              requestTitle: selectedRequest.title,
              requestAmount: selectedRequest.amount,
              requestCurrency: selectedRequest.currency,
              requesterEmail: selectedRequest.requester_email,
              newStatus: 'returned',
              approverName: approverDisplayName,
              comments: decisionComments || undefined,
              approvalStep: selectedRequest.current_step,
              totalSteps: selectedRequest.total_steps,
            },
          }).catch(() => {})
        }
      }

      const label = decisionAction === 'approved' ? 'approved' : decisionAction === 'rejected' ? 'rejected' : 'returned'
      toast.success(`Request ${label} successfully`)
      fetchApprovals()
      setShowDecisionDialog(false)
      setDecisionComments('')
      setSelectedRequest(null)
    } catch (err) {
      toast.error('Failed to submit decision')
    } finally {
      setSubmitting(false)
    }
  }

  const getDaysPending = (createdAt: string) => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
    return days
  }

  const getPriorityColor = (days: number) => {
    if (days > 7) return 'text-red-600 bg-red-50'
    if (days > 3) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const openDecisionDialog = (request: ApprovalRequest, action: 'approved' | 'rejected' | 'returned') => {
    setSelectedRequest(request)
    setDecisionAction(action)
    setShowDecisionDialog(true)
  }

  const pendingApprovals  = approvals.filter(a => a.action === 'pending')
  const actionedApprovals = approvals.filter(a => a.action !== 'pending')

  const ApprovalCard = ({ approval }: { approval: ApprovalRequest }) => {
    const daysPending = getDaysPending(approval.created_at)
    const isPending   = approval.action === 'pending'
    const progress    = approval.current_step && approval.total_steps
      ? `${approval.current_step}/${approval.total_steps}`
      : '1/1'

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className={`w-1.5 flex-shrink-0 rounded-full ${
              isPending                        ? 'bg-yellow-500' :
              approval.action === 'approved'   ? 'bg-green-500'  :
              approval.action === 'rejected'   ? 'bg-red-500'    : 'bg-orange-500'
            }`} />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-gray-500">{approval.request_number}</span>
                  <Badge className={
                    isPending                        ? 'bg-yellow-100 text-yellow-700' :
                    approval.action === 'approved'   ? 'bg-green-100 text-green-700'  :
                    approval.action === 'rejected'   ? 'bg-red-100 text-red-700'      : 'bg-orange-100 text-orange-700'
                  }>
                    {isPending ? 'Pending Your Approval' : approval.action.toUpperCase()}
                  </Badge>
                  {isPending && daysPending > 0 && (
                    <Badge className={getPriorityColor(daysPending)}>
                      <Clock className="w-3 h-3 mr-1" />
                      {daysPending} day{daysPending !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Building2 className="w-3 h-3" />
                  <span>{approval.business_unit}</span>
                  <span className="text-gray-300">|</span>
                  <DollarSign className="w-3 h-3" />
                  <span>{approval.currency} {approval.amount?.toLocaleString()}</span>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">{approval.title}</h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{approval.description}</p>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                <span>Step {progress}</span>
                <div className="flex-1 max-w-[200px] bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 rounded-full h-2 transition-all"
                    style={{ width: `${((approval.current_step || 1) / (approval.total_steps || 1)) * 100}%` }}
                  />
                </div>
                {approval.doa_level && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {approval.doa_level}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Calendar className="w-4 h-4" />
                <span>{isPending ? 'Submitted' : 'Actioned'}: {format(new Date(approval.created_at), 'PPP')}</span>
                {approval.requester_email && (
                  <span className="text-gray-400">· by {approval.requester_email}</span>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-blue-600 border-blue-200"
                  onClick={() => navigate(approval.source === 'catalog' ? `/requests/${approval.request_id}` : `/request/${approval.request_id}`)}
                >
                  <Eye className="w-4 h-4 mr-1" /> View Details
                </Button>
                {isPending && (
                  <>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openDecisionDialog(approval, 'approved')}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openDecisionDialog(approval, 'rejected')}>
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDecisionDialog(approval, 'returned')}>
                      <RotateCcw className="w-4 h-4 mr-1" /> Return
                    </Button>
                  </>
                )}
              </div>

              {!isPending && approval.comments && (
                <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-500">Decision Comments</p>
                  </div>
                  <p className="text-sm text-gray-700">{approval.comments}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Approvals Inbox</h1>
        <p className="text-gray-500 mt-1">Review and act on requests currently awaiting your approval</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Your Action
            {pendingApprovals.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-700">
                {pendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actioned">
            History ({actionedApprovals.length})
          </TabsTrigger>
        </TabsList>

        <div className="space-y-4">
          {activeTab === 'pending' && (
            pendingApprovals.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                  <p className="text-gray-500">No requests are currently waiting for your approval.</p>
                </CardContent>
              </Card>
            ) : (
              pendingApprovals.map(a => <ApprovalCard key={a.request_id} approval={a} />)
            )
          )}

          {activeTab === 'actioned' && (
            actionedApprovals.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No history yet</h3>
                  <p className="text-gray-500">Requests you've approved, rejected, or returned will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              actionedApprovals.map(a => <ApprovalCard key={a.id} approval={a} />)
            )
          )}
        </div>
      </Tabs>

      <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionAction === 'approved' ? 'Approve Request' :
               decisionAction === 'rejected' ? 'Reject Request' : 'Return for Correction'}
            </DialogTitle>
            <DialogDescription>{selectedRequest?.title}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              <p className="text-sm font-medium text-gray-700">Request Details</p>
              <p className="text-sm">Amount: <strong>{selectedRequest?.currency} {selectedRequest?.amount?.toLocaleString()}</strong></p>
              <p className="text-sm text-gray-500">#{selectedRequest?.request_number} · Step {selectedRequest?.current_step}/{selectedRequest?.total_steps}</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Comments {decisionAction !== 'approved' ? <span className="text-gray-400">(required for rejection/return)</span> : '(optional)'}
              </label>
              <Textarea
                rows={3}
                placeholder={
                  decisionAction === 'approved' ? 'Add any approval notes...' :
                  decisionAction === 'rejected' ? 'Provide reason for rejection...' :
                  'Provide feedback for the requester...'
                }
                value={decisionComments}
                onChange={e => setDecisionComments(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDecisionDialog(false)}>Cancel</Button>
            <Button
              onClick={handleDecision}
              disabled={submitting || (decisionAction !== 'approved' && !decisionComments.trim())}
              className={
                decisionAction === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                decisionAction === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                'bg-orange-600 hover:bg-orange-700'
              }
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm {decisionAction === 'approved' ? 'Approval' : decisionAction === 'rejected' ? 'Rejection' : 'Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
