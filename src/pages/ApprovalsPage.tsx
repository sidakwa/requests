import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Inbox } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface ApprovalRequest {
  id: string
  request_id: string
  approver_email: string
  status: string
  step_order: number
  created_at: string
  funding_requests?: {
    request_number: string
    title: string
    amount: number
    currency: string
    requester_email: string
    status: string
  }
}

export default function Approvals() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchApprovals()
  }, [user])

  const fetchApprovals = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // First, get all pending approval actions for this user
      const { data: actions, error: actionsError } = await supabase
        .from('approval_actions')
        .select('*')
        .eq('approver_email', user.email)
        .eq('status', 'pending')
        .order('step_order', { ascending: true })
      
      if (actionsError) {
        console.error('Error fetching approvals:', actionsError)
        toast.error('Failed to load approvals')
        setApprovals([])
        setLoading(false)
        return
      }
      
      if (!actions || actions.length === 0) {
        setApprovals([])
        setLoading(false)
        return
      }
      
      // Then get the associated funding requests
      const requestIds = actions.map(a => a.request_id)
      const { data: requests, error: requestsError } = await supabase
        .from('funding_requests')
        .select('id, request_number, title, amount, currency, requester_email, status')
        .in('id', requestIds)
      
      if (requestsError) {
        console.error('Error fetching requests:', requestsError)
        toast.error('Failed to load request details')
        setApprovals([])
        setLoading(false)
        return
      }
      
      // Combine the data
      const combined = actions.map(action => ({
        ...action,
        funding_requests: requests?.find(req => req.id === action.request_id)
      })).filter(item => item.funding_requests) // Only keep items with valid requests
      
      setApprovals(combined)
    } catch (error) {
      console.error('Error in fetchApprovals:', error)
      toast.error('Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string, approvalId: string) => {
    setProcessingId(approvalId)
    try {
      // Update the approval action status
      const { error: updateError } = await supabase
        .from('approval_actions')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', approvalId)
      
      if (updateError) throw updateError
      
      // Check if all approvals for this request are complete
      const { data: remainingApprovals } = await supabase
        .from('approval_actions')
        .select('status')
        .eq('request_id', requestId)
        .neq('status', 'approved')
      
      // If no pending approvals left, update the request status to Approved
      if (!remainingApprovals || remainingApprovals.length === 0) {
        await supabase
          .from('funding_requests')
          .update({ status: 'Approved' })
          .eq('id', requestId)
      }
      
      toast.success('Request approved successfully')
      await fetchApprovals() // Refresh the list
    } catch (error) {
      console.error('Error approving request:', error)
      toast.error('Failed to approve request')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string, approvalId: string) => {
    setProcessingId(approvalId)
    try {
      // Update the approval action status
      const { error: updateError } = await supabase
        .from('approval_actions')
        .update({ 
          status: 'rejected',
          approved_at: new Date().toISOString()
        })
        .eq('id', approvalId)
      
      if (updateError) throw updateError
      
      // Update the request status to Rejected
      await supabase
        .from('funding_requests')
        .update({ status: 'Rejected' })
        .eq('id', requestId)
      
      toast.success('Request rejected')
      await fetchApprovals() // Refresh the list
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast.error('Failed to reject request')
    } finally {
      setProcessingId(null)
    }
  }

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
        <h1 className="text-3xl font-bold text-gray-900">Approvals Inbox</h1>
        <p className="text-gray-500 mt-1">Requests pending your approval</p>
      </div>
      
      {approvals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <Inbox className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">No pending approvals</h3>
                <p className="text-gray-500 mt-1">All caught up! You have no requests waiting for your review.</p>
              </div>
              <Button onClick={() => navigate('/dashboard')} variant="outline">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {approvals.map((approval) => (
            <Card key={approval.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => navigate(`/request/${approval.request_id}`)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono text-gray-500">
                        {approval.funding_requests?.request_number}
                      </span>
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                        Pending Review
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {approval.funding_requests?.title}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Requester:</span>{' '}
                        {approval.funding_requests?.requester_email}
                      </p>
                      <p>
                        <span className="font-medium">Amount:</span>{' '}
                        <span className="font-semibold text-blue-600">
                          {approval.funding_requests?.amount?.toLocaleString()} {approval.funding_requests?.currency}
                        </span>
                      </p>
                      <p>
                        <span className="font-medium">Submitted:</span>{' '}
                        {new Date(approval.created_at).toLocaleDateString()}
                      </p>
                      <p>
                        <span className="font-medium">Approval Step:</span>{' '}
                        Step {approval.step_order}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApprove(approval.request_id, approval.id)}
                      disabled={processingId === approval.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processingId === approval.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Approve
                    </Button>
                    
                    <Button
                      onClick={() => handleReject(approval.request_id, approval.id)}
                      disabled={processingId === approval.id}
                      variant="destructive"
                    >
                      {processingId === approval.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
