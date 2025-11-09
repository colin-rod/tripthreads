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
export type SplitType = 'equal' | 'percentage' | 'amount'

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
  shareValue?: number // For percentage or custom amount
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

/**
 * User balance in settlement calculations
 * Shows net position for a participant (what they owe or are owed)
 */
export interface UserBalance {
  user_id: string
  user_name: string
  net_balance: number // In base currency minor units (positive = owed, negative = owes)
  currency: string // Trip base currency
}

/**
 * Settlement status tracking
 */
export type SettlementStatus = 'pending' | 'settled'

/**
 * Settlement record from database
 * Represents a persisted settlement between two users
 */
export interface Settlement {
  id: string
  trip_id: string
  from_user_id: string
  to_user_id: string
  amount: number // In base currency minor units
  currency: string // Trip base currency
  status: SettlementStatus
  settled_at?: string | null // ISO 8601 timestamp
  settled_by?: string | null // User ID who marked as paid
  note?: string | null // Optional payment note (e.g., "Paid via Venmo")
  created_at: string
  updated_at: string
}

/**
 * Settlement with user details for display
 */
export interface SettlementWithUsers extends Settlement {
  from_user: ExpenseUser
  to_user: ExpenseUser
  settled_by_user?: ExpenseUser | null
}

/**
 * Optimized settlement suggestion
 * Represents a single transfer to minimize total transactions
 * @deprecated Use Settlement interface for persisted settlements
 */
export interface OptimizedSettlement {
  from_user_id: string
  from_user_name: string
  to_user_id: string
  to_user_name: string
  amount: number // In base currency minor units
  currency: string // Trip base currency
}

/**
 * Input for creating or updating a settlement
 */
export interface UpsertSettlementInput {
  tripId: string
  fromUserId: string
  toUserId: string
  amount: number
  currency: string
}

/**
 * Input for marking a settlement as paid
 */
export interface MarkSettlementPaidInput {
  settlementId: string
  note?: string // Optional payment note
}

/**
 * Complete settlement summary for a trip
 * Includes both individual balances and settlement records (pending and settled)
 */
export interface SettlementSummary {
  balances: UserBalance[]
  pending_settlements: SettlementWithUsers[] // Unpaid settlements
  settled_settlements: SettlementWithUsers[] // Completed settlements
  total_expenses: number // Total number of expenses included
  base_currency: string
  excluded_expenses: string[] // IDs of expenses with missing FX rates
}
