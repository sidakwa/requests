import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, AlertCircle, Send, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from 'sonner'
import { format } from 'date-fns'

interface RequestData {
  id: string
  request_number: string
  title: string
  description: string
  amount: number
  currency: string
  budget_type: string
  status: string
  doa_level: string
  approval_chain: any[]
  required_by_date: string
  department_id: string
  business_unit: string
  legal_entity_id: string
  segment: string
  project_number: string
  quotation_value: number
  line_items: any[]
  amount_usd: number
  current_step: number
  total_steps: number
}

export default function EditRequest() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [request, setRequest] = useState<RequestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [requiredByDate, setRequiredByDate] = useState('')

  useEffect(() => {
    if (id) fetchRequest()
  }, [id])

  const fetchRequest = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('funding_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      if (data.requester_email !== user?.email) {
        toast.error('You can only edit your own requests')
        navigate('/my-requests')
        return
      }

      if (!['Rejected', 'Returned'].includes(data.status)) {
        toast.error('Only rejected or returned requests can be edited')
        navigate(`/request/${id}`)
        return
      }

      setRequest(data)
      setTitle(data.title)
      setDescription(data.description || '')
      setRequiredByDate(data.required_by_date || '')
    } catch (err) {
      toast.error('Failed to load request')
      navigate('/my-requests')
    } finally {
      setLoading(false)
    }
  }

  const handleResubmit = async () => {
    if (!request || !title.trim()) {
      setError('Title is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Reset the funding request back to Pending at step 1.
      // requester_email filter prevents updating another user's request even if ID is guessed.
      const { error: updateError } = await supabase
        .from('funding_requests')
        .update({
          title: title.trim(),
          description: description.trim(),
          required_by_date: requiredByDate || null,
          status: 'Pending',
          current_step: 1,
          current_approver_email: request.approval_chain?.[0]?.email || null,
        })
        .eq('id', request.id)
        .eq('requester_email', user!.email!)

      if (updateError) throw updateError

      // Reset all approval actions back to pending so the chain restarts.
      // Scoped to the request; RLS on approval_actions enforces further access control.
      const { error: actionsError } = await supabase
        .from('approval_actions')
        .update({ action: 'pending', comments: null })
        .eq('request_id', request.id)

      if (actionsError) throw actionsError

      toast.success('Request resubmitted successfully')
      setTimeout(() => navigate('/my-requests'), 1500)
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message)
      toast.error('Resubmission failed: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!request) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <Toaster position="top-right" />

      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(`/request/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Edit & Resubmit</h1>
            <Badge className={request.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}>
              {request.status === 'Rejected' ? 'Rejected' : 'Returned for Revision'}
            </Badge>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">{request.request_number}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Previous rejection reason */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4 flex gap-3 items-start">
          <RotateCcw className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-orange-900">This request was {request.status.toLowerCase()}</p>
            <p className="text-sm text-orange-700 mt-0.5">
              Review any approver comments in the request history before resubmitting.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
          <CardDescription>Update the details below and resubmit for approval</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Request title"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the purpose of this request..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="required_by">Required By Date</Label>
            <Input
              id="required_by"
              type="date"
              value={requiredByDate}
              onChange={e => setRequiredByDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Read-only summary of unchanged financial details */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-base text-gray-700">Financial Details (unchanged)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Amount:</span> <span className="font-medium">{request.currency} {request.amount.toLocaleString()}</span></div>
            <div><span className="text-gray-500">Budget Type:</span> <span className="font-medium">{request.budget_type}</span></div>
            <div><span className="text-gray-500">Project Number:</span> <span className="font-mono text-xs">{request.project_number}</span></div>
            <div><span className="text-gray-500">DoA Level:</span> <span className="font-medium">{request.doa_level || '—'}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Approval chain that will be restarted */}
      {request.approval_chain?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval chain on resubmission</CardTitle>
            <CardDescription>The full chain will restart from step 1</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {request.approval_chain.map((step: any, i: number) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-gray-400">→</span>}
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">{step.name} <span className="text-blue-400">({step.email})</span></span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={() => navigate(`/request/${id}`)}>Cancel</Button>
        <Button onClick={handleResubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          {submitting ? 'Resubmitting…' : 'Resubmit for Approval'}
        </Button>
      </div>
    </div>
  )
}
