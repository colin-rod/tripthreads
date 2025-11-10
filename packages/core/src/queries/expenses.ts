/**
 * Expense query operations
 *
 * Provides CRUD operations for expenses and expense participants.
 * All queries respect RLS policies for proper access control.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  Expense,
  ExpenseWithDetails,
  ExpenseParticipantWithUser,
  CreateExpenseInput,
  UpdateExpenseInput,
  CreateExpenseParticipantInput,
} from '../types/expense'
import { Database } from '../types/database'
import { calculateExpenseShares } from '../utils/expense-splits'

/**
 * Get all expenses for a trip that the current user can see
 * Respects RLS policies - only returns expenses user is involved in
 */
export async function getUserExpensesForTrip(
  supabase: SupabaseClient<Database>,
  tripId: string
): Promise<ExpenseWithDetails[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select(
      `
      *,
      payer:users!expenses_payer_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `
    )
    .eq('trip_id', tripId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch expenses: ${error.message}`)
  }

  // Fetch participants for each expense
  const expensesWithDetails = await Promise.all(
    data.map(async expense => {
      const participants = await getExpenseParticipants(supabase, expense.id)
      return {
        ...expense,
        participants,
      } as ExpenseWithDetails
    })
  )

  return expensesWithDetails
}

/**
 * Get a single expense by ID with full details (payer and participants)
 * Returns null if expense doesn't exist or user doesn't have permission
 */
export async function getExpenseById(
  supabase: SupabaseClient<Database>,
  expenseId: string
): Promise<ExpenseWithDetails | null> {
  // Fetch expense with payer details
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .select(
      `
      *,
      payer:users!expenses_payer_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `
    )
    .eq('id', expenseId)
    .single()

  if (expenseError || !expense) {
    return null
  }

  // Fetch participants with user details
  const { data: participants, error: participantsError } = await supabase
    .from('expense_participants')
    .select(
      `
      *,
      user:users (
        id,
        full_name,
        avatar_url
      )
    `
    )
    .eq('expense_id', expenseId)

  if (participantsError) {
    throw new Error(`Failed to fetch participants: ${participantsError.message}`)
  }

  return {
    ...expense,
    payer: expense.payer,
    participants,
  } as ExpenseWithDetails
}

/**
 * Create a new expense with participants
 * Calculates share amounts based on split type
 */
export async function createExpense(
  supabase: SupabaseClient<Database>,
  input: CreateExpenseInput
): Promise<Expense> {
  // Default date to today if not provided
  const date = input.date || new Date().toISOString().split('T')[0]

  const splitType = input.participants[0]?.shareType ?? 'equal'

  // Calculate share amounts
  const shares = calculateExpenseShares({
    totalAmount: input.amount,
    splitType,
    participants: input.participants.map(participant => ({
      userId: participant.userId,
      shareValue: participant.shareValue,
    })),
  })

  // Insert expense
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      trip_id: input.tripId,
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      category: input.category,
      payer_id: input.payerId,
      date,
      receipt_url: input.receiptUrl || null,
      fx_rate: null, // Will be calculated by backend trigger
      created_by: input.payerId, // Assume payer is creator
    })
    .select()
    .single()

  if (expenseError || !expense) {
    throw new Error(`Failed to create expense: ${expenseError?.message}`)
  }

  // Insert participants
  const participantInserts = shares.map(share => ({
    expense_id: expense.id,
    user_id: share.userId,
    share_amount: share.shareAmount,
    share_type: share.shareType,
    share_value: share.shareValue || null,
  }))

  const { error: participantsError } = await supabase
    .from('expense_participants')
    .insert(participantInserts)

  if (participantsError) {
    // Rollback expense if participants fail
    await supabase.from('expenses').delete().eq('id', expense.id)
    throw new Error(`Failed to create participants: ${participantsError.message}`)
  }

  return expense as Expense
}

/**
 * Update an existing expense
 * Does NOT update participants - use updateExpenseParticipants for that
 */
export async function updateExpense(
  supabase: SupabaseClient<Database>,
  expenseId: string,
  updates: UpdateExpenseInput
): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.amount !== undefined && { amount: updates.amount }),
      ...(updates.currency !== undefined && { currency: updates.currency }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.payerId !== undefined && { payer_id: updates.payerId }),
      ...(updates.date !== undefined && { date: updates.date }),
      ...(updates.receiptUrl !== undefined && { receipt_url: updates.receiptUrl }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', expenseId)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to update expense: ${error?.message}`)
  }

  return data as Expense
}

/**
 * Delete an expense and all its participants
 * RLS ensures only authorized users can delete
 */
export async function deleteExpense(
  supabase: SupabaseClient<Database>,
  expenseId: string
): Promise<void> {
  // Delete participants first (FK constraint)
  const { error: participantsError } = await supabase
    .from('expense_participants')
    .delete()
    .eq('expense_id', expenseId)

  if (participantsError) {
    throw new Error(`Failed to delete participants: ${participantsError.message}`)
  }

  // Delete expense
  const { error: expenseError } = await supabase.from('expenses').delete().eq('id', expenseId)

  if (expenseError) {
    throw new Error(`Failed to delete expense: ${expenseError.message}`)
  }
}

/**
 * Get participants for an expense
 * Returns empty array if expense doesn't exist or user doesn't have permission
 */
export async function getExpenseParticipants(
  supabase: SupabaseClient<Database>,
  expenseId: string
): Promise<ExpenseParticipantWithUser[]> {
  const { data, error } = await supabase
    .from('expense_participants')
    .select(
      `
      *,
      user:users (
        id,
        full_name,
        avatar_url
      )
    `
    )
    .eq('expense_id', expenseId)

  if (error) {
    throw new Error(`Failed to fetch participants: ${error.message}`)
  }

  return (data || []) as ExpenseParticipantWithUser[]
}

/**
 * Update participants for an expense
 * Replaces existing participants with new list
 */
export async function updateExpenseParticipants(
  supabase: SupabaseClient<Database>,
  expenseId: string,
  participants: CreateExpenseParticipantInput[]
): Promise<void> {
  // Get expense amount for recalculation
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .select('amount')
    .eq('id', expenseId)
    .single()

  if (expenseError || !expense) {
    throw new Error(`Failed to fetch expense: ${expenseError?.message}`)
  }

  const splitType = participants[0]?.shareType ?? 'equal'

  // Calculate new shares
  const shares = calculateExpenseShares({
    totalAmount: expense.amount,
    splitType,
    participants: participants.map(participant => ({
      userId: participant.userId,
      shareValue: participant.shareValue,
    })),
  })

  // Delete existing participants
  const { error: deleteError } = await supabase
    .from('expense_participants')
    .delete()
    .eq('expense_id', expenseId)

  if (deleteError) {
    throw new Error(`Failed to delete participants: ${deleteError.message}`)
  }

  // Insert new participants
  const participantInserts = shares.map(share => ({
    expense_id: expenseId,
    user_id: share.userId,
    share_amount: share.shareAmount,
    share_type: share.shareType,
    share_value: share.shareValue || null,
  }))

  const { error: insertError } = await supabase
    .from('expense_participants')
    .insert(participantInserts)

  if (insertError) {
    throw new Error(`Failed to insert participants: ${insertError.message}`)
  }
}
