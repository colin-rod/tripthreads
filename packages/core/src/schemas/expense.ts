import { z } from 'zod'
import type { ExpenseCategory } from '../types/expense'

/**
 * Valid expense categories
 */
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'food',
  'transport',
  'accommodation',
  'activity',
  'other',
]

/**
 * Common currency codes (ISO 4217)
 */
export const CURRENCY_CODES = [
  'EUR',
  'USD',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
  'CNY',
  'SEK',
  'NZD',
] as const

/**
 * Schema for creating an expense
 */
export const createExpenseSchema = z.object({
  description: z
    .string()
    .min(1, 'Description is required')
    .max(255, 'Description must be less than 255 characters'),
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .finite('Amount must be a valid number'),
  currency: z.string().length(3, 'Currency must be a 3-letter code').toUpperCase(),
  category: z.enum(['food', 'transport', 'accommodation', 'activity', 'other'], {
    message: 'Invalid expense category',
  }),
  payer_id: z.string().uuid('Invalid payer ID'),
  date: z.string().datetime('Invalid date format'),
})

/**
 * Schema for updating an expense
 */
export const updateExpenseSchema = createExpenseSchema.partial().extend({
  id: z.string().uuid('Invalid expense ID'),
})

/**
 * Type inference for form data
 */
export type CreateExpenseFormData = z.infer<typeof createExpenseSchema>
export type UpdateExpenseFormData = z.infer<typeof updateExpenseSchema>
