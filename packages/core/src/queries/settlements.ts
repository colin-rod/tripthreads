/**
 * Settlement query operations
 *
 * Provides functions to calculate and retrieve settlement summaries for trips.
 * All queries respect RLS policies and handle multi-currency conversion.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database'
import {
  SettlementSummary,
  ExpenseWithDetails,
  OptimizedSettlement,
  SettlementWithUsers,
  MarkSettlementPaidInput,
} from '../types/expense'
import {
  calculateUserBalances,
  optimizeSettlements,
  convertExpenseToBaseCurrency,
} from '../utils/settlements'
import { getUserExpensesForTrip } from './expenses'

/**
 * Get trip base currency
 */
async function getTripBaseCurrency(
  supabase: SupabaseClient<Database>,
  tripId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('trips')
    .select('base_currency')
    .eq('id', tripId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to fetch trip: ${error?.message || 'Trip not found'}`)
  }

  return data.base_currency || 'EUR'
}

/**
 * Get settlement summary for a trip
 *
 * Calculates net balances across all expenses and provides optimized settlement suggestions.
 * Handles multi-currency conversion to trip base currency.
 * Respects RLS policies - only includes expenses visible to current user.
 *
 * @param supabase - Authenticated Supabase client
 * @param tripId - Trip ID
 * @returns Settlement summary with balances, optimized settlements, and excluded expenses
 */
export async function getSettlementSummary(
  supabase: SupabaseClient<Database>,
  tripId: string
): Promise<SettlementSummary> {
  // Fetch trip base currency
  const baseCurrency = await getTripBaseCurrency(supabase, tripId)

  // Fetch all expenses visible to current user (respects RLS + date scoping)
  const expenses = await getUserExpensesForTrip(supabase, tripId)

  // Handle empty case
  if (expenses.length === 0) {
    return {
      balances: [],
      settlements: [],
      total_expenses: 0,
      base_currency: baseCurrency,
      excluded_expenses: [],
    }
  }

  // Filter out expenses with missing FX rates
  const excludedExpenses: string[] = []
  const validExpenses: ExpenseWithDetails[] = []

  for (const expense of expenses) {
    const conversion = convertExpenseToBaseCurrency(expense, baseCurrency)
    if (conversion.needsFxRate) {
      excludedExpenses.push(expense.id)
    } else {
      validExpenses.push(expense)
    }
  }

  // Calculate balances from valid expenses
  const balances = calculateUserBalances(validExpenses, baseCurrency)

  // Optimize settlements to minimize transactions
  const settlements = optimizeSettlements(balances)

  // Upsert pending settlements to database (creates/updates based on optimization)
  await upsertSettlements(supabase, tripId, settlements, baseCurrency)

  // Fetch persisted settlements (pending and settled) with user details
  const { pending, settled } = await getPersistedSettlements(supabase, tripId)

  // Adjust balances to account for settled settlements
  const adjustedBalances = adjustBalancesForSettledSettlements(balances, settled)

  return {
    balances: adjustedBalances,
    pending_settlements: pending,
    settled_settlements: settled,
    total_expenses: validExpenses.length,
    base_currency: baseCurrency,
    excluded_expenses: excludedExpenses,
  }
}

/**
 * Fetch persisted settlements from database with user details
 *
 * @param supabase - Authenticated Supabase client
 * @param tripId - Trip ID
 * @returns Pending and settled settlements with user details
 */
async function getPersistedSettlements(
  supabase: SupabaseClient<Database>,
  tripId: string
): Promise<{ pending: SettlementWithUsers[]; settled: SettlementWithUsers[] }> {
  const { data, error } = await supabase
    .from('settlements')
    .select(
      `
      *,
      from_user:users!settlements_from_user_id_fkey(id, full_name, avatar_url),
      to_user:users!settlements_to_user_id_fkey(id, full_name, avatar_url),
      settled_by_user:users!settlements_settled_by_fkey(id, full_name, avatar_url)
    `
    )
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch settlements: ${error.message}`)
  }

  // Transform database rows to SettlementWithUsers type
  const settlements: SettlementWithUsers[] = (data || []).map(row => ({
    id: row.id,
    trip_id: row.trip_id,
    from_user_id: row.from_user_id,
    to_user_id: row.to_user_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status as 'pending' | 'settled',
    settled_at: row.settled_at || null,
    settled_by: row.settled_by || null,
    note: row.note || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    from_user: {
      id: row.from_user.id,
      full_name: row.from_user.full_name,
      avatar_url: row.from_user.avatar_url,
    },
    to_user: {
      id: row.to_user.id,
      full_name: row.to_user.full_name,
      avatar_url: row.to_user.avatar_url,
    },
    settled_by_user: row.settled_by_user
      ? {
          id: row.settled_by_user.id,
          full_name: row.settled_by_user.full_name,
          avatar_url: row.settled_by_user.avatar_url,
        }
      : null,
  }))

  const pending = settlements.filter(s => s.status === 'pending')
  const settled = settlements.filter(s => s.status === 'settled')

  return { pending, settled }
}

