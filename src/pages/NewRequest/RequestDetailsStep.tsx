import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Department } from './useNewRequestData'

const DS_REGIONS = ['East Africa', 'Kenya', 'Tanzania', 'Uganda', 'Shared', 'South Africa']

interface RequestDetailsStepProps {
  formData: any
  setFormData: (data: any) => void
  departments: Department[]
  businessUnits: any[]
  filteredLegalEntities: any[]
  generatingProjectNumber: boolean
  doaLevel: string
  totalApprovers: number
  required_by_date: Date
  setRequiredByDate: (date: Date) => void
}

export function RequestDetailsStep({
  formData,
  setFormData,
  departments,
  businessUnits,
  filteredLegalEntities,
  generatingProjectNumber,
  doaLevel,
  totalApprovers,
  required_by_date,
  setRequiredByDate
}: RequestDetailsStepProps) {
  const isDS = formData.business_unit === 'DS'

  const visibleDepartments = departments.filter(d => {
    if (formData.business_unit && d.business_unit && d.business_unit !== formData.business_unit) return false
    if (isDS && formData.region && d.region !== formData.region) return false
    return true
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Details</CardTitle>
        <CardDescription>Fill in the basic information for your funding request</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Request Title *</Label>
            <Input
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Lead to Cash"
            />
          </div>

          <div>
            <Label>Business Unit *</Label>
            <RadioGroup
              value={formData.business_unit}
              onValueChange={v => {
                setFormData({ ...formData, business_unit: v, legal_entity_id: '', region: '', department_id: '' })
              }}
              className="flex gap-4 mt-1"
            >
              {businessUnits?.map(bu => (
                <div key={bu.code} className="flex items-center space-x-2">
                  <RadioGroupItem value={bu.code} id={bu.code} />
                  <Label htmlFor={bu.code}>{bu.name}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {isDS && (
            <div>
              <Label>Region *</Label>
              <Select
                value={formData.region}
                onValueChange={v => setFormData({ ...formData, region: v, department_id: '' })}
                disabled={!formData.business_unit}
              >
                <SelectTrigger><SelectValue placeholder="Select region..." /></SelectTrigger>
                <SelectContent>
                  {DS_REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Department *</Label>
            <Select
              value={formData.department_id}
              onValueChange={v => setFormData({ ...formData, department_id: v })}
              disabled={!formData.business_unit || (isDS && !formData.region)}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !formData.business_unit ? 'Select business unit first' :
                  (isDS && !formData.region) ? 'Select region first' :
                  'Select department...'
                } />
              </SelectTrigger>
              <SelectContent>
                {visibleDepartments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Legal Entity *</Label>
            <Select
              value={formData.legal_entity_id}
              onValueChange={v => setFormData({ ...formData, legal_entity_id: v })}
              disabled={!formData.business_unit}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.business_unit ? 'Select legal entity...' : 'Select business unit first'} />
              </SelectTrigger>
              <SelectContent>
                {filteredLegalEntities?.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name} ({e.code})</SelectItem>
                ))}
                {filteredLegalEntities?.length === 0 && formData.business_unit && (
                  <div className="p-2 text-center text-gray-500">No legal entities found for this business unit</div>
                )}
              </SelectContent>
            </Select>
            {filteredLegalEntities?.length === 0 && formData.business_unit && (
              <p className="text-xs text-red-500 mt-1">No legal entities available. Please check your database.</p>
            )}
          </div>

          <div>
            <Label>Classification</Label>
            <RadioGroup
              value={formData.budget_type}
              onValueChange={v => setFormData({ ...formData, budget_type: v })}
              className="flex gap-4 mt-1"
            >
              <div className="flex items-center space-x-2"><RadioGroupItem value="CAPEX" id="capex" /><Label htmlFor="capex">CAPEX</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="OPEX" id="opex" /><Label htmlFor="opex">OPEX</Label></div>
            </RadioGroup>
          </div>

          <div>
            <Label>Required By Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 w-4 h-4" />
                  {format(required_by_date, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar mode="single" selected={required_by_date} onSelect={date => date && setRequiredByDate(date)} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="md:col-span-2">
            <Label>Project Number</Label>
            <div className="flex gap-2">
              <Input value={formData.project_number || ''} disabled className="bg-gray-100 font-mono" placeholder="Auto-generated" />
              {generatingProjectNumber && <Loader2 className="w-5 h-5 animate-spin text-blue-500 self-center" />}
            </div>
            <p className="text-xs text-gray-500 mt-1">Format: BU-Entity_YYYY-MM-XXX • Auto-generated from your selections</p>
          </div>
        </div>

        <div>
          <Label>Executive Summary *</Label>
          <Textarea rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the purpose and business justification for this request..." />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800 font-medium">DoA Level: {doaLevel}</p>
          <p className="text-xs text-blue-600 mt-1">{totalApprovers} approver(s) required based on requested amount</p>
        </div>
      </CardContent>
    </Card>
  )
}
