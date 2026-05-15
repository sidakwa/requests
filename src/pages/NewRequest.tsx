import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

// Form schema
const requestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Please provide detailed justification'),
  department: z.enum(['DI', 'DS']),
  businessUnit: z.string(),
  legalEntity: z.string(),
  currency: z.string(),
  amount: z.number().positive('Amount must be positive'),
  costCentre: z.string(),
  glCode: z.string(),
  vendor: z.string(),
  classification: z.enum(['CAPEX', 'OPEX']),
  budgetStatus: z.enum(['Approved', 'Not in Budget', 'Pending']),
  requiredByDate: z.date(),
  capexCategory: z.string().optional(),
  capexType: z.string().optional(),
  capexSegment: z.string().optional(),
  cxoFunction: z.string().optional(),
  projectNumber: z.string().optional(),
})

type RequestForm = z.infer<typeof requestSchema>

const steps = ['Basic Information', 'Financial Details', 'Classification', 'CAPEX Details', 'Attachments']

export default function NewRequest() {
  const [currentStep, setCurrentStep] = useState(0)
  
  const form = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: '',
      description: '',
      department: 'DI',
      businessUnit: '',
      legalEntity: '',
      currency: 'USD',
      amount: 0,
      costCentre: '',
      glCode: '',
      vendor: '',
      classification: 'OPEX',
      budgetStatus: 'Pending',
      requiredByDate: new Date(),
    },
  })

  const onSubmit = (data: RequestForm) => {
    console.log('Form submitted:', data)
    // TODO: Submit to API
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">New Funding Request</h1>
        <p className="text-gray-500 mt-2">Complete all steps to submit your request</p>
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                index <= currentStep 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-200 text-gray-600"
              )}>
                {index + 1}
              </div>
              <span className={cn(
                "ml-2 text-sm",
                index <= currentStep ? "text-gray-900 font-medium" : "text-gray-400"
              )}>
                {step}
              </span>
              {index < steps.length - 1 && (
                <div className="w-16 h-px bg-gray-200 mx-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>{steps[currentStep]}</CardTitle>
              <CardDescription>
                Step {currentStep + 1} of {steps.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Basic Information */}
              {currentStep === 0 && (
                <>
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Request Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter request title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description / Business Justification *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Provide detailed business justification..."
                            className="min-h-[150px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DI">DI - Digital Innovation</SelectItem>
                            <SelectItem value="DS">DS - Data Science</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Unit *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select BU" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BU1">Business Unit 1</SelectItem>
                            <SelectItem value="BU2">Business Unit 2</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Step 2: Financial Details */}
              {currentStep === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="legalEntity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Legal Entity *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select legal entity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="entity1">Entity 1 - DI</SelectItem>
                            <SelectItem value="entity2">Entity 2 - DS</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD - US Dollar</SelectItem>
                              <SelectItem value="EUR">EUR - Euro</SelectItem>
                              <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0.00" 
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>Live USD conversion shown inline</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="costCentre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost Centre</FormLabel>
                          <FormControl>
                            <Input placeholder="CC-1234" {...field} />
                          </FormControl>
                          <FormDescription className="text-xs">Tooltip: Standard cost centre format</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="glCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GL Code</FormLabel>
                          <FormControl>
                            <Input placeholder="GL-5678" {...field} />
                          </FormControl>
                          <FormDescription className="text-xs">Tooltip: General Ledger code</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="vendor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor / Supplier</FormLabel>
                        <FormControl>
                          <Input placeholder="Vendor name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Step 3: Classification */}
              {currentStep === 2 && (
                <>
                  <FormField
                    control={form.control}
                    name="classification"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Classification *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-3">
                              <RadioGroupItem value="CAPEX" id="capex" />
                              <label htmlFor="capex">CAPEX - Capital Expenditure</label>
                            </div>
                            <div className="flex items-center space-x-3">
                              <RadioGroupItem value="OPEX" id="opex" />
                              <label htmlFor="opex">OPEX - Operational Expenditure</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="budgetStatus"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Budget Status *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-3">
                              <RadioGroupItem value="Approved" id="approved" />
                              <label htmlFor="approved">Approved</label>
                            </div>
                            <div className="flex items-center space-x-3">
                              <RadioGroupItem value="Not in Budget" id="not-in-budget" />
                              <label htmlFor="not-in-budget">Not in Budget</label>
                            </div>
                            <div className="flex items-center space-x-3">
                              <RadioGroupItem value="Pending" id="pending" />
                              <label htmlFor="pending">Pending Budget Approval</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requiredByDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Required By Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Step 4: CAPEX Details (shown only if CAPEX is selected) */}
              {currentStep === 3 && form.watch('classification') === 'CAPEX' && (
                <>
                  <FormField
                    control={form.control}
                    name="capexCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CAPEX Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Hardware, Software, Infrastructure" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="capexType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CAPEX Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., New, Replacement, Upgrade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cxoFunction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CXO Function</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., CTO, CFO, COO" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="projectNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Number</FormLabel>
                        <FormControl>
                          <Input placeholder="PROJ-2024-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {currentStep === 3 && form.watch('classification') === 'OPEX' && (
                <div className="text-center py-8 text-gray-500">
                  No CAPEX details required for OPEX requests
                </div>
              )}

              {/* Step 5: Attachments */}
              {currentStep === 4 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Drag & Drop Files Here</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload quotes, contracts, invoices, or business cases
                  </p>
                  <Button type="button" variant="outline">
                    Select Files
                  </Button>
                  <p className="text-xs text-gray-400 mt-4">
                    Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB each)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            {currentStep === steps.length - 1 ? (
              <Button type="submit">Submit Request</Button>
            ) : (
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}