/**
 * Adjust user balances to account for settled settlements
 *
 * Settled settlements should reduce the net balance for both parties:
 * - If Benji settled a payment to Alice for €10, Benji's debt is reduced by €10, Alice's credit is reduced by €10
 *
 * @param balances - Original balances from expense calculations
 * @param settledSettlements - Settled settlement records
 * @returns Adjusted balances
 */
function adjustBalancesForSettledSettlements(
  balances: Array<{ user_id: string; user_name: string; net_balance: number; currency: string }>,
  settledSettlements: SettlementWithUsers[]
): Array<{ user_id: string; user_name: string; net_balance: number; currency: string }> {
  // Clone balances to avoid mutation
  const adjusted = balances.map(b => ({ ...b }))

  // For each settled settlement, reduce balances for both parties
  for (const settlement of settledSettlements) {
    const fromUser = adjusted.find(b => b.user_id === settlement.from_user_id)
    const toUser = adjusted.find(b => b.user_id === settlement.to_user_id)

    if (fromUser) {
      // from_user paid, so their negative balance increases (becomes less negative)
      fromUser.net_balance += settlement.amount
    }

    if (toUser) {
      // to_user received, so their positive balance decreases (becomes less positive)
      toUser.net_balance -= settlement.amount
    }
  }

  return adjusted
}

/**
 * Upsert settlements to database
 *
 * Creates new pending settlement records or updates existing ones based on optimization algorithm.
 * Does NOT modify settled settlements (status='settled').
 *
 * @param supabase - Authenticated Supabase client
 * @param tripId - Trip ID
 * @param optimizedSettlements - Optimized settlement suggestions
 * @param currency - Trip base currency
 */
export async function upsertSettlements(
  supabase: SupabaseClient<Database>,
  tripId: string,
  optimizedSettlements: OptimizedSettlement[],
  currency: string
): Promise<void> {
  // Fetch existing pending settlements (ignore settled ones)
  const { data: existingSettlements } = await supabase
    .from('settlements')
    .select('*')
    .eq('trip_id', tripId)
    .eq('status', 'pending')

  const existing = existingSettlements || []

  // Create a map of existing settlements by (from_user, to_user) key
  const existingMap = new Map<string, (typeof existing)[0]>()
  for (const settlement of existing) {
    const key = `${settlement.from_user_id}->${settlement.to_user_id}`
    existingMap.set(key, settlement)
  }

  // Upsert optimized settlements
  const toUpsert = optimizedSettlements.map(opt => {
    const key = `${opt.from_user_id}->${opt.to_user_id}`
    const existing = existingMap.get(key)

    if (existing) {
      // Update existing settlement amount
      return {
        id: existing.id,
        trip_id: tripId,
        from_user_id: opt.from_user_id,
        to_user_id: opt.to_user_id,
        amount: opt.amount,
        currency,
        status: 'pending' as const,
      }
    } else {
      // Create new settlement
      return {
        trip_id: tripId,
        from_user_id: opt.from_user_id,
        to_user_id: opt.to_user_id,
        amount: opt.amount,
        currency,
        status: 'pending' as const,
      }
    }
  })

  // Delete pending settlements that are no longer in optimized list
  const optimizedKeys = new Set(
    optimizedSettlements.map(opt => `${opt.from_user_id}->${opt.to_user_id}`)
  )
  const toDelete = existing.filter(s => {
    const key = `${s.from_user_id}->${s.to_user_id}`
    return !optimizedKeys.has(key)
  })

  // Execute upserts
  if (toUpsert.length > 0) {
    const { error } = await supabase.from('settlements').upsert(toUpsert, {
      onConflict: 'id',
    })

    if (error) {
      throw new Error(`Failed to upsert settlements: ${error.message}`)
    }
  }

  // Execute deletes
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('settlements')
      .delete()
      .in(
        'id',
        toDelete.map(s => s.id)
      )

    if (error) {
      throw new Error(`Failed to delete obsolete settlements: ${error.message}`)
    }
  }
}

/**
 * Mark a settlement as paid
 *
 * Updates a pending settlement to settled status with timestamp and optional note.
 * Only the from_user (debtor) or to_user (creditor) can mark a settlement as paid.
 *
 * @param supabase - Authenticated Supabase client
 * @param input - Settlement ID and optional note
 */
export async function markSettlementAsPaid(
  supabase: SupabaseClient<Database>,
  input: MarkSettlementPaidInput
): Promise<void> {
  // Get current user ID
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  // Update settlement status (RLS policy will enforce that user is from_user or to_user)
  const { error } = await supabase
    .from('settlements')
    .update({
      status: 'settled',
      settled_at: new Date().toISOString(),
      settled_by: user.id,
      note: input.note || null,
    })
    .eq('id', input.settlementId)
    .eq('status', 'pending') // Only update pending settlements

  if (error) {
    throw new Error(`Failed to mark settlement as paid: ${error.message}`)
  }
}
