/**
 * Expense type definitions for TripThreads
 *
 * Defines types for expense tracking, participant shares, and split calculations.
 */

import { Database } from './database'

// Database table types
export type ExpenseRow = Database['public']['Tables']['expenses']['Row']
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']

export type ExpenseParticipantRow = Database['public']['Tables']['expense_participants']['Row']
export type ExpenseParticipantInsert =
  Database['public']['Tables']['expense_participants']['Insert']

/**
 * Split type determines how an expense is divided among participants
 */
export type SplitType = 'equal' | 'percentage' | 'amount' | 'shares'

/**
 * Expense category for organization and filtering
 */
export type ExpenseCategory = 'food' | 'transport' | 'accommodation' | 'activity' | 'other'

/**
 * Expense status for tracking payment state
 */
export type ExpenseStatus = 'pending' | 'settled'

/**
 * Base expense interface matching database schema
 */
export interface Expense {
  id: string
  trip_id: string
  description: string
  amount: number // Stored in minor units (cents)
  currency: string // ISO 4217 currency code
  category: ExpenseCategory
  payer_id: string
  date: string // ISO 8601 date
  receipt_url?: string | null
  fx_rate?: number | null // FX rate snapshot to trip base currency
  created_by: string
  created_at: string
  updated_at: string
}

/**
 * Expense participant with share details
 */
export interface ExpenseParticipant {
  id: string
  expense_id: string
  user_id: string
  share_amount: number // Amount in minor units
  share_type: SplitType
  share_value?: number | null // Original value (percentage, shares, or custom amount)
  created_at: string
}

/**
 * User details for display in expense views
 */
export interface ExpenseUser {
  id: string
  full_name: string
  avatar_url?: string | null
}

/**
 * Participant with user details
 */
export interface ExpenseParticipantWithUser extends ExpenseParticipant {
  user: ExpenseUser
}

/**
 * Complete expense with payer and participant details
 */
export interface ExpenseWithDetails extends Expense {
  payer: ExpenseUser
  participants: ExpenseParticipantWithUser[]
}

/**
 * Input for creating a new expense participant
 */
export interface CreateExpenseParticipantInput {
  userId: string
  shareType: SplitType
  shareValue?: number // For percentage, shares, or custom amount
  shareAmount?: number // Pre-calculated amount (optional)
}

/**
 * Input for creating a new expense
 */
export interface CreateExpenseInput {
  tripId: string
  description: string
  amount: number // In minor units
  currency: string
  category: ExpenseCategory
  payerId: string
  date?: string // ISO 8601, defaults to today
  receiptUrl?: string
  participants: CreateExpenseParticipantInput[]
}

/**
 * Input for updating an existing expense
 */
export interface UpdateExpenseInput {
  description?: string
  amount?: number
  currency?: string
  category?: ExpenseCategory
  payerId?: string
  date?: string
  receiptUrl?: string
}

/**
 * Participant resolution input (supports name or ID)
 */
export interface ParticipantResolutionInput {
  identifier: string // Can be user_id or full_name
  shareType: SplitType
  shareValue?: number
}

/**
 * Split calculation result
 */
export interface SplitCalculation {
  userId: string
  shareAmount: number
  shareType: SplitType
  shareValue?: number
}

/**
 * Expense summary for ledger views
 */
export interface ExpenseSummary {
  totalExpenses: number
  currency: string
  expenseCount: number
  userBalance: number // Amount user owes (negative) or is owed (positive)
}
