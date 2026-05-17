import { z } from 'zod'

export const fundingRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  amount: z.number().positive('Amount must be positive'),
  department_id: z.string().uuid('Invalid department'),
  business_unit: z.enum(['DI', 'DS']),
  legal_entity_id: z.string().uuid('Invalid legal entity'),
  currency: z.enum(['USD', 'ZAR', 'EUR', 'GBP', 'KES', 'MZN', 'TZS', 'UGX']),
  budget_type: z.enum(['CAPEX', 'OPEX']),
  required_by_date: z.date().optional(),
})

export const approvalDecisionSchema = z.object({
  action: z.enum(['approved', 'rejected', 'returned']),
  comments: z.string().max(500, 'Comments too long').optional(),
})
