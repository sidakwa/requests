import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Upload, FileText, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const steps = ['Request Details', 'CAPEX Details', 'Review & Submit']

export default function NewRequest() {
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    executive_summary: '',
    scope_of_work: '',
    department: '',
    business_unit: '',
    legal_entity_id: '',
    currency: 'USD',
    amount: 0,
    cost_centre: '',
    gl_code: '',
    vendor: '',
    budget_type: 'OPEX',
    budget_status: 'Pending',
    required_by_date: new Date(),
    capex_category: '',
    capex_type: '',
    segment: '',
    cxo_function: '',
    head_of_department: '',
    project_number: '',
    start_date: new Date(),
    completion_date: new Date(),
    attachments: [] as File[]
  })

  const [legalEntities, setLegalEntities] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])

  useEffect(() => {
    fetchLegalEntities()
    fetchDepartments()
  }, [])

  const fetchLegalEntities = async () => {
    const { data } = await supabase.from('legal_entities').select('*').order('name')
    if (data) setLegalEntities(data)
  }

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('*')
    if (data) setDepartments(data)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...Array.from(e.target.files!)] }))
    }
  }

  const handleSubmit = async () => {
    if (!user) return
    
    setSubmitting(true)
    
    try {
      // Generate request number
      const year = new Date().getFullYear()
      const { count } = await supabase.from('requests').select('*', { count: 'exact', head: true })
      const requestNumber = `FR-${year}-${String((count || 0) + 1).padStart(3, '0')}`
      
      // Insert request
      const { data: request, error } = await supabase.from('requests').insert({
        request_number: requestNumber,
        title: formData.title,
        description: formData.description,
        category: formData.budget_type === 'CAPEX' ? 'procurement' : 'budget',
        priority: 'medium',
        status: 'submitted',
        submitted_by: user.id,
        total_amount: formData.amount,
        currency: formData.currency,
        due_date: formData.required_by_date,
        business_unit: formData.business_unit,
        legal_entity_id: formData.legal_entity_id || null,
        department_id: formData.department || null,
        metadata: {
          executive_summary: formData.executive_summary,
          scope_of_work: formData.scope_of_work,
          cost_centre: formData.cost_centre,
          gl_code: formData.gl_code,
          vendor: formData.vendor,
          budget_status: formData.budget_status,
          capex_category: formData.capex_category,
          capex_type: formData.capex_type,
          segment: formData.segment,
          cxo_function: formData.cxo_function,
          head_of_department: formData.head_of_department,
          project_number: formData.project_number,
          start_date: formData.start_date,
          completion_date: formData.completion_date
        },
        submitted_at: new Date().toISOString()
      }).select().single()
      
      if (error) throw error
      
      // Navigate to the new request
      navigate(`/request/${request.id}`)
    } catch (err) {
      console.error('Error submitting request:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">New Funding Request</h1>
        <p className="text-gray-500 mt-1">SEACOM Capital & Operating Expenditure Approval Portal</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              index <= currentStep ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
            )}>
              {index + 1}
            </div>
            <span className={cn(
              "ml-2 text-sm",
              index <= currentStep ? "text-gray-900 font-medium" : "text-gray-400"
            )}>
              {step}
            </span>
            {index < steps.length - 1 && <div className="w-16 h-px bg-gray-200 mx-4" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep]}</CardTitle>
          <CardDescription>Step {currentStep + 1} of {steps.length}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Request Details */}
          {currentStep === 0 && (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Request Title *</Label>
                  <Input 
                    placeholder="e.g. Fibre Backbone Upgrade – KZN" 
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Executive Summary *</Label>
                  <Textarea 
                    placeholder="High-level overview..."
                    className="min-h-[80px]"
                    value={formData.executive_summary}
                    onChange={(e) => handleInputChange('executive_summary', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Detailed Justification *</Label>
                  <Textarea 
                    placeholder="Business case and rationale..."
                    className="min-h-[100px]"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Brief Scope of Work</Label>
                  <Textarea 
                    placeholder="Work to be performed..."
                    className="min-h-[80px]"
                    value={formData.scope_of_work}
                    onChange={(e) => handleInputChange('scope_of_work', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Department *</Label>
                    <Select onValueChange={(v) => handleInputChange('department', v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Legal Entity *</Label>
                    <Select onValueChange={(v) => handleInputChange('legal_entity_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Select entity..." /></SelectTrigger>
                      <SelectContent>
                        {legalEntities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Business Unit *</Label>
                    <RadioGroup 
                      value={formData.business_unit}
                      onValueChange={(v) => handleInputChange('business_unit', v)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="DI" id="di" />
                        <Label htmlFor="di">DI – Digital Infrastructure</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="DS" id="ds" />
                        <Label htmlFor="ds">DS – Digital Services</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label>Currency *</Label>
                    <Select value={formData.currency} onValueChange={(v) => handleInputChange('currency', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD US Dollar ($)</SelectItem>
                        <SelectItem value="ZAR">ZAR South African Rand (R)</SelectItem>
                        <SelectItem value="EUR">EUR Euro (€)</SelectItem>
                        <SelectItem value="GBP">GBP British Pound (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Amount (USD) *</Label>
                    <Input 
                      type="number" 
                      placeholder="$ 0" 
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Cost Centre *</Label>
                    <Input 
                      placeholder="CC-ENG-001"
                      value={formData.cost_centre}
                      onChange={(e) => handleInputChange('cost_centre', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>GL Code *</Label>
                    <Input 
                      placeholder="GL-4200"
                      value={formData.gl_code}
                      onChange={(e) => handleInputChange('gl_code', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Vendor / Supplier *</Label>
                    <Input 
                      placeholder="e.g. Huawei Technologies SA"
                      value={formData.vendor}
                      onChange={(e) => handleInputChange('vendor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Classification *</Label>
                    <RadioGroup 
                      value={formData.budget_type}
                      onValueChange={(v) => handleInputChange('budget_type', v)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="CAPEX" id="capex" />
                        <Label htmlFor="capex">CAPEX</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="OPEX" id="opex" />
                        <Label htmlFor="opex">OPEX</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label>Budget Status *</Label>
                    <Select value={formData.budget_status} onValueChange={(v) => handleInputChange('budget_status', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Approved">Budget Approved</SelectItem>
                        <SelectItem value="Pending">Budget Pending Confirmation</SelectItem>
                        <SelectItem value="Not in Budget">Not in Budget</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Required By Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.required_by_date ? format(formData.required_by_date, "PPP") : "yyyy/mm/dd"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Calendar 
                        mode="single" 
                        selected={formData.required_by_date} 
                        onSelect={(date) => date && handleInputChange('required_by_date', date)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Attachments</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Drag & drop files here or click to browse</p>
                    <Input type="file" multiple className="hidden" id="file-upload" onChange={handleFileUpload} />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('file-upload')?.click()}>
                      Select Files
                    </Button>
                    {formData.attachments.length > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        {formData.attachments.length} file(s) selected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 2: CAPEX Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-800">CAPEX Details (Optional)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CAPEX Category</Label>
                  <Select onValueChange={(v) => handleInputChange('capex_category', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="infrastructure">Infrastructure</SelectItem>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="hardware">Hardware</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>CAPEX Type</Label>
                  <Select onValueChange={(v) => handleInputChange('capex_type', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="replacement">Replacement</SelectItem>
                      <SelectItem value="upgrade">Upgrade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Segment</Label>
                  <Input placeholder="Segment" onChange={(e) => handleInputChange('segment', e.target.value)} />
                </div>
                <div>
                  <Label>CXO Function</Label>
                  <Select onValueChange={(v) => handleInputChange('cxo_function', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cto">CTO</SelectItem>
                      <SelectItem value="cfo">CFO</SelectItem>
                      <SelectItem value="coo">COO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Head of Department</Label>
                <Input placeholder="Name" onChange={(e) => handleInputChange('head_of_department', e.target.value)} />
              </div>

              <div>
                <Label>Project No.</Label>
                <Input placeholder="PRJ - 2026 - XXX" onChange={(e) => handleInputChange('project_number', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date ? format(formData.start_date, "yyyy/mm/dd") : "yyyy/mm/dd"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Calendar mode="single" selected={formData.start_date} onSelect={(date) => date && handleInputChange('start_date', date)} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Completion Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.completion_date ? format(formData.completion_date, "yyyy/mm/dd") : "yyyy/mm/dd"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Calendar mode="single" selected={formData.completion_date} onSelect={(date) => date && handleInputChange('completion_date', date)} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 inline mr-2" />
                <span className="text-green-800">Please review your request details before submitting</span>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">{formData.title || 'Untitled Request'}</h3>
                <p className="text-sm text-gray-600">{formData.description}</p>
                <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                  <div><span className="text-gray-500">Amount:</span> {formData.currency} {formData.amount.toLocaleString()}</div>
                  <div><span className="text-gray-500">Type:</span> {formData.budget_type}</div>
                  <div><span className="text-gray-500">Business Unit:</span> {formData.business_unit}</div>
                  <div><span className="text-gray-500">Required By:</span> {format(formData.required_by_date, "PPP")}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
          Previous
        </Button>
        {currentStep === steps.length - 1 ? (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        ) : (
          <Button onClick={nextStep}>Next</Button>
        )}
      </div>
    </div>
  )
}
