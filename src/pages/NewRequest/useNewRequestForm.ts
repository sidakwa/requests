import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { DoaRule, BusinessUnit, LegalEntity } from './useNewRequestData'

export interface CapexLineItem {
  name: string
  years: { [key: string]: number }
}

export interface FormData {
  title: string
  department_id: string
  business_unit: string
  legal_entity_id: string
  currency: string
  amount: number
  cost_centre: string
  gl_code: string
  vendor: string
  budget_type: string
  required_by_date: Date
  description: string
  segment: string
  project_number: string
}

// Currency conversion rates
const getExchangeRate = (currency: string): number => {
  const rates: Record<string, number> = {
    USD: 1, ZAR: 0.054, EUR: 1.08, GBP: 1.27,
    KES: 0.0077, MZN: 0.016, TZS: 0.00039, UGX: 0.00027
  }
  return rates[currency] || 1
}

const convertToUSD = (amount: number, currency: string): number => {
  return amount * getExchangeRate(currency)
}

const DEFAULT_CAPEX_LINES: CapexLineItem[] = [
  { name: 'Materials', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Labour', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Import Duties', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Accommodation', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Engineering', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Risk Allowance', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Planning', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Project Management', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Support', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
]

const STEPS = ['Request Details', 'Financials', 'Attachments', 'Approval Chain', 'Review & Submit']

interface UseNewRequestFormProps {
  doaRules: DoaRule[]
  businessUnits: BusinessUnit[]
  filterEntitiesByBU: (buCode: string) => void
  userId: string | undefined
  userEmail: string | undefined
  legalEntities: LegalEntity[]
  departments: Department[]
  getDepartmentApprovers: (departmentId: string) => { headEmail: string; chiefEmail: string } | null
}

import { Department } from './useNewRequestData'

// Build approval chain based on amount using department approvers
const buildApprovalChain = (
  amount: number, 
  departmentId: string, 
  businessUnit: string,
  getDepartmentApprovers: (departmentId: string) => { headEmail: string; chiefEmail: string } | null
): any[] => {
  const chain = []
  const approvers = getDepartmentApprovers(departmentId)
  
  const headEmail = approvers?.headEmail || 'dept.head@seacom.com'
  const chiefEmail = approvers?.chiefEmail || 'chief@seacom.com'
  
  // Level 1: $0 - $10,000 - Department Head only
  if (amount <= 10000) {
    chain.push({ step: 1, name: 'Department Head', email: headEmail, role: 'dept_head', required: true })
  } 
  // Level 2: $10,001 - $50,000 - Department Head → Chief/Executive
  else if (amount <= 50000) {
    chain.push({ step: 1, name: 'Department Head', email: headEmail, role: 'dept_head', required: true })
    chain.push({ step: 2, name: 'Chief/Executive', email: chiefEmail, role: 'chief', required: true })
  } 
  // Level 3: $50,001 - $100,000 - Department Head → Chief/Executive → Head of CIC
  else if (amount <= 100000) {
    chain.push({ step: 1, name: 'Department Head', email: headEmail, role: 'dept_head', required: true })
    chain.push({ step: 2, name: 'Chief/Executive', email: chiefEmail, role: 'chief', required: true })
    chain.push({ step: 3, name: 'Head of CIC', email: 'head.cic@seacom.com', role: 'cic', required: true })
  } 
  // Level 4: $100,001+ - Full chain
  else {
    chain.push({ step: 1, name: 'Department Head', email: headEmail, role: 'dept_head', required: true })
    chain.push({ step: 2, name: 'Chief/Executive', email: chiefEmail, role: 'chief', required: true })
    chain.push({ step: 3, name: 'Head of CIC', email: 'head.cic@seacom.com', role: 'cic', required: true })
    chain.push({ step: 4, name: 'Finance Review', email: 'finance@seacom.com', role: 'finance', required: true })
    chain.push({ step: 5, name: 'CFO/CEO', email: 'cfo@seacom.com', role: 'cfo', required: true })
  }
  
  return chain
}

// Generate the next available project number for the given BU + entity + month.
// Orders by project_number DESC (not created_at) so the highest sequence is always found first.
// Called both on field selection (preview) and again at submit time (to avoid stale duplicates).
const generateProjectNumber = async (businessUnit: string, entityCode: string): Promise<string> => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  // Escape ilike wildcards in user-supplied values to prevent pattern injection.
  const escapedBU = businessUnit.replace(/%/g, '\\%').replace(/_/g, '\\_')
  const escapedEntity = entityCode.replace(/%/g, '\\%').replace(/_/g, '\\_')
  const prefix = `${businessUnit}-${entityCode}_${year}-${month}-`
  const ilikePattern = `${escapedBU}-${escapedEntity}_${year}-${month}-%`

  const { data: existing, error } = await supabase
    .from('funding_requests')
    .select('project_number')
    .ilike('project_number', ilikePattern)
    .order('project_number', { ascending: false })
    .limit(1)

  if (error) {
    return `${prefix}001`
  }

  let sequence = 1
  if (existing && existing.length > 0 && existing[0].project_number) {
    const lastSeq = parseInt(existing[0].project_number.slice(prefix.length), 10)
    if (!isNaN(lastSeq)) sequence = lastSeq + 1
  }

  return `${prefix}${String(sequence).padStart(3, '0')}`
}

