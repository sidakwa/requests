// Catalog request detail: "where is my request" timeline, submitted data,
// the immutable audit trail, and approve/reject/return actions when the
// signed-in user is a pending approver on the active stage.

import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  CircleDot,
  CornerUpLeft,
  MinusCircle,
  X,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { RuntimeStage } from '@/engine'
import {
  CatalogRequestRow,
  RequestEventRow,
  decideCatalogRequest,
  getCatalogRequest,
} from '@/api/platformApi'

const STATUS_BADGE: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  in_fulfilment: 'bg-indigo-100 text-indigo-700',
  approved: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  returned: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

const STATUS_LABEL: Record<string, string> = {
  in_progress: 'In Progress',
  in_fulfilment: 'In Fulfilment',
  approved: 'Approved',
  completed: 'Completed',
  rejected: 'Rejected',
  returned: 'Returned for Revision',
  cancelled: 'Cancelled',
}

export default function CatalogRequestDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [request, setRequest] = useState<CatalogRequestRow | null>(null)
  const [events, setEvents] = useState<RequestEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState('')
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const { request: row, events: rows } = await getCatalogRequest(id)
      setRequest(row)
      setEvents(rows)
    } catch (err) {
      toast.error('Failed to load request: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const myEmail = user?.email?.toLowerCase()
  const currentStageId = request?.current_stage_id
  const activeStage = request?.instance.stages.find(s => s.id === currentStageId)
  const myPendingApproval = activeStage?.approvers.find(
    a => a.email.toLowerCase() === myEmail && a.decision === 'pending'
  )

  const decide = async (decision: 'approved' | 'rejected' | 'returned') => {
    if (!request) return
    if ((decision === 'rejected' || decision === 'returned') && !comments.trim()) {
      toast.error('Please add a comment explaining your decision')
      return
    }
    setActing(true)
    try {
      await decideCatalogRequest({
        request,
        decision,
        actorEmail: user!.email!,
        comments: comments.trim() || undefined,
      })
      toast.success(`Request ${decision}`)
      setComments('')
      await load()
    } catch (err) {
      toast.error('Action failed: ' + (err as Error).message)
    } finally {
      setActing(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>
  if (!request) {
    return (
      <div className="text-sm text-gray-500">
        Request not found. <Link className="text-blue-600" to="/catalog">Back to catalog</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link to="/my-catalog-requests" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" /> My Requests
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
          <Badge className={STATUS_BADGE[request.status] ?? ''}>{STATUS_LABEL[request.status] ?? request.status}</Badge>
        </div>
        <p className="text-sm text-gray-500 mt-1 font-mono">
          {request.request_number} · {request.workflow_slug} v{request.workflow_version} ·
          requested by {request.requester_email}
        </p>
      </div>

      {myPendingApproval && activeStage && (
        <Card className="border-blue-300 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-base">Your approval is required — {activeStage.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Comments (required for reject / return)"
              value={comments}
              onChange={e => setComments(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => decide('approved')} disabled={acting} className="bg-green-600 hover:bg-green-700">
                <Check className="w-4 h-4 mr-1" /> Approve
              </Button>
              <Button onClick={() => decide('returned')} disabled={acting || !comments.trim()} variant="outline">
                <CornerUpLeft className="w-4 h-4 mr-1" /> Return for Info
              </Button>
              <Button onClick={() => decide('rejected')} disabled={acting || !comments.trim()} variant="destructive">
                <X className="w-4 h-4 mr-1" /> Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Approval Progress</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {request.instance.stages.map(stage => <StageRow key={stage.id} stage={stage} />)}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Submitted Details</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {Object.entries(request.form_data).map(([key, value]) => (
              <div key={key}>
                <dt className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</dt>
                <dd className="text-gray-900 break-words">{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Audit Trail</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {events.map(e => (
              <li key={e.id} className="flex items-baseline gap-2">
                <span className="text-gray-400 font-mono text-xs whitespace-nowrap">
                  {new Date(e.created_at).toLocaleString()}
                </span>
                <span className="text-gray-700">
                  <span className="font-medium">{e.event_type}</span>
                  {e.stage_id && <span className="text-gray-500"> · {e.stage_id}</span>}
                  {e.actor_email && <span className="text-gray-500"> · {e.actor_email}</span>}
                  {typeof e.data?.comments === 'string' && e.data.comments && (
                    <span className="text-gray-500"> — “{e.data.comments}”</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function StageRow({ stage }: { stage: RuntimeStage }) {
  const icon = {
    approved: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    rejected: <XCircle className="w-5 h-5 text-red-600" />,
    active: <CircleDot className="w-5 h-5 text-blue-600" />,
    pending: <Circle className="w-5 h-5 text-gray-300" />,
    skipped: <MinusCircle className="w-5 h-5 text-gray-300" />,
  }[stage.status]

  return (
    <li className="flex gap-3">
      <div className="pt-0.5">{icon}</div>
      <div className={stage.status === 'skipped' ? 'opacity-50' : ''}>
        <p className="text-sm font-medium text-gray-900">
          {stage.name}
          {stage.status === 'skipped' && <span className="ml-2 text-xs text-gray-400">(not required for this request)</span>}
          {stage.status === 'active' && <span className="ml-2 text-xs text-blue-600 font-semibold">awaiting action</span>}
        </p>
        <p className="text-xs text-gray-500">
          {stage.approvers.map(a => `${a.label}: ${a.email}${a.decision !== 'pending' ? ` (${a.decision})` : ''}`).join(' · ')}
        </p>
      </div>
    </li>
  )
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}
