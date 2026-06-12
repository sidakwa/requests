// ── Dynamic Form Renderer ──────────────────────────────────────────
// Renders a FormSchema as a controlled form. Conditional fields show/hide
// live as values change. Lookup-sourced options are resolved by the caller
// and passed in via `lookupOptions` keyed by field id.

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldDefinition, FieldOption, FormSchema, FormValues } from './types'
import { FieldError, isFieldRequired, isFieldVisible } from './validate'

interface DynamicFormProps {
  schema: FormSchema
  values: FormValues
  onChange: (values: FormValues) => void
  errors?: FieldError[]
  lookupOptions?: Record<string, FieldOption[]>
  disabled?: boolean
}

export function DynamicForm({ schema, values, onChange, errors = [], lookupOptions = {}, disabled }: DynamicFormProps) {
  const setValue = (id: string, value: unknown) => onChange({ ...values, [id]: value })
  const errorFor = (id: string) => errors.find(e => e.field === id)?.message

  return (
    <div className="space-y-5">
      {schema.fields.map(field => {
        if (!isFieldVisible(field, values)) return null
        const error = errorFor(field.id)
        const required = isFieldRequired(field, values)
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-sm font-medium text-gray-700">
              {field.label}
              {required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <FieldControl
              field={field}
              value={values[field.id]}
              onChange={v => setValue(field.id, v)}
              options={field.options ?? lookupOptions[field.id] ?? []}
              disabled={disabled}
            />
            {field.help && !error && <p className="text-xs text-gray-500">{field.help}</p>}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        )
      })}
    </div>
  )
}

interface FieldControlProps {
  field: FieldDefinition
  value: unknown
  onChange: (value: unknown) => void
  options: FieldOption[]
  disabled?: boolean
}

function FieldControl({ field, value, onChange, options, disabled }: FieldControlProps) {
  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          id={field.id}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={4}
        />
      )
    case 'number':
    case 'money':
      return (
        <Input
          id={field.id}
          type="number"
          value={value === undefined || value === null ? '' : String(value)}
          onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          placeholder={field.placeholder}
          disabled={disabled}
          min={field.min}
          max={field.max}
        />
      )
    case 'date':
      return (
        <Input
          id={field.id}
          type="date"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
        />
      )
    case 'boolean':
      return (
        <div className="pt-1">
          <Switch id={field.id} checked={Boolean(value)} onCheckedChange={onChange} disabled={disabled} />
        </div>
      )
    case 'select':
    case 'lookup':
      return (
        <Select value={(value as string) ?? ''} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id={field.id}>
            <SelectValue placeholder={field.placeholder || 'Select…'} />
          </SelectTrigger>
          <SelectContent>
            {options.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {options.map(o => (
            <label key={o.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <Checkbox
                checked={selected.includes(o.value)}
                onCheckedChange={checked =>
                  onChange(checked ? [...selected, o.value] : selected.filter(v => v !== o.value))
                }
                disabled={disabled}
              />
              {o.label}
            </label>
          ))}
        </div>
      )
    }
    case 'user_picker':
      return (
        <Input
          id={field.id}
          type="email"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || 'name@seacom.com'}
          disabled={disabled}
        />
      )
    case 'text':
    default:
      return (
        <Input
          id={field.id}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      )
  }
}
