import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function ViewRequest() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Request #REQ-2024-001</h1>
          <p className="text-gray-500 mt-1">Submitted on Dec 15, 2024</p>
        </div>
        <Badge className="bg-yellow-500">Pending Approval</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Title</p>
              <p className="font-medium">Cloud Infrastructure Upgrade</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-medium">$45,000 USD</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Department</p>
              <p className="font-medium">Digital Innovation (DI)</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Classification</p>
              <p className="font-medium">CAPEX</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Business Justification</p>
            <p className="mt-1">Infrastructure upgrade required to support growing AI/ML workloads and improve system performance by 40%.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded">
              <span>1. Requester</span>
              <span>John Smith</span>
              <Badge className="bg-green-500">✓ Approved</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
              <span>2. Line Manager</span>
              <span>Sarah Johnson</span>
              <Badge className="bg-yellow-500">Pending</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded opacity-50">
              <span>3. Dept Head</span>
              <span>Michael Chen</span>
              <Badge>Waiting</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button variant="outline">Back</Button>
        <Button>Refresh Status</Button>
      </div>
    </div>
  )
}
