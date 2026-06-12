import { describe, it, expect } from 'vitest'
import { defaultValues, pruneHiddenValues, validateForm } from '../validate'
import { FormSchema } from '../types'

const capexForm: FormSchema = {
  request_type: 'capex',
  version: 1,
  fields: [
    { id: 'title', label: 'Request Title', type: 'text', required: true },
    { id: 'amount', label: 'Amount', type: 'money', required: true, currency_field: 'currency', min: 0 },
    { id: 'currency', label: 'Currency', type: 'select', required: true, options: [
      { value: 'USD', label: 'USD' }, { value: 'ZAR', label: 'ZAR' },
    ] },
    { id: 'justification', label: 'Business Justification', type: 'textarea', required: true, min_length: 20 },
    { id: 'quotes_note', label: 'Supplier Quotes Note', type: 'textarea',
      condition: 'request.amount > 50000', required_if: 'request.amount > 50000' },
    { id: 'remote', label: 'Remote Worker', type: 'boolean' },
  ],
}

describe('validateForm', () => {
  const valid = {
    title: 'New switches',
    amount: 4000,
    currency: 'USD',
    justification: 'Replacing end-of-life core switches.',
  }

  it('passes a valid submission', () => {
    expect(validateForm(capexForm, valid)).toEqual([])
  })

  it('flags missing required fields', () => {
    const errors = validateForm(capexForm, { amount: 4000, currency: 'USD' })
    expect(errors.map(e => e.field)).toContain('title')
    expect(errors.map(e => e.field)).toContain('justification')
  })

  it('does not validate fields hidden by their condition', () => {
    expect(validateForm(capexForm, valid).some(e => e.field === 'quotes_note')).toBe(false)
  })

  it('enforces required_if when the condition becomes true', () => {
    const errors = validateForm(capexForm, { ...valid, amount: 60000 })
    expect(errors).toContainEqual({ field: 'quotes_note', message: 'Supplier Quotes Note is required' })
  })

  it('enforces min_length, numeric bounds, and select membership', () => {
    expect(validateForm(capexForm, { ...valid, justification: 'too short' }).map(e => e.field)).toContain('justification')
    expect(validateForm(capexForm, { ...valid, amount: -5 }).map(e => e.field)).toContain('amount')
    expect(validateForm(capexForm, { ...valid, currency: 'XXX' }).map(e => e.field)).toContain('currency')
  })
})

describe('pruneHiddenValues / defaultValues', () => {
  it('drops values of hidden conditional fields', () => {
    const values = { title: 'x', amount: 100, currency: 'USD', justification: 'y', quotes_note: 'stale' }
    expect(pruneHiddenValues(capexForm, values)).not.toHaveProperty('quotes_note')
  })

  it('seeds defaults for booleans and multiselects', () => {
    expect(defaultValues(capexForm)).toMatchObject({ remote: false })
  })
})
