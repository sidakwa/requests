import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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
      if (!user) return
      
      const { data, error } = await supabase
        .from('funding_requests')
        .select('id, request_number, title, amount, currency, status, created_at')
        .eq('requester_email', user.email)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setRequests(data)
      }
      setLoading(false)
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Requests</h1>
        <p className="text-gray-500">View all your submitted funding requests</p>
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
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{req.amount.toLocaleString()} {req.currency}</p>
                    <p className={`text-sm ${req.status === 'Approved' ? 'text-green-600' : req.status === 'Pending' ? 'text-yellow-600' : 'text-gray-600'}`}>
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
