// ── Dynamic Form Validation ────────────────────────────────────────
// Validates submitted values against a FormSchema, honouring conditional
// visibility (`condition`) and conditional requirement (`required_if`)
// using the same expression language as the workflow engine.

import { evaluateCondition } from '@/engine/conditions'
import { FieldDefinition, FormSchema, FormValues } from './types'

export interface FieldError {
  field: string
  message: string
}

export function isFieldVisible(field: FieldDefinition, values: FormValues): boolean {
  return evaluateCondition(field.condition, { request: values, requester: {} })
}

export function isFieldRequired(field: FieldDefinition, values: FormValues): boolean {
  if (field.required) return true
  if (field.required_if) {
    return evaluateCondition(field.required_if, { request: values, requester: {} })
  }
  return false
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

export function validateForm(schema: FormSchema, values: FormValues): FieldError[] {
  const errors: FieldError[] = []

  for (const field of schema.fields) {
    if (!isFieldVisible(field, values)) continue
    const value = values[field.id]

    if (isFieldRequired(field, values) && isEmpty(value)) {
      errors.push({ field: field.id, message: `${field.label} is required` })
      continue
    }
    if (isEmpty(value)) continue

    switch (field.type) {
      case 'number':
      case 'money': {
        const n = typeof value === 'number' ? value : Number(value)
        if (isNaN(n)) {
          errors.push({ field: field.id, message: `${field.label} must be a number` })
          break
        }
        if (field.min !== undefined && n < field.min) errors.push({ field: field.id, message: `${field.label} must be at least ${field.min}` })
        if (field.max !== undefined && n > field.max) errors.push({ field: field.id, message: `${field.label} must be at most ${field.max}` })
        break
      }
      case 'text':
      case 'textarea': {
        const s = String(value)
        if (field.min_length !== undefined && s.length < field.min_length) {
          errors.push({ field: field.id, message: `${field.label} must be at least ${field.min_length} characters` })
        }
        if (field.max_length !== undefined && s.length > field.max_length) {
          errors.push({ field: field.id, message: `${field.label} must be at most ${field.max_length} characters` })
        }
        break
      }
      case 'select': {
        if (field.options && !field.options.some(o => o.value === value)) {
          errors.push({ field: field.id, message: `${field.label} has an invalid selection` })
        }
        break
      }
      case 'multiselect': {
        if (!Array.isArray(value)) {
          errors.push({ field: field.id, message: `${field.label} must be a list` })
        } else if (field.options) {
          const valid = new Set(field.options.map(o => o.value))
          if (value.some(v => !valid.has(v as string))) {
            errors.push({ field: field.id, message: `${field.label} has an invalid selection` })
          }
        }
        break
      }
      case 'date': {
        if (isNaN(new Date(String(value)).getTime())) {
          errors.push({ field: field.id, message: `${field.label} must be a valid date` })
        }
        break
      }
      case 'user_picker': {
        if (typeof value !== 'string' || !value.includes('@')) {
          errors.push({ field: field.id, message: `${field.label} must be a valid user email` })
        }
        break
      }
      default:
        break
    }
  }

  return errors
}

/** Strip values of fields that are hidden by their condition so they are not persisted. */
export function pruneHiddenValues(schema: FormSchema, values: FormValues): FormValues {
  const result: FormValues = {}
  for (const field of schema.fields) {
    if (isFieldVisible(field, values) && values[field.id] !== undefined) {
      result[field.id] = values[field.id]
    }
  }
  return result
}

export function defaultValues(schema: FormSchema): FormValues {
  const values: FormValues = {}
  for (const field of schema.fields) {
    if (field.default !== undefined) values[field.id] = field.default
    else if (field.type === 'boolean') values[field.id] = false
    else if (field.type === 'multiselect') values[field.id] = []
  }
  return values
}
