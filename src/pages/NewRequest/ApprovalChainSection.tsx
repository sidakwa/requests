import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, XCircle, Mail, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'
import { ApprovalStep, FormData } from './useNewRequestForm'

interface ApprovalChainSectionProps {
  approvalChain: ApprovalStep[]
  approvalComments: string
  onCommentsChange: (val: string) => void
  doaLevel: string
  // Review props (step 4 only)
  isReview?: boolean
  formData?: FormData
  departments?: { id: string; name: string }[]
  files?: File[]
  grandTotal?: number
}

// DoA level badge colour
const doaBadgeStyle = (level: string) => {
  if (level.includes('Level 4') || level.includes('Board')) return 'bg-red-100 text-red-700 border-red-200'
  if (level.includes('Level 3') || level.includes('Chief'))  return 'bg-orange-100 text-orange-700 border-orange-200'
  if (level.includes('Level 2') || level.includes('Head'))   return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  return 'bg-green-100 text-green-700 border-green-200'
}

export function ApprovalChainSection({
  approvalChain,
  approvalComments,
  onCommentsChange,
  doaLevel,
  isReview = false,
  formData,
  departments = [],
  files = [],
  grandTotal = 0,
}: ApprovalChainSectionProps) {
  const requiredSteps = approvalChain.filter(s => s.required)

  return (
    <div className="space-y-4">

      {/* DoA Level banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${doaBadgeStyle(doaLevel)}`}>
        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
        <div>
          <span className="font-semibold">DoA Level: </span>{doaLevel}
          <span className="ml-3 font-normal opacity-75">
            — {requiredSteps.length} approver{requiredSteps.length !== 1 ? 's' : ''} required
          </span>
        </div>
      </div>

      {/* Approval Chain Card */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Chain</CardTitle>
          <CardDescription>
            Routing based on amount, currency and department
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {approvalChain.map((step, idx) => {
              const isLast = idx === approvalChain.length - 1
              return (
                <div key={step.step} className="flex items-start gap-4">

                  {/* Step number + connector line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      step.required
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}>
                      {step.step}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 h-8 mt-1 ${step.required ? 'bg-blue-200' : 'bg-gray-100'}`} />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 pb-2 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className={`font-semibold text-sm ${step.required ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.role}
                      </h4>
                      {step.required ? (
                        <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Required
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Not required
                        </span>
                      )}
                    </div>

                    {/* Approver email */}
                    {step.required && step.approver_email && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-blue-600 font-mono truncate">
                          {step.approver_email}
                        </span>
                      </div>
                    )}
                    {step.required && !step.approver_email && (
                      <p className="text-xs text-amber-600 mt-1">⚠ No approver mapped for this department</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Approval path summary */}
          <div className="mt-5 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700 font-semibold mb-1 uppercase tracking-wide">Approval path</p>
            <p className="text-sm text-blue-800">
              {requiredSteps.map(s => s.role).join(' → ')}
            </p>
            <div className="mt-2 space-y-0.5">
              {requiredSteps.map(s => (
                <p key={s.step} className="text-xs text-blue-600 font-mono">
                  Step {s.step}: {s.approver_email || s.role}
                </p>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="mt-5">
            <Label htmlFor="approval-comments">Comments for approvers</Label>
            <Textarea
              id="approval-comments"
              rows={3}
              value={approvalComments}
              onChange={e => onCommentsChange(e.target.value)}
              placeholder="Any notes or context for the approval authority..."
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Review summary — only on step 4 */}
      {isReview && formData && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Confirm</CardTitle>
            <CardDescription>Verify all details before submitting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Title</p>
                  <p className="font-medium text-gray-900 mt-0.5">{formData.title || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Department</p>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {departments.find(d => d.id === formData.department_id)?.name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Business Unit</p>
                  <p className="font-medium text-gray-900 mt-0.5">{formData.business_unit || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Classification</p>
                  <p className="font-medium text-gray-900 mt-0.5">{formData.budget_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Project Number</p>
                  <p className="font-mono font-medium text-gray-900 mt-0.5">{formData.project_number || '—'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Amount</p>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {formData.currency} {Number(formData.amount).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">CAPEX Grand Total</p>
                  <p className="font-medium text-blue-600 mt-0.5">${grandTotal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">DoA Level</p>
                  <p className={`font-medium mt-0.5 text-sm px-2 py-0.5 rounded inline-block border ${doaBadgeStyle(doaLevel)}`}>
                    {doaLevel}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Required By</p>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {format(formData.required_by_date, 'PPP')}
                  </p>
                </div>
                {files.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Attachments</p>
                    <p className="font-medium text-gray-900 mt-0.5">{files.length} file(s)</p>
                  </div>
                )}
              </div>
            </div>

            {formData.description && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Description</p>
                <p className="text-sm text-gray-700">{formData.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
