import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Loader2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Toaster } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

import { useNewRequestData } from './useNewRequestData'
import { useNewRequestForm } from './useNewRequestForm'
import { RequestDetailsStep } from './RequestDetailsStep'
import { FinancialsStep } from './FinancialsStep'
import { AttachmentsStep } from './AttachmentsStep'
import { ApprovalChainStep } from './ApprovalChainStep'

const steps = ['Request Details', 'Financials', 'Attachments', 'Approval Chain', 'Review & Submit']

export default function NewRequest() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const {
    legalEntities,
    filteredLegalEntities,
    departments,
    businessUnits,
    doaRules,
    currencies,
    loading,
    filterEntitiesByBU,
    getDepartmentApprovers,
  } = useNewRequestData()

  const {
    currentStep, 
    submitting, 
    showConfirmDialog, 
    setShowConfirmDialog,
    error,
    files,
    capexLineItems, 
    quotationValue, 
    setQuotationValue,
    approvalComments, 
    setApprovalComments,
    formData, 
    setFormData,
    grandTotal,
    doaLevel, 
    approvalChain,
    generatingProjectNumber,
    nextStep, 
    prevStep, 
    handleSubmit,
    handleFileUpload, 
    removeFile,
    handleLineItemChange, 
    calcLineItemTotal,
  } = useNewRequestForm({
    doaRules,
    businessUnits,
    filterEntitiesByBU,
    userId: user?.id,
    userEmail: user?.email,
    legalEntities,
    departments,
    getDepartmentApprovers,
  })

  const lineItemsTotal = capexLineItems.reduce((sum, item) => sum + calcLineItemTotal(item), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <RequestDetailsStep
            formData={formData}
            setFormData={setFormData}
            departments={departments}
            businessUnits={businessUnits}
            filteredLegalEntities={filteredLegalEntities}
            generatingProjectNumber={generatingProjectNumber}
            doaLevel={doaLevel}
            totalApprovers={approvalChain.filter(s => s.required).length}
            required_by_date={formData.required_by_date}
            setRequiredByDate={(date) => setFormData({ ...formData, required_by_date: date })}
          />
        )

      case 1:
        return (
          <FinancialsStep
            capexLineItems={capexLineItems}
            quotationValue={quotationValue}
            currency={formData.currency}
            currencies={currencies}
            onCurrencyChange={(v) => setFormData({ ...formData, currency: v })}
            onLineItemChange={handleLineItemChange}
            onQuotationChange={setQuotationValue}

            calcLineItemTotal={calcLineItemTotal}
            lineItemsTotal={lineItemsTotal}
            grandTotal={grandTotal}
          />
        )

      case 2:
        return (
          <AttachmentsStep
            files={files}
            onFileUpload={handleFileUpload}
            onRemoveFile={removeFile}
          />
        )

      case 3:
        return (
          <ApprovalChainStep
            approvalChain={approvalChain}
            approvalComments={approvalComments}
            onCommentsChange={setApprovalComments}
            doaLevel={doaLevel}
            requestedAmount={grandTotal}
            currency={formData.currency}
          />
        )

      case 4:
        return (
          <Card>
            <CardHeader><CardTitle>Review & Submit</CardTitle><CardDescription>Review all details before submitting</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Request Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Title:</span><span className="font-medium">{formData.title || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Department:</span><span>{departments.find(d => d.id === formData.department_id)?.name || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Business Unit:</span><span>{businessUnits.find(bu => bu.code === formData.business_unit)?.name || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Legal Entity:</span><span>{legalEntities.find(e => e.id === formData.legal_entity_id)?.name || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Classification:</span><span>{formData.budget_type}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Required By:</span><span>{format(formData.required_by_date, 'PPP')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Project Number:</span><span className="font-mono text-xs">{formData.project_number || '-'}</span></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Financial Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Currency:</span><span>{formData.currency}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Grand Total:</span><span className="font-bold text-blue-600">{formData.currency} {grandTotal.toLocaleString()}</span></div>
                  </div>
                </div>
              </div>
              {formData.description && (<div><h3 className="font-semibold text-gray-900 mb-2">Description</h3><p className="text-sm text-gray-600">{formData.description}</p></div>)}
              {files.length > 0 && (<div><h3 className="font-semibold text-gray-900 mb-2">Attachments ({files.length})</h3><div className="flex flex-wrap gap-2">{files.map((file, idx) => (<span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">{file.name}</span>))}</div></div>)}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Approval Chain</h3>
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <p className="text-sm text-gray-600">DoA Level: <strong>{doaLevel}</strong></p>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 font-medium">Required approvers:</span>
                    {approvalChain.filter(s => s.required).map((step, idx) => (
                      <div key={step.step} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-4">{idx + 1}.</span>
                        <span className="text-sm font-medium text-blue-700">{step.name}</span>
                        {step.email && <span className="text-xs text-gray-500">— {step.email}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      default: return null
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      <Toaster position="top-right" />

      {/* Page heading */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">New CAPEX Request</h1>
        <p className="text-gray-500 mt-1 text-sm sm:text-base">SEACOM Capital &amp; Operating Expenditure Approval Portal</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
              index < currentStep ? 'bg-blue-600 text-white' :
              index === currentStep ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
              'bg-gray-200 text-gray-500'
            )}>
              {index + 1}
            </div>
            <span className={cn(
              'text-xs sm:text-sm whitespace-nowrap hidden xs:inline',
              index <= currentStep ? 'text-gray-900 font-medium' : 'text-gray-400'
            )}>
              {step}
            </span>
            {index < steps.length - 1 && (
              <div className={cn('h-0.5 w-4 sm:w-8 mx-0.5', index < currentStep ? 'bg-blue-600' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>

      {/* Current step label on mobile */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          Step {currentStep + 1} of {steps.length}
          <span className="ml-2 font-medium text-gray-700 sm:hidden">— {steps[currentStep]}</span>
        </span>
      </div>

      {error && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>)}
      {renderStep()}
      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>Back</Button>
        {currentStep === steps.length - 1
          ? <Button onClick={() => setShowConfirmDialog(true)} className="bg-blue-600 hover:bg-blue-700">Submit Request</Button>
          : <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700">Next</Button>
        }
      </div>
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Submission</DialogTitle><DialogDescription>Submit <strong>"{formData.title}"</strong> for {formData.currency} {grandTotal.toLocaleString()}?<br />This will route to: {approvalChain.filter(s => s.required).map(s => s.name).join(' → ')}.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button><Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">{submitting ? 'Submitting...' : 'Confirm & Submit'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
