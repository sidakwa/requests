import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, XCircle, User, Mail, Users, AlertCircle } from 'lucide-react'

export interface ApprovalStep {
  step: number
  name: string
  email?: string
  required: boolean
}

interface ApprovalChainStepProps {
  approvalChain: ApprovalStep[]
  approvalComments: string
  onCommentsChange: (val: string) => void
  doaLevel: string
  requestedAmount: number
  currency: string
}

export function ApprovalChainStep({
  approvalChain,
  approvalComments,
  onCommentsChange,
  doaLevel,
  requestedAmount,
  currency
}: ApprovalChainStepProps) {
  const requiredSteps = approvalChain.filter(s => s.required)

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Delegation of Authority (DoA) Level</h3>
              <p className="text-2xl font-bold text-blue-700 mt-1">{doaLevel}</p>
              <p className="text-sm text-blue-600 mt-1">Amount: {currency} {requestedAmount.toLocaleString()}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3"><Users className="w-6 h-6 text-blue-600" /></div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-sm text-blue-800">This request requires <strong>{requiredSteps.length}</strong> approval(s)</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval Chain</CardTitle>
          <CardDescription>Based on the DoA level and department configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gray-200" />
            <div className="space-y-6 relative">
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-green-600" /></div>
                <div className="flex-1"><h4 className="font-semibold text-gray-900">Requester</h4><p className="text-sm text-gray-500 mt-0.5">Request submitted for approval</p></div>
              </div>
              {approvalChain.map((step, idx) => {
                const isCurrent = step.required && idx === 0
                return (
                  <div key={step.step} className="flex items-start gap-4 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.required ? (isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400') : 'bg-gray-100 text-gray-400'}`}>
                      {step.required ? (isCurrent ? <Clock className="w-4 h-4" /> : <Clock className="w-4 h-4" />) : <XCircle className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={`font-semibold ${step.required ? 'text-gray-900' : 'text-gray-400'}`}>{step.name}</h4>
                          {step.email && step.required && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{step.email}</p>
                          )}
                        </div>
                        {step.required ? (isCurrent ? <Badge className="bg-blue-100 text-blue-700"><Clock className="w-3 h-3 mr-1" /> Current</Badge> : <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>) : <Badge variant="outline" className="text-gray-400">Not required</Badge>}
                      </div>
                      {!step.required && <p className="text-sm text-gray-400 mt-1">Skipped at this DoA level</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          {requiredSteps.length > 0 && (
            <div className="mt-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium mb-1">Approval path</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-700">Requester</span>
                {requiredSteps.map((step) => (<span key={step.step} className="flex items-center gap-2"><span className="text-gray-400">→</span><span className="text-sm font-medium text-blue-600">{step.name}</span></span>))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comments for Approvers</CardTitle>
          <CardDescription>Add any notes or context that will help the approval authority</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea rows={4} value={approvalComments} onChange={e => onCommentsChange(e.target.value)} placeholder="e.g., Urgent request - please prioritise, Background information, Vendor details, etc..." />
          <div className="mt-2 flex items-start gap-2 text-xs text-gray-500"><AlertCircle className="w-3 h-3 mt-0.5" /><p>These comments will be visible to all approvers in the chain</p></div>
        </CardContent>
      </Card>
    </div>
  )
}
