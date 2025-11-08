/**
 * Settlement calculation and optimization utilities
 *
 * Provides functions to:
 * - Calculate net balances per user across expenses
 * - Optimize settlements to minimize transactions
 * - Handle multi-currency conversion to base currency
 */

import type { ExpenseWithDetails, UserBalance, OptimizedSettlement } from '../types/expense'

/**
 * Conversion result for an expense to base currency
 */
interface ConversionResult {
  amount: number // Converted amount in base currency minor units
  currency: string // Base currency
  needsFxRate: boolean // True if FX rate is missing
}

/**
 * Convert an expense amount to trip base currency
 *
 * @param expense - Expense with amount, currency, and optional fx_rate
 * @param baseCurrency - Trip base currency
 * @returns Conversion result with amount and FX rate status
 */
export function convertExpenseToBaseCurrency(
  expense: ExpenseWithDetails,
  baseCurrency: string
): ConversionResult {
  // If expense is already in base currency, return as-is
  if (expense.currency === baseCurrency) {
    return {
      amount: expense.amount,
      currency: baseCurrency,
      needsFxRate: false,
    }
  }

  // If expense is in different currency, check for FX rate
  if (expense.fx_rate === null || expense.fx_rate === undefined) {
    return {
      amount: 0,
      currency: baseCurrency,
      needsFxRate: true,
    }
  }

  // Convert using stored FX rate
  const convertedAmount = Math.round(expense.amount * expense.fx_rate)

  return {
    amount: convertedAmount,
    currency: baseCurrency,
    needsFxRate: false,
  }
}

/**
 * Calculate net balance for each user across all expenses
 *
 * Net balance = total paid - total owed
 * Positive balance = user is owed money
 * Negative balance = user owes money
 *
 * @param expenses - List of expenses with participants and payer details
 * @param baseCurrency - Trip base currency for conversion
 * @returns Array of user balances
 */
export function calculateUserBalances(
  expenses: ExpenseWithDetails[],
  baseCurrency: string
): UserBalance[] {
  if (expenses.length === 0) {
    return []
  }

  // Track net balance per user
  const balanceMap = new Map<string, { user_id: string; user_name: string; net_balance: number }>()

  // Process each expense
  for (const expense of expenses) {
    // Convert expense to base currency
    const conversion = convertExpenseToBaseCurrency(expense, baseCurrency)

    // Skip if FX rate is missing
    if (conversion.needsFxRate) {
      continue
    }

    const expenseAmount = conversion.amount

    // Credit the payer (they paid the full amount)
    if (!balanceMap.has(expense.payer_id)) {
      balanceMap.set(expense.payer_id, {
        user_id: expense.payer_id,
        user_name: expense.payer.full_name,
        net_balance: 0,
      })
    }

    const payerBalance = balanceMap.get(expense.payer_id)!
    payerBalance.net_balance += expenseAmount

    // Debit each participant (they owe their share)
    for (const participant of expense.participants) {
      if (!balanceMap.has(participant.user_id)) {
        balanceMap.set(participant.user_id, {
          user_id: participant.user_id,
          user_name: participant.user.full_name,
          net_balance: 0,
        })
      }

      const participantBalance = balanceMap.get(participant.user_id)!

      // Convert participant share to base currency if needed
      let shareInBaseCurrency = participant.share_amount

      // If expense was in foreign currency, convert share proportionally
      if (expense.currency !== baseCurrency && expense.fx_rate) {
        shareInBaseCurrency = Math.round(participant.share_amount * expense.fx_rate)
      }

      participantBalance.net_balance -= shareInBaseCurrency
    }
  }

  // Convert map to array and add currency
  return Array.from(balanceMap.values()).map(balance => ({
    ...balance,
    currency: baseCurrency,
  }))
}

/**
 * Optimize settlements to minimize number of transactions
 *
 * Uses greedy algorithm:
 * 1. Separate users into debtors (owe money) and creditors (owed money)
 * 2. Sort both by absolute amount (descending)
 * 3. Repeatedly match max debtor with max creditor until balanced
 *
 * @param balances - Array of user balances
 * @returns Array of optimized settlement suggestions
 */
export function optimizeSettlements(balances: UserBalance[]): OptimizedSettlement[] {
  if (balances.length === 0) {
    return []
  }

  // Create mutable copies for processing
  const debtors = balances
    .filter(b => b.net_balance < 0)
    .map(b => ({ ...b, remaining: Math.abs(b.net_balance) }))
    .sort((a, b) => b.remaining - a.remaining) // Sort descending

  const creditors = balances
    .filter(b => b.net_balance > 0)
    .map(b => ({ ...b, remaining: b.net_balance }))
    .sort((a, b) => b.remaining - a.remaining) // Sort descending

  // If no debts, return empty
  if (debtors.length === 0 || creditors.length === 0) {
    return []
  }

  const settlements: OptimizedSettlement[] = []
  let debtorIndex = 0
  let creditorIndex = 0

  // Greedy matching: max debtor pays max creditor
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]

    // Determine settlement amount (min of what debtor owes and creditor is owed)
    const settlementAmount = Math.min(debtor.remaining, creditor.remaining)

    // Skip if amount is negligible (handle rounding errors)
    if (settlementAmount <= 0) {
      break
    }

    // Create settlement
    settlements.push({
      from_user_id: debtor.user_id,
      from_user_name: debtor.user_name,
      to_user_id: creditor.user_id,
      to_user_name: creditor.user_name,
      amount: settlementAmount,
      currency: debtor.currency,
    })

    // Update remaining balances
    debtor.remaining -= settlementAmount
    creditor.remaining -= settlementAmount

    // Move to next debtor/creditor if fully settled
    if (debtor.remaining === 0) {
      debtorIndex++
    }
    if (creditor.remaining === 0) {
      creditorIndex++
    }
  }

  return settlements
}
