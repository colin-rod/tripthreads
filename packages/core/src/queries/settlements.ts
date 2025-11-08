/**
 * Settlement query operations
 *
 * Provides functions to calculate and retrieve settlement summaries for trips.
 * All queries respect RLS policies and handle multi-currency conversion.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database'
import { SettlementSummary, ExpenseWithDetails } from '../types/expense'
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

  return {
    balances,
    settlements,
    total_expenses: validExpenses.length,
    base_currency: baseCurrency,
    excluded_expenses: excludedExpenses,
  }
}
