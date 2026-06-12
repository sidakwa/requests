import { describe, it, expect } from 'vitest'
import { validateWorkflowDefinition } from '../validate'
import { capexDefinition } from './fixtures'

describe('validateWorkflowDefinition', () => {
  it('accepts the CAPEX definition', () => {
    expect(() => validateWorkflowDefinition(capexDefinition)).not.toThrow()
  })

  it('rejects duplicate stage ids', () => {
    const def = {
      ...capexDefinition,
      stages: [capexDefinition.stages[0], { ...capexDefinition.stages[1], id: 'dept-head' }],
    }
    expect(() => validateWorkflowDefinition(def)).toThrow(/duplicate stage id/)
  })

  it('rejects a stage with no approver', () => {
    const def = {
      ...capexDefinition,
      stages: [{ id: 'orphan', name: 'Orphan', type: 'approval' }],
    }
    expect(() => validateWorkflowDefinition(def)).toThrow(/requires 'approver'/)
  })

  it('rejects parallel_approval without approvers list', () => {
    const def = {
      ...capexDefinition,
      stages: [{ id: 'par', name: 'Par', type: 'parallel_approval' }],
    }
    expect(() => validateWorkflowDefinition(def)).toThrow(/requires 'approvers'/)
  })

  it('rejects unparseable conditions at save time', () => {
    const def = {
      ...capexDefinition,
      stages: [{
        ...capexDefinition.stages[0],
        condition: 'request.amount_usd >',
      }],
    }
    expect(() => validateWorkflowDefinition(def)).toThrow(/condition does not parse/)
  })

  it('rejects on_reject targeting an unknown stage', () => {
    const def = {
      ...capexDefinition,
      stages: [{ ...capexDefinition.stages[0], on_reject: 'return_to_stage:ghost' }],
    }
    expect(() => validateWorkflowDefinition(def)).toThrow(/unknown stage 'ghost'/)
  })

  it('rejects resolver specs missing their required field', () => {
    const def = {
      ...capexDefinition,
      stages: [{
        id: 's1', name: 'S1', type: 'approval',
        approver: { resolve_by: 'role' }, // missing role
      }],
    }
    expect(() => validateWorkflowDefinition(def)).toThrow(/requires 'role'/)
  })

  it('rejects non-kebab-case slugs and bad versions', () => {
    expect(() => validateWorkflowDefinition({ ...capexDefinition, id: 'Capex Flow' })).toThrow()
    expect(() => validateWorkflowDefinition({ ...capexDefinition, version: 0 })).toThrow()
  })
})
