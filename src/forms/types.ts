// ── Dynamic Form Schema ────────────────────────────────────────────
// Each catalog request type defines its form as data (stored in
// `form_schemas.schema`), rendered by <DynamicForm /> — never as code.

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'money'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'user_picker'
  | 'lookup'

export interface FieldOption {
  value: string
  label: string
}

export interface FieldDefinition {
  id: string
  label: string
  type: FieldType
  required?: boolean
  /** boolean expression over `request.*`; field hidden (and not validated) when false */
  condition?: string
  /** field becomes required when this expression is true */
  required_if?: string
  placeholder?: string
  help?: string
  /** static options for select/multiselect */
  options?: FieldOption[]
  /** dynamic options: "lookup:<table>" loads value/label pairs from a lookup table */
  source?: string
  /** for money fields: id of the sibling field holding the currency code */
  currency_field?: string
  min?: number
  max?: number
  min_length?: number
  max_length?: number
  default?: unknown
}

export interface FormSchema {
  request_type: string
  version: number
  fields: FieldDefinition[]
}

export type FormValues = Record<string, unknown>
