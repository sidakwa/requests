// ── Condition Expression Evaluator ─────────────────────────────────
// Evaluates the boolean expressions used in workflow/form definitions:
//   "request.amount_usd > 100000 and request.currency == 'ZAR'"
//   "requester.department in ['engineering', 'noc']"
//   "not request.remote_worker"
// Hand-rolled tokenizer + recursive-descent parser — never eval/Function,
// since definitions are admin-authored data stored in the DB.

import { EvalContext } from './types'

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'ident'; value: string }
  | { kind: 'op'; value: string }
  | { kind: 'punct'; value: '(' | ')' | '[' | ']' | ',' }

const KEYWORDS = new Set(['and', 'or', 'not', 'in', 'true', 'false', 'null'])

export class ExpressionError extends Error {}

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < input.length) {
    const c = input[i]
    if (/\s/.test(c)) { i++; continue }
    if (c === '(' || c === ')' || c === '[' || c === ']' || c === ',') {
      tokens.push({ kind: 'punct', value: c })
      i++
      continue
    }
    const two = input.slice(i, i + 2)
    if (two === '==' || two === '!=' || two === '>=' || two === '<=') {
      tokens.push({ kind: 'op', value: two })
      i += 2
      continue
    }
    if (c === '>' || c === '<') {
      tokens.push({ kind: 'op', value: c })
      i++
      continue
    }
    if (c === "'" || c === '"') {
      const end = input.indexOf(c, i + 1)
      if (end === -1) throw new ExpressionError(`Unterminated string at position ${i}`)
      tokens.push({ kind: 'str', value: input.slice(i + 1, end) })
      i = end + 1
      continue
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(input[i + 1] ?? ''))) {
      const match = /^[0-9]+(\.[0-9]+)?/.exec(input.slice(i))!
      tokens.push({ kind: 'num', value: parseFloat(match[0]) })
      i += match[0].length
      continue
    }
    if (/[a-zA-Z_]/.test(c)) {
      const match = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*/.exec(input.slice(i))!
      tokens.push({ kind: 'ident', value: match[0] })
      i += match[0].length
      continue
    }
    throw new ExpressionError(`Unexpected character '${c}' at position ${i}`)
  }
  return tokens
}

class Parser {
  private pos = 0
  constructor(private tokens: Token[], private ctx: EvalContext) {}

  parse(): unknown {
    const value = this.parseOr()
    if (this.pos < this.tokens.length) {
      throw new ExpressionError(`Unexpected token after expression: ${JSON.stringify(this.tokens[this.pos])}`)
    }
    return value
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private matchIdent(word: string): boolean {
    const t = this.peek()
    if (t?.kind === 'ident' && t.value === word) {
      this.pos++
      return true
    }
    return false
  }

  private parseOr(): unknown {
    let left = this.parseAnd()
    while (this.matchIdent('or')) {
      const right = this.parseAnd()
      left = Boolean(left) || Boolean(right)
    }
    return left
  }

  private parseAnd(): unknown {
    let left = this.parseNot()
    while (this.matchIdent('and')) {
      const right = this.parseNot()
      left = Boolean(left) && Boolean(right)
    }
    return left
  }

  private parseNot(): unknown {
    if (this.matchIdent('not')) return !this.parseNot()
    return this.parseComparison()
  }

  private parseComparison(): unknown {
    const left = this.parsePrimary()
    const t = this.peek()
    if (t?.kind === 'op') {
      this.pos++
      const right = this.parsePrimary()
      return this.compare(left, t.value, right)
    }
    if (t?.kind === 'ident' && t.value === 'in') {
      this.pos++
      const right = this.parsePrimary()
      return this.contains(right, left)
    }
    if (t?.kind === 'ident' && t.value === 'not' && this.tokens[this.pos + 1]?.kind === 'ident'
        && (this.tokens[this.pos + 1] as { value: string }).value === 'in') {
      this.pos += 2
      const right = this.parsePrimary()
      return !this.contains(right, left)
    }
    return left
  }

  private compare(left: unknown, op: string, right: unknown): boolean {
    switch (op) {
      case '==': return left === right
      case '!=': return left !== right
    }
    // Ordering comparisons require numbers on both sides; treat anything
    // else (missing fields, strings) as false rather than throwing.
    const l = typeof left === 'number' ? left : NaN
    const r = typeof right === 'number' ? right : NaN
    if (isNaN(l) || isNaN(r)) return false
    switch (op) {
      case '>':  return l > r
      case '>=': return l >= r
      case '<':  return l < r
      case '<=': return l <= r
      default: throw new ExpressionError(`Unknown operator ${op}`)
    }
  }

  private contains(haystack: unknown, needle: unknown): boolean {
    if (Array.isArray(haystack)) return haystack.includes(needle)
    if (typeof haystack === 'string' && typeof needle === 'string') return haystack.includes(needle)
    return false
  }

  private parsePrimary(): unknown {
    const t = this.peek()
    if (!t) throw new ExpressionError('Unexpected end of expression')
    if (t.kind === 'num' || t.kind === 'str') {
      this.pos++
      return t.value
    }
    if (t.kind === 'punct' && t.value === '(') {
      this.pos++
      const value = this.parseOr()
      this.expectPunct(')')
      return value
    }
    if (t.kind === 'punct' && t.value === '[') {
      this.pos++
      const items: unknown[] = []
      while (!(this.peek()?.kind === 'punct' && (this.peek() as { value: string }).value === ']')) {
        items.push(this.parseOr())
        const next = this.peek()
        if (next?.kind === 'punct' && next.value === ',') this.pos++
        else break
      }
      this.expectPunct(']')
      return items
    }
    if (t.kind === 'ident') {
      this.pos++
      if (t.value === 'true') return true
      if (t.value === 'false') return false
      if (t.value === 'null') return null
      if (KEYWORDS.has(t.value)) throw new ExpressionError(`Unexpected keyword '${t.value}'`)
      return resolvePath(this.ctx, t.value)
    }
    throw new ExpressionError(`Unexpected token ${JSON.stringify(t)}`)
  }

  private expectPunct(p: string): void {
    const t = this.peek()
    if (t?.kind === 'punct' && t.value === p) {
      this.pos++
      return
    }
    throw new ExpressionError(`Expected '${p}'`)
  }
}

/** Resolve a dotted path like "request.amount_usd" against the context. Missing paths yield undefined. */
export function resolvePath(ctx: EvalContext, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = ctx as unknown
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/** Evaluate an expression to its raw value (used by expression-based approver resolution). */
export function evaluateExpression(expr: string, ctx: EvalContext): unknown {
  return new Parser(tokenize(expr), ctx).parse()
}

/** Evaluate an expression as a boolean condition. An empty/absent condition is true. */
export function evaluateCondition(condition: string | undefined | null, ctx: EvalContext): boolean {
  if (!condition || condition.trim() === '') return true
  return Boolean(evaluateExpression(condition, ctx))
}
