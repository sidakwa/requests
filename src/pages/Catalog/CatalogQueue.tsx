// "My Queue" — catalog requests waiting on the signed-in user, plus the
// user's own submitted catalog requests, in two tabs.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Inbox } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { CatalogRequestRow, listMyCatalogRequests, listMyQueue } from '@/api/platformApi'

const STATUS_BADGE: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  in_fulfilment: 'bg-indigo-100 text-indigo-700',
  approved: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  returned: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function CatalogQueue() {
  const { user } = useAuth()
  const [queue, setQueue] = useState<CatalogRequestRow[]>([])
  const [mine, setMine] = useState<CatalogRequestRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.email) return
    Promise.all([listMyQueue(user.email), listMyCatalogRequests(user.email)])
      .then(([q, m]) => { setQueue(q); setMine(m) })
      .catch(err => toast.error('Failed to load requests: ' + (err as Error).message))
      .finally(() => setLoading(false))
  }, [user?.email])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Catalog Requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          Requests waiting on you, and requests you have submitted through the catalog.
        </p>
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            My Queue {queue.length > 0 && <Badge className="ml-2 bg-red-100 text-red-700">{queue.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="mine">My Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <RequestList rows={queue} loading={loading} emptyText="Nothing is waiting on you. 🎉" />
        </TabsContent>
        <TabsContent value="mine">
          <RequestList rows={mine} loading={loading} emptyText="You have not submitted any catalog requests yet." />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RequestList({ rows, loading, emptyText }: { rows: CatalogRequestRow[]; loading: boolean; emptyText: string }) {
  if (loading) return <p className="text-sm text-gray-500 py-6">Loading…</p>
  if (!rows.length) {
    return (
      <div className="py-12 text-center text-gray-500">
        <Inbox className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">{emptyText}</p>
      </div>
    )
  }
  return (
    <div className="space-y-3 mt-4">
      {rows.map(row => (
        <Link key={row.id} to={`/requests/${row.id}`} className="block">
          <Card className="hover:shadow-md hover:border-blue-300 transition-all">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{row.title}</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {row.request_number} · {row.catalog_slug} · {new Date(row.created_at).toLocaleDateString()}
                  {row.current_stage_id && ` · stage: ${row.current_stage_id}`}
                </p>
              </div>
              <Badge className={STATUS_BADGE[row.status] ?? ''}>{row.status.replace('_', ' ')}</Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
