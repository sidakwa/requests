import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, Clock } from 'lucide-react'

export default function ApprovalsInbox() {
  const [filter, setFilter] = useState("pending")

  const mockRequests = [
    { id: 1, title: "Cloud Infrastructure Upgrade", requester: "John Smith", amount: "$45,000", status: "pending", daysWaiting: 2 },
    { id: 2, title: "Data Analytics Software License", requester: "Sarah Johnson", amount: "$12,500", status: "pending", daysWaiting: 5 },
    { id: 3, title: "Hardware Refresh Q4", requester: "Mike Chen", amount: "$78,000", status: "actioned", action: "approved", daysWaiting: 1 },
  ]

  const filteredRequests = mockRequests.filter(req => 
    filter === "pending" ? req.status === "pending" : req.status === "actioned"
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Approvals Inbox</h1>
        <p className="text-gray-500 mt-2">Review and act on pending approval requests</p>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending <Badge variant="secondary" className="ml-2">2</Badge>
          </TabsTrigger>
          <TabsTrigger value="actioned">Already Actioned</TabsTrigger>
        </TabsList>

        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{request.title}</CardTitle>
                    <CardDescription>
                      From: {request.requester} • Amount: {request.amount}
                    </CardDescription>
                  </div>
                  {request.daysWaiting > 3 && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Action Required
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve
                  </Button>
                  <Button variant="destructive">
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button variant="outline">
                    Return for Correction
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Tabs>
    </div>
  )
}