export function useNewRequestForm({
  doaRules,
  businessUnits,
  filterEntitiesByBU,
  userId,
  userEmail,
  legalEntities,
  departments,
  getDepartmentApprovers,
}: UseNewRequestFormProps) {
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [capexLineItems, setCapexLineItems] = useState<CapexLineItem[]>(DEFAULT_CAPEX_LINES)
  const [quotationValue, setQuotationValue] = useState(0)
  const [approvalComments, setApprovalComments] = useState('')
  const [generatingProjectNumber, setGeneratingProjectNumber] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    title: '',
    department_id: '',
    business_unit: '',
    legal_entity_id: '',
    currency: 'USD',
    amount: 0,
    cost_centre: '',
    gl_code: '',
    vendor: '',
    budget_type: 'CAPEX',
    required_by_date: new Date(),
    description: '',
    segment: '',
    project_number: '',
  })

  const prevBusinessUnitRef = useRef(formData.business_unit)

  useEffect(() => {
    if (formData.business_unit && formData.business_unit !== prevBusinessUnitRef.current) {
      prevBusinessUnitRef.current = formData.business_unit
      filterEntitiesByBU(formData.business_unit)
      setFormData(prev => ({ ...prev, legal_entity_id: '' }))
    }
  }, [formData.business_unit, filterEntitiesByBU])

  useEffect(() => {
    if (formData.business_unit && businessUnits.length > 0) {
      const selectedBU = businessUnits.find(bu => bu.code === formData.business_unit)
      if (selectedBU) setFormData(prev => ({ ...prev, segment: selectedBU.name }))
    }
  }, [formData.business_unit, businessUnits])

  useEffect(() => {
    const updateProjectNumber = async () => {
      if (formData.business_unit && formData.legal_entity_id && legalEntities.length > 0) {
        setGeneratingProjectNumber(true)
        try {
          const selectedEntity = legalEntities.find(e => e.id === formData.legal_entity_id)
          if (selectedEntity) {
            const projectNumber = await generateProjectNumber(formData.business_unit, selectedEntity.code)
            setFormData(prev => ({ ...prev, project_number: projectNumber }))
          }
        } catch (err) {
        } finally {
          setGeneratingProjectNumber(false)
        }
      }
    }
    updateProjectNumber()
  }, [formData.business_unit, formData.legal_entity_id, legalEntities])

  const calcLineItemTotal = (item: CapexLineItem) =>
    Object.values(item.years).reduce((sum, v) => sum + v, 0)

  const calcGrandTotal = () =>
    capexLineItems.reduce((sum, item) => sum + calcLineItemTotal(item), 0) + quotationValue

  const grandTotal = calcGrandTotal()

  const calcDoALevel = () => {
    const amount = Number(grandTotal)
    if (!doaRules || doaRules.length === 0) {
      if (amount <= 10000) return 'Level 1 - Department Head Approval'
      if (amount <= 50000) return 'Level 2 - Chief/Executive Approval'
      if (amount <= 100000) return 'Level 3 - Head of CIC'
      return 'Level 4 - Board/CFO Approval'
    }
    const rule = doaRules.find(
      r => amount >= Number(r.min_amount) && amount <= Number(r.max_amount) && r.currency === formData.currency
    )
    return rule?.approval_level || 'Level 1 - Department Head Approval'
  }

  const approvalChain = () => {
    const amount = grandTotal
    const approvers = getDepartmentApprovers(formData.department_id)
    const headEmail = approvers?.headEmail || 'dept.head@seacom.com'
    const chiefEmail = approvers?.chiefEmail || 'chief@seacom.com'

    const allSteps = [
      { step: 1, name: 'Department Head', email: headEmail },
      { step: 2, name: 'Chief/Executive', email: chiefEmail },
      { step: 3, name: 'Head of CIC', email: 'head.cic@seacom.com' },
      { step: 4, name: 'Finance Review', email: 'finance@seacom.com' },
      { step: 5, name: 'CFO/CEO', email: 'cfo@seacom.com' },
    ]

    let requiredCount = 1
    if (amount > 100000) requiredCount = 5
    else if (amount > 50000) requiredCount = 3
    else if (amount > 10000) requiredCount = 2

    return allSteps.map((s, i) => ({ ...s, required: i < requiredCount }))
  }

  const handleLineItemChange = (itemIndex: number, year: string, value: number) => {
    const updated = [...capexLineItems]
    updated[itemIndex].years[year] = value
    setCapexLineItems(updated)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)])
      toast.success(`${e.target.files.length} file(s) added`)
    }
  }

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index))

  const nextStep = () => {
    if (currentStep === 0) {
      if (!formData.title || formData.title.trim() === '') { setError('Title required'); return }
      if (!formData.department_id) { setError('Department required'); return }
      if (!formData.business_unit) { setError('Business unit required'); return }
      if (!formData.legal_entity_id) { setError('Legal entity required'); return }
    }
    setError(null)
    if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1)
  }

  const prevStep = () => {
    setError(null)
    if (currentStep > 0) setCurrentStep(prev => prev - 1)
  }

  const handleSubmit = async () => {
    if (!userId) {
      setError('Please sign in')
      toast.error('Please sign in to submit a request')
      return
    }

    setSubmitting(true)
    try {
      const year = new Date().getFullYear()
      const { count } = await supabase.from('funding_requests').select('*', { count: 'exact', head: true })
      const requestNumber = `FR-${year}-${String((count || 0) + 1).padStart(3, '0')}`
      const doaLevel = calcDoALevel()
      const amountUSD = convertToUSD(grandTotal, formData.currency)
      const chain = buildApprovalChain(grandTotal, formData.department_id, formData.business_unit, getDepartmentApprovers)

      // Re-derive at submit time so the number is always based on the current DB state,
      // preventing duplicates if the user sat on the form while another request was submitted.
      const selectedEntity = legalEntities.find(e => e.id === formData.legal_entity_id)
      const freshProjectNumber = selectedEntity
        ? await generateProjectNumber(formData.business_unit, selectedEntity.code)
        : formData.project_number

      const lineItemsJSON = capexLineItems.map(item => ({
        name: item.name,
        years: item.years
      }))

      const { data: newRequest, error: insertError } = await supabase.from('funding_requests').insert({
        request_number: requestNumber,
        requester_email: userEmail,
        title: formData.title,
        description: formData.description,
        department_id: formData.department_id || null,
        business_unit: formData.business_unit,
        legal_entity_id: formData.legal_entity_id || null,
        currency: formData.currency,
        amount: grandTotal,
        amount_usd: amountUSD,
        budget_type: formData.budget_type,
        status: chain.length > 0 ? 'Pending' : 'Approved',
        current_approver: doaLevel,
        segment: formData.segment,
        project_number: freshProjectNumber,
        doa_level: doaLevel,
        approval_chain: chain,
        approval_comments: approvalComments,
        required_by_date: formData.required_by_date.toISOString().split('T')[0],
        quotation_value: quotationValue,
        line_items: lineItemsJSON,
        current_step: 1,
        total_steps: chain.length,
        current_approver_email: chain[0]?.email || null,
        created_at: new Date().toISOString(),
      }).select().single()

      if (insertError) throw insertError

      for (let i = 0; i < chain.length; i++) {
        const step = chain[i]
        const { error: approvalError } = await supabase
          .from('approval_actions')
          .insert({
            request_id: newRequest.id,
            approver_email: step.email,
            action: 'pending',
            comments: null,
            created_at: new Date().toISOString()
          })
        
        if (approvalError) {
        }
      }

      toast.success(`Request ${requestNumber} submitted successfully!`)
      setTimeout(() => navigate('/my-requests'), 2000)
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message)
      toast.error('Submission failed: ' + e.message)
    } finally {
      setSubmitting(false)
      setShowConfirmDialog(false)
    }
  }

  return {
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
    generatingProjectNumber,
    grandTotal,
    steps: STEPS,
    doaLevel: calcDoALevel(),
    approvalChain: approvalChain(),
    nextStep,
    prevStep,
    handleSubmit,
    handleFileUpload,
    removeFile,
    handleLineItemChange,
    calcLineItemTotal,
  }
}
