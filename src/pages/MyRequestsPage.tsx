import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface FundingRequest {
  id: string
  request_number: string
  title: string
  amount: number
  currency: string
  status: string
  created_at: string
}

export default function MyRequests() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<FundingRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMyRequests = async () => {
      if (!user) {
        console.log("📭 No user yet, skipping fetch")
        setLoading(false)
        return
      }

      console.log("🔍 Fetching requests for email:", user.email)

      try {
        const { data, error } = await supabase
          .from('funding_requests')
          .select('id, request_number, title, amount, currency, status, created_at')
          .eq('requester_email', user.email)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('❌ MyRequests error:', error)
          toast.error('Failed to load your requests')
        } else {
          console.log('✅ MyRequests data received:', data?.length || 0, 'records')
          setRequests(data || [])
        }
      } catch (err) {
        console.error('❌ Unexpected error:', err)
        toast.error('An error occurred while loading your requests')
      } finally {
        setLoading(false)
      }
    }

    fetchMyRequests()
  }, [user])

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Requests</h1>
        <p className="text-gray-500 mt-1">View all your submitted funding requests</p>
      </div>
      
      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">You haven't submitted any requests yet</p>
            <Button onClick={() => navigate('/new-request')} className="mt-4">
              Create Your First Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="cursor-pointer hover:shadow-md" onClick={() => navigate(`/request/${req.id}`)}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">{req.request_number}</p>
                    <h3 className="font-semibold mt-1">{req.title}</h3>
                    <p className="text-sm text-gray-600 mt-2">
                      Submitted: {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{req.amount.toLocaleString()} {req.currency}</p>
                    <p className={`text-sm ${
                      req.status === 'Approved' ? 'text-green-600' : 
                      req.status === 'Pending' ? 'text-yellow-600' : 
                      'text-gray-600'
                    }`}>
                      {req.status}
                    </p>
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
