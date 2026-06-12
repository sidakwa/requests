import { describe, it, expect } from 'vitest'
import { evaluateCondition, evaluateExpression, ExpressionError } from '../conditions'
import { EvalContext } from '../types'

const ctx: EvalContext = {
  request: {
    amount_usd: 75000,
    currency: 'ZAR',
    environment: 'production',
    access_level: 'privileged',
    remote_worker: false,
    systems: ['vpn', 'jira'],
  },
  requester: {
    email: 'user@seacom.com',
    department: 'engineering',
  },
}

describe('evaluateCondition', () => {
  it('treats empty/absent conditions as true', () => {
    expect(evaluateCondition(undefined, ctx)).toBe(true)
    expect(evaluateCondition('', ctx)).toBe(true)
    expect(evaluateCondition('   ', ctx)).toBe(true)
  })

  it('evaluates numeric comparisons', () => {
    expect(evaluateCondition('request.amount_usd > 50000', ctx)).toBe(true)
    expect(evaluateCondition('request.amount_usd > 100000', ctx)).toBe(false)
    expect(evaluateCondition('request.amount_usd >= 75000', ctx)).toBe(true)
    expect(evaluateCondition('request.amount_usd <= 75000', ctx)).toBe(true)
    expect(evaluateCondition('request.amount_usd < 75000', ctx)).toBe(false)
  })

  it('evaluates equality on strings and booleans', () => {
    expect(evaluateCondition("request.currency == 'ZAR'", ctx)).toBe(true)
    expect(evaluateCondition('request.currency != "USD"', ctx)).toBe(true)
    expect(evaluateCondition('request.remote_worker == false', ctx)).toBe(true)
    expect(evaluateCondition('request.remote_worker == true', ctx)).toBe(false)
  })

  it('evaluates and/or/not with correct precedence', () => {
    expect(evaluateCondition("request.amount_usd > 50000 and request.currency == 'ZAR'", ctx)).toBe(true)
    expect(evaluateCondition("request.amount_usd > 100000 or request.currency == 'ZAR'", ctx)).toBe(true)
    expect(evaluateCondition('not request.remote_worker', ctx)).toBe(true)
    // and binds tighter than or
    expect(evaluateCondition("request.currency == 'USD' and request.amount_usd > 1 or request.environment == 'production'", ctx)).toBe(true)
    expect(evaluateCondition("(request.currency == 'USD' or request.currency == 'ZAR') and request.amount_usd > 1", ctx)).toBe(true)
  })

  it('supports membership tests', () => {
    expect(evaluateCondition("requester.department in ['engineering', 'noc']", ctx)).toBe(true)
    expect(evaluateCondition("requester.department in ['finance']", ctx)).toBe(false)
    expect(evaluateCondition("requester.department not in ['finance']", ctx)).toBe(true)
    expect(evaluateCondition("'vpn' in request.systems", ctx)).toBe(true)
  })

  it('treats missing fields as falsy, not errors', () => {
    expect(evaluateCondition('request.nonexistent > 100', ctx)).toBe(false)
    expect(evaluateCondition('request.nonexistent', ctx)).toBe(false)
    expect(evaluateCondition("request.nonexistent == 'x'", ctx)).toBe(false)
    expect(evaluateCondition('request.nonexistent == null', ctx)).toBe(false) // undefined !== null
  })

  it('rejects malformed expressions', () => {
    expect(() => evaluateCondition('request.amount_usd >', ctx)).toThrow(ExpressionError)
    expect(() => evaluateCondition("request.currency == 'unterminated", ctx)).toThrow(ExpressionError)
    expect(() => evaluateCondition('request.amount_usd > 100 garbage', ctx)).toThrow(ExpressionError)
    expect(() => evaluateCondition('@!#', ctx)).toThrow(ExpressionError)
  })

  it('does not allow arbitrary code constructs', () => {
    expect(() => evaluateCondition('process.exit(1)', ctx)).toThrow(ExpressionError)
    expect(() => evaluateCondition('request.amount_usd; 1', ctx)).toThrow(ExpressionError)
  })
})

describe('evaluateExpression', () => {
  it('resolves raw values', () => {
    expect(evaluateExpression('request.currency', ctx)).toBe('ZAR')
    expect(evaluateExpression('request.amount_usd', ctx)).toBe(75000)
    expect(evaluateExpression("['a', 'b']", ctx)).toEqual(['a', 'b'])
  })
})
