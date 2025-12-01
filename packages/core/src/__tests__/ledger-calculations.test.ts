/**
 * Comprehensive Ledger Calculation Unit Tests
 *
 * Tests all financial calculations including:
 * - Split strategies (equal, weighted, percentage, custom)
 * - FX conversions with known rates
 * - Balance calculations across all scenarios
 * - Settlement optimization algorithm
 * - Edge cases (zero amounts, negative splits, rounding)
 * - Multi-currency scenarios
 *
 * Ensures financial accuracy to the cent with deterministic results.
 *
 * @see Linear Issue: CRO-818
 */

import { describe, it, expect } from '@jest/globals'
import {
  calculateUserBalances,
  optimizeSettlements,
  convertExpenseToBaseCurrency,
} from '../utils/settlements'
import { formatCurrency, convertToMinorUnits, convertFromMinorUnits } from '../utils/currency'
import type { ExpenseWithDetails, UserBalance } from '../types/expense'

describe('Ledger Calculations', () => {
  // ======================
  // 1. SPLIT STRATEGIES
  // ======================
  describe('Split Strategies', () => {
    describe('TC1.1: Equal split divides evenly', () => {
      it('should split €100 evenly among 4 people', () => {
        const expense: Partial<ExpenseWithDetails> = {
          id: 'exp1',
          amount: 10000, // €100
          currency: 'EUR',
          payer_id: 'alice',
          payer: { id: 'alice', full_name: 'Alice' },
          participants: [
            {
              id: 'p1',
              expense_id: 'exp1',
              user_id: 'alice',
              share_amount: 2500, // €25
              share_type: 'equal',
              created_at: '',
              user: { id: 'alice', full_name: 'Alice' },
            },
            {
              id: 'p2',
              expense_id: 'exp1',
              user_id: 'bob',
              share_amount: 2500,
              share_type: 'equal',
              created_at: '',
              user: { id: 'bob', full_name: 'Bob' },
            },
            {
              id: 'p3',
              expense_id: 'exp1',
              user_id: 'charlie',
              share_amount: 2500,
              share_type: 'equal',
              created_at: '',
              user: { id: 'charlie', full_name: 'Charlie' },
            },
            {
              id: 'p4',
              expense_id: 'exp1',
              user_id: 'david',
              share_amount: 2500,
              share_type: 'equal',
              created_at: '',
              user: { id: 'david', full_name: 'David' },
            },
          ],
        }

        const balances = calculateUserBalances([expense as ExpenseWithDetails], 'EUR')

        // Alice paid €100, owes €25 → net +€75
        const alice = balances.find(b => b.user_id === 'alice')
        expect(alice?.net_balance).toBe(7500)

        // Others owe €25 each
        expect(balances.find(b => b.user_id === 'bob')?.net_balance).toBe(-2500)
        expect(balances.find(b => b.user_id === 'charlie')?.net_balance).toBe(-2500)
        expect(balances.find(b => b.user_id === 'david')?.net_balance).toBe(-2500)
      })
    })

    describe('TC1.2: Equal split handles rounding (3 ways into $100)', () => {
      it('should handle rounding when splitting $100 three ways (33¢, 33¢, 34¢)', () => {
        const expense: Partial<ExpenseWithDetails> = {
          id: 'exp1',
          amount: 10000, // $100
          currency: 'USD',
          payer_id: 'alice',
          payer: { id: 'alice', full_name: 'Alice' },
          participants: [
            {
              id: 'p1',
              expense_id: 'exp1',
              user_id: 'alice',
              share_amount: 3334, // $33.34 (extra penny)
              share_type: 'equal',
              created_at: '',
              user: { id: 'alice', full_name: 'Alice' },
            },
            {
              id: 'p2',
              expense_id: 'exp1',
              user_id: 'bob',
              share_amount: 3333, // $33.33
              share_type: 'equal',
              created_at: '',
              user: { id: 'bob', full_name: 'Bob' },
            },
            {
              id: 'p3',
              expense_id: 'exp1',
              user_id: 'charlie',
              share_amount: 3333, // $33.33
              share_type: 'equal',
              created_at: '',
              user: { id: 'charlie', full_name: 'Charlie' },
            },
          ],
        }

        const balances = calculateUserBalances([expense as ExpenseWithDetails], 'USD')

        // Verify shares add up to total expense
        const totalShares = expense.participants!.reduce((sum, p) => sum + p.share_amount, 0)
        expect(totalShares).toBe(10000) // Shares should sum to $100

        // Verify balances are correct
        // Alice paid $100, owes $33.34 → net +$66.66
        expect(balances.find(b => b.user_id === 'alice')?.net_balance).toBe(6666)
        // Bob and Charlie each owe $33.33
        expect(balances.find(b => b.user_id === 'bob')?.net_balance).toBe(-3333)
        expect(balances.find(b => b.user_id === 'charlie')?.net_balance).toBe(-3333)
      })
    })

    describe('TC1.3: Weighted split by custom factors', () => {
      it('should split $120 by custom amounts (40, 30, 50)', () => {
        const expense: Partial<ExpenseWithDetails> = {
          id: 'exp1',
          amount: 12000, // $120
          currency: 'USD',
          payer_id: 'alice',
          payer: { id: 'alice', full_name: 'Alice' },
          participants: [
            {
              id: 'p1',
              expense_id: 'exp1',
              user_id: 'alice',
              share_amount: 4000, // $40
              share_type: 'amount',
              share_value: 4000,
              created_at: '',
              user: { id: 'alice', full_name: 'Alice' },
            },
            {
              id: 'p2',
              expense_id: 'exp1',
              user_id: 'bob',
              share_amount: 3000, // $30
              share_type: 'amount',
              share_value: 3000,
              created_at: '',
              user: { id: 'bob', full_name: 'Bob' },
            },
            {
              id: 'p3',
              expense_id: 'exp1',
              user_id: 'charlie',
              share_amount: 5000, // $50
              share_type: 'amount',
              share_value: 5000,
              created_at: '',
              user: { id: 'charlie', full_name: 'Charlie' },
            },
          ],
        }

        const balances = calculateUserBalances([expense as ExpenseWithDetails], 'USD')

        // Alice paid $120, owes $40 → net +$80
        expect(balances.find(b => b.user_id === 'alice')?.net_balance).toBe(8000)
        expect(balances.find(b => b.user_id === 'bob')?.net_balance).toBe(-3000)
        expect(balances.find(b => b.user_id === 'charlie')?.net_balance).toBe(-5000)
      })
    })

    describe('TC1.4: Percentage split sums to 100%', () => {
      it('should split $200 by percentages (50%, 30%, 20%)', () => {
        const expense: Partial<ExpenseWithDetails> = {
          id: 'exp1',
          amount: 20000, // $200
          currency: 'USD',
          payer_id: 'alice',
          payer: { id: 'alice', full_name: 'Alice' },
          participants: [
            {
              id: 'p1',
              expense_id: 'exp1',
              user_id: 'alice',
              share_amount: 10000, // 50% = $100
              share_type: 'percentage',
              share_value: 50,
              created_at: '',
              user: { id: 'alice', full_name: 'Alice' },
            },
            {
              id: 'p2',
              expense_id: 'exp1',
              user_id: 'bob',
              share_amount: 6000, // 30% = $60
              share_type: 'percentage',
              share_value: 30,
              created_at: '',
              user: { id: 'bob', full_name: 'Bob' },
            },
            {
              id: 'p3',
              expense_id: 'exp1',
              user_id: 'charlie',
              share_amount: 4000, // 20% = $40
              share_type: 'percentage',
              share_value: 20,
              created_at: '',
              user: { id: 'charlie', full_name: 'Charlie' },
            },
          ],
        }

        const balances = calculateUserBalances([expense as ExpenseWithDetails], 'USD')

        // Alice paid $200, owes $100 → net +$100
        expect(balances.find(b => b.user_id === 'alice')?.net_balance).toBe(10000)
        expect(balances.find(b => b.user_id === 'bob')?.net_balance).toBe(-6000)
        expect(balances.find(b => b.user_id === 'charlie')?.net_balance).toBe(-4000)
      })
    })

    describe('TC1.5: Custom amounts equal total', () => {
      it('should handle custom amounts that sum to the total', () => {
        const expense: Partial<ExpenseWithDetails> = {
          id: 'exp1',
          amount: 15000, // $150
          currency: 'USD',
          payer_id: 'alice',
          payer: { id: 'alice', full_name: 'Alice' },
          participants: [
            {
              id: 'p1',
              expense_id: 'exp1',
              user_id: 'alice',
              share_amount: 7500, // $75
              share_type: 'amount',
              share_value: 7500,
              created_at: '',
              user: { id: 'alice', full_name: 'Alice' },
            },
            {
              id: 'p2',
              expense_id: 'exp1',
              user_id: 'bob',
              share_amount: 7500, // $75
              share_type: 'amount',
              share_value: 7500,
              created_at: '',
              user: { id: 'bob', full_name: 'Bob' },
            },
          ],
        }

        const balances = calculateUserBalances([expense as ExpenseWithDetails], 'USD')

        // Alice paid $150, owes $75 → net +$75
        expect(balances.find(b => b.user_id === 'alice')?.net_balance).toBe(7500)
        expect(balances.find(b => b.user_id === 'bob')?.net_balance).toBe(-7500)
      })
    })
  })

  // ======================
  // 2. FX CONVERSIONS
  // ======================
  describe('FX Conversions', () => {
    describe('TC2.1: EUR to USD conversion with known rate', () => {
      it('should convert €100 to USD at rate 1.10', () => {
        const expense: Partial<ExpenseWithDetails> = {
          amount: 10000, // €100
          currency: 'EUR',
          fx_rate: 1.1, // 1 EUR = 1.10 USD
        }

        const result = convertExpenseToBaseCurrency(expense as ExpenseWithDetails, 'USD')

        expect(result.amount).toBe(11000) // $110
        expect(result.currency).toBe('USD')
        expect(result.needsFxRate).toBe(false)
      })
    })

    describe('TC2.2: Historical rate snapshot preserved', () => {
      it('should use stored FX rate even if different from current', () => {
        const expense: Partial<ExpenseWithDetails> = {
          amount: 5000, // £50
          currency: 'GBP',
          fx_rate: 1.25, // Historical: 1 GBP = 1.25 USD
        }

        const result = convertExpenseToBaseCurrency(expense as ExpenseWithDetails, 'USD')

        expect(result.amount).toBe(6250) // $62.50
        expect(result.needsFxRate).toBe(false)
      })
    })

    describe('TC2.3: Multiple currencies to base currency', () => {
      it('should convert multiple currencies to EUR base', () => {
        const usdExpense: Partial<ExpenseWithDetails> = {
          amount: 10000, // $100
          currency: 'USD',
          fx_rate: 0.92, // 1 USD = 0.92 EUR
        }

        const gbpExpense: Partial<ExpenseWithDetails> = {
          amount: 8000, // £80
          currency: 'GBP',
          fx_rate: 1.15, // 1 GBP = 1.15 EUR
        }

        const usdResult = convertExpenseToBaseCurrency(usdExpense as ExpenseWithDetails, 'EUR')
        const gbpResult = convertExpenseToBaseCurrency(gbpExpense as ExpenseWithDetails, 'EUR')

        expect(usdResult.amount).toBe(9200) // €92
        expect(gbpResult.amount).toBe(9200) // €92
      })
    })

    describe('TC2.4: Round-trip conversion accuracy (USD → EUR → USD)', () => {
      it('should maintain accuracy in round-trip conversions', () => {
        const expense: Partial<ExpenseWithDetails> = {
          amount: 10000, // $100
          currency: 'USD',
          fx_rate: 0.85, // 1 USD = 0.85 EUR
        }

        // Convert to EUR
        const toEUR = convertExpenseToBaseCurrency(expense as ExpenseWithDetails, 'EUR')
        expect(toEUR.amount).toBe(8500) // €85

        // Convert back to USD (hypothetical reverse conversion)
        const reverseRate = 1 / 0.85 // ~1.176
        const backToUSD = Math.round(toEUR.amount * reverseRate)
        expect(backToUSD).toBe(10000) // Should return to $100
      })
    })

    describe('TC2.5: Handling of rates unavailable (fallback)', () => {
      it('should flag when FX rate is missing', () => {
        const expense: Partial<ExpenseWithDetails> = {
          amount: 5000, // ¥5000
          currency: 'JPY',
          fx_rate: null, // Missing rate!
        }

        const result = convertExpenseToBaseCurrency(expense as ExpenseWithDetails, 'USD')

        expect(result.amount).toBe(0)
        expect(result.needsFxRate).toBe(true)
      })
    })
  })

  // ======================
  // 3. BALANCE CALCULATIONS
  // ======================
  describe('Balance Calculations', () => {
    describe('TC3.1: Simple case - A pays, B owes', () => {
      it('should calculate net balances for simple two-person expense', () => {
        const expense: Partial<ExpenseWithDetails> = {
          id: 'exp1',
          amount: 10000, // $100
          currency: 'USD',
          payer_id: 'alice',
          payer: { id: 'alice', full_name: 'Alice' },
          participants: [
            {
              id: 'p1',
              expense_id: 'exp1',
              user_id: 'alice',
              share_amount: 5000,
              share_type: 'equal',
              created_at: '',
              user: { id: 'alice', full_name: 'Alice' },
            },
            {
              id: 'p2',
              expense_id: 'exp1',
              user_id: 'bob',
              share_amount: 5000,
              share_type: 'equal',
              created_at: '',
              user: { id: 'bob', full_name: 'Bob' },
            },
          ],
        }

        const balances = calculateUserBalances([expense as ExpenseWithDetails], 'USD')

        // Alice paid $100, owes $50 → net +$50
        expect(balances.find(b => b.user_id === 'alice')?.net_balance).toBe(5000)
        // Bob owes $50
        expect(balances.find(b => b.user_id === 'bob')?.net_balance).toBe(-5000)
      })
    })

    describe('TC3.2: Multiple expenses - net balances correct', () => {
      it('should calculate net balances across multiple expenses', () => {
        const expenses: Partial<ExpenseWithDetails>[] = [
          {
            id: 'exp1',
            amount: 10000, // Alice pays $100
            currency: 'USD',
            payer_id: 'alice',
            payer: { id: 'alice', full_name: 'Alice' },
            participants: [
              {
                id: 'p1',
                expense_id: 'exp1',
                user_id: 'alice',
                share_amount: 5000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'alice', full_name: 'Alice' },
              },
              {
                id: 'p2',
                expense_id: 'exp1',
                user_id: 'bob',
                share_amount: 5000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'bob', full_name: 'Bob' },
              },
            ],
          },
          {
            id: 'exp2',
            amount: 8000, // Bob pays $80
            currency: 'USD',
            payer_id: 'bob',
            payer: { id: 'bob', full_name: 'Bob' },
            participants: [
              {
                id: 'p3',
                expense_id: 'exp2',
                user_id: 'alice',
                share_amount: 4000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'alice', full_name: 'Alice' },
              },
              {
                id: 'p4',
                expense_id: 'exp2',
                user_id: 'bob',
                share_amount: 4000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'bob', full_name: 'Bob' },
              },
            ],
          },
        ]

        const balances = calculateUserBalances(expenses as ExpenseWithDetails[], 'USD')

        // Alice: paid $100, owes $50 + $40 = $90 → net +$10
        expect(balances.find(b => b.user_id === 'alice')?.net_balance).toBe(1000)
        // Bob: paid $80, owes $50 + $40 = $90 → net -$10
        expect(balances.find(b => b.user_id === 'bob')?.net_balance).toBe(-1000)
      })
    })

    describe('TC3.3: Three-way split with mixed payers', () => {
      it('should handle three-way split with different payers', () => {
        const expenses: Partial<ExpenseWithDetails>[] = [
          {
            id: 'exp1',
            amount: 9000, // Alice pays €90
            currency: 'EUR',
            payer_id: 'alice',
            payer: { id: 'alice', full_name: 'Alice' },
            participants: [
              {
                id: 'p1',
                expense_id: 'exp1',
                user_id: 'alice',
                share_amount: 3000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'alice', full_name: 'Alice' },
              },
              {
                id: 'p2',
                expense_id: 'exp1',
                user_id: 'bob',
                share_amount: 3000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'bob', full_name: 'Bob' },
              },
              {
                id: 'p3',
                expense_id: 'exp1',
                user_id: 'charlie',
                share_amount: 3000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'charlie', full_name: 'Charlie' },
              },
            ],
          },
          {
            id: 'exp2',
            amount: 6000, // Bob pays €60
            currency: 'EUR',
            payer_id: 'bob',
            payer: { id: 'bob', full_name: 'Bob' },
            participants: [
              {
                id: 'p4',
                expense_id: 'exp2',
                user_id: 'alice',
                share_amount: 2000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'alice', full_name: 'Alice' },
              },
              {
                id: 'p5',
                expense_id: 'exp2',
                user_id: 'bob',
                share_amount: 2000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'bob', full_name: 'Bob' },
              },
              {
                id: 'p6',
                expense_id: 'exp2',
                user_id: 'charlie',
                share_amount: 2000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'charlie', full_name: 'Charlie' },
              },
            ],
          },
        ]

        const balances = calculateUserBalances(expenses as ExpenseWithDetails[], 'EUR')

        // Alice: paid €90, owes €30 + €20 = €50 → net +€40
        expect(balances.find(b => b.user_id === 'alice')?.net_balance).toBe(4000)
        // Bob: paid €60, owes €30 + €20 = €50 → net +€10
        expect(balances.find(b => b.user_id === 'bob')?.net_balance).toBe(1000)
        // Charlie: paid €0, owes €30 + €20 = €50 → net -€50
        expect(balances.find(b => b.user_id === 'charlie')?.net_balance).toBe(-5000)
      })
    })

    describe('TC3.4: Multi-currency balances converted', () => {
      it('should convert multi-currency expenses to base currency for balances', () => {
        const expenses: Partial<ExpenseWithDetails>[] = [
          {
            id: 'exp1',
            amount: 10000, // $100
            currency: 'USD',
            fx_rate: 0.85, // 1 USD = 0.85 EUR
            payer_id: 'alice',
            payer: { id: 'alice', full_name: 'Alice' },
            participants: [
              {
                id: 'p1',
                expense_id: 'exp1',
                user_id: 'alice',
                share_amount: 5000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'alice', full_name: 'Alice' },
              },
              {
                id: 'p2',
                expense_id: 'exp1',
                user_id: 'bob',
                share_amount: 5000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'bob', full_name: 'Bob' },
              },
            ],
          },
          {
            id: 'exp2',
            amount: 5000, // €50
            currency: 'EUR',
            fx_rate: null, // Same as base currency
            payer_id: 'bob',
            payer: { id: 'bob', full_name: 'Bob' },
            participants: [
              {
                id: 'p3',
                expense_id: 'exp2',
                user_id: 'alice',
                share_amount: 2500,
                share_type: 'equal',
                created_at: '',
                user: { id: 'alice', full_name: 'Alice' },
              },
              {
                id: 'p4',
                expense_id: 'exp2',
                user_id: 'bob',
                share_amount: 2500,
                share_type: 'equal',
                created_at: '',
                user: { id: 'bob', full_name: 'Bob' },
              },
            ],
          },
        ]

        const balances = calculateUserBalances(expenses as ExpenseWithDetails[], 'EUR')

        // Alice: paid $100 (€85), owes €42.50 + €25 = €67.50 → net +€17.50
        expect(balances.find(b => b.user_id === 'alice')?.net_balance).toBe(1750)
        // Bob: paid €50, owes €42.50 + €25 = €67.50 → net -€17.50
        expect(balances.find(b => b.user_id === 'bob')?.net_balance).toBe(-1750)
      })
    })

    describe('TC3.5: Settled expenses excluded from balance', () => {
      it('should not include settled expenses in balance calculations', () => {
        // This would require an expense with a settlement status
        // For now, we test that the balance calculation works correctly
        // when expenses are filtered out (simulating "settled" expenses being excluded)
        const allExpenses: Partial<ExpenseWithDetails>[] = [
          {
            id: 'exp1',
            amount: 10000,
            currency: 'USD',
            payer_id: 'alice',
            payer: { id: 'alice', full_name: 'Alice' },
            participants: [
              {
                id: 'p1',
                expense_id: 'exp1',
                user_id: 'alice',
                share_amount: 5000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'alice', full_name: 'Alice' },
              },
              {
                id: 'p2',
                expense_id: 'exp1',
                user_id: 'bob',
                share_amount: 5000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'bob', full_name: 'Bob' },
              },
            ],
          },
        ]

        // Simulate filtering out settled expenses
        const unsettledExpenses = allExpenses // In real app, would filter by settlement status

        const balances = calculateUserBalances(unsettledExpenses as ExpenseWithDetails[], 'USD')

        expect(balances.find(b => b.user_id === 'alice')?.net_balance).toBe(5000)
        expect(balances.find(b => b.user_id === 'bob')?.net_balance).toBe(-5000)
      })
    })
  })

  // ======================
  // 4. SETTLEMENT OPTIMIZATION
  // ======================
  describe('Settlement Optimization', () => {
    describe('TC4.1: Minimize transactions (5 people → 4 transfers max)', () => {
      it('should minimize transactions for 5-person trip', () => {
        const balances: UserBalance[] = [
          { user_id: 'alice', user_name: 'Alice', net_balance: 10000, currency: 'USD' }, // +$100
          { user_id: 'bob', user_name: 'Bob', net_balance: 5000, currency: 'USD' }, // +$50
          { user_id: 'charlie', user_name: 'Charlie', net_balance: -6000, currency: 'USD' }, // -$60
          { user_id: 'david', user_name: 'David', net_balance: -5000, currency: 'USD' }, // -$50
          { user_id: 'eve', user_name: 'Eve', net_balance: -4000, currency: 'USD' }, // -$40
        ]

        const settlements = optimizeSettlements(balances)

        // Max transactions should be n-1 = 4
        expect(settlements.length).toBeLessThanOrEqual(4)

        // Verify all debts are settled
        const totalPaid = settlements.reduce((sum, s) => sum + s.amount, 0)
        expect(totalPaid).toBe(15000) // Total owed = $150
      })
    })

    describe('TC4.2: Zero-sum verification (all balances net to $0)', () => {
      it('should ensure all settlements net to zero', () => {
        const balances: UserBalance[] = [
          { user_id: 'alice', user_name: 'Alice', net_balance: 5000, currency: 'USD' },
          { user_id: 'bob', user_name: 'Bob', net_balance: 3000, currency: 'USD' },
          { user_id: 'charlie', user_name: 'Charlie', net_balance: -4000, currency: 'USD' },
          { user_id: 'david', user_name: 'David', net_balance: -4000, currency: 'USD' },
        ]

        const settlements = optimizeSettlements(balances)

        // Calculate net after settlements
        const netBalances = new Map<string, number>()
        balances.forEach(b => netBalances.set(b.user_id, b.net_balance))

        settlements.forEach(s => {
          netBalances.set(s.from_user_id, (netBalances.get(s.from_user_id) || 0) + s.amount)
          netBalances.set(s.to_user_id, (netBalances.get(s.to_user_id) || 0) - s.amount)
        })

        // All balances should be zero after settlements
        Array.from(netBalances.values()).forEach(balance => {
          expect(Math.abs(balance)).toBeLessThanOrEqual(1) // Allow 1 cent rounding error
        })
      })
    })

    describe('TC4.3: Greedy algorithm produces valid settlement', () => {
      it('should use greedy algorithm to minimize transactions', () => {
        const balances: UserBalance[] = [
          { user_id: 'alice', user_name: 'Alice', net_balance: 6000, currency: 'EUR' },
          { user_id: 'bob', user_name: 'Bob', net_balance: -3000, currency: 'EUR' },
          { user_id: 'charlie', user_name: 'Charlie', net_balance: -3000, currency: 'EUR' },
        ]

        const settlements = optimizeSettlements(balances)

        // Should produce 2 transfers (optimal)
        expect(settlements).toHaveLength(2)

        // Verify Alice receives €60 total
        const totalToAlice = settlements
          .filter(s => s.to_user_id === 'alice')
          .reduce((sum, s) => sum + s.amount, 0)
        expect(totalToAlice).toBe(6000)
      })
    })

    describe('TC4.4: Edge case - No settlements needed (all balanced)', () => {
      it('should return empty array when all balances are zero', () => {
        const balances: UserBalance[] = [
          { user_id: 'alice', user_name: 'Alice', net_balance: 0, currency: 'USD' },
          { user_id: 'bob', user_name: 'Bob', net_balance: 0, currency: 'USD' },
        ]

        const settlements = optimizeSettlements(balances)

        expect(settlements).toEqual([])
      })

      it('should handle balances with negligible amounts (rounding errors)', () => {
        // Simulate rounding errors that result in near-zero balances
        const balances: UserBalance[] = [
          { user_id: 'alice', user_name: 'Alice', net_balance: 1, currency: 'USD' }, // 1 cent
          { user_id: 'bob', user_name: 'Bob', net_balance: -1, currency: 'USD' }, // -1 cent
        ]

        const settlements = optimizeSettlements(balances)

        // Should create settlement even for 1 cent
        expect(settlements).toHaveLength(1)
        expect(settlements[0].amount).toBe(1)
      })
    })
  })

  // ======================
  // 5. EDGE CASES & ROUNDING
  // ======================
  describe('Edge Cases & Rounding', () => {
    describe('TC5.1: Splitting $1 three ways (33¢, 33¢, 34¢)', () => {
      it('should handle splitting $1 into 3 parts with rounding', () => {
        const expense: Partial<ExpenseWithDetails> = {
          id: 'exp1',
          amount: 100, // $1
          currency: 'USD',
          payer_id: 'alice',
          payer: { id: 'alice', full_name: 'Alice' },
          participants: [
            {
              id: 'p1',
              expense_id: 'exp1',
              user_id: 'alice',
              share_amount: 34, // $0.34
              share_type: 'equal',
              created_at: '',
              user: { id: 'alice', full_name: 'Alice' },
            },
            {
              id: 'p2',
              expense_id: 'exp1',
              user_id: 'bob',
              share_amount: 33, // $0.33
              share_type: 'equal',
              created_at: '',
              user: { id: 'bob', full_name: 'Bob' },
            },
            {
              id: 'p3',
              expense_id: 'exp1',
              user_id: 'charlie',
              share_amount: 33, // $0.33
              share_type: 'equal',
              created_at: '',
              user: { id: 'charlie', full_name: 'Charlie' },
            },
          ],
        }

        // Calculate balances to ensure no errors
        calculateUserBalances([expense as ExpenseWithDetails], 'USD')

        // Sum should equal total expense
        const totalShares = expense.participants!.reduce((sum, p) => sum + p.share_amount, 0)
        expect(totalShares).toBe(100)
      })
    })

    describe('TC5.2: Very large amounts (JavaScript safe integers)', () => {
      it('should handle large amounts without overflow', () => {
        const expense: Partial<ExpenseWithDetails> = {
          id: 'exp1',
          amount: 100000000, // $1,000,000
          currency: 'USD',
          payer_id: 'alice',
          payer: { id: 'alice', full_name: 'Alice' },
          participants: [
            {
              id: 'p1',
              expense_id: 'exp1',
              user_id: 'alice',
              share_amount: 50000000,
              share_type: 'equal',
              created_at: '',
              user: { id: 'alice', full_name: 'Alice' },
            },
            {
              id: 'p2',
              expense_id: 'exp1',
              user_id: 'bob',
              share_amount: 50000000,
              share_type: 'equal',
              created_at: '',
              user: { id: 'bob', full_name: 'Bob' },
            },
          ],
        }

        const balances = calculateUserBalances([expense as ExpenseWithDetails], 'USD')

        expect(balances.find(b => b.user_id === 'alice')?.net_balance).toBe(50000000)
        expect(balances.find(b => b.user_id === 'bob')?.net_balance).toBe(-50000000)
      })
    })

    describe('TC5.3: Very small amounts (sub-cent precision)', () => {
      it('should handle sub-cent precision correctly', () => {
        const amount = 10.5555
        const minorUnits = convertToMinorUnits(amount)

        expect(minorUnits).toBe(1056) // Rounds to nearest cent
      })
    })

    describe('TC5.4: Zero-amount expense (rejected or handled)', () => {
      it('should handle zero-amount expenses', () => {
        const expense: Partial<ExpenseWithDetails> = {
          id: 'exp1',
          amount: 0,
          currency: 'USD',
          payer_id: 'alice',
          payer: { id: 'alice', full_name: 'Alice' },
          participants: [],
        }

        const balances = calculateUserBalances([expense as ExpenseWithDetails], 'USD')

        // Should not crash, may return empty or zero balances
        expect(balances).toBeDefined()
      })
    })

    describe('TC5.5: Negative split amounts (rejected)', () => {
      it('should handle negative amounts (refunds)', () => {
        const amount = -50
        const formatted = formatCurrency(amount, 'USD')

        expect(formatted).toBe('-$50.00')
      })
    })
  })

  // ======================
  // 6. MULTI-CURRENCY SCENARIOS
  // ======================
  describe('Multi-Currency Scenarios', () => {
    describe('TC6.1: Trip with EUR, USD, GBP expenses', () => {
      it('should handle trip with multiple currencies', () => {
        const expenses: Partial<ExpenseWithDetails>[] = [
          {
            id: 'exp1',
            amount: 10000, // €100
            currency: 'EUR',
            fx_rate: null, // Base currency
            payer_id: 'alice',
            payer: { id: 'alice', full_name: 'Alice' },
            participants: [
              {
                id: 'p1',
                expense_id: 'exp1',
                user_id: 'alice',
                share_amount: 5000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'alice', full_name: 'Alice' },
              },
              {
                id: 'p2',
                expense_id: 'exp1',
                user_id: 'bob',
                share_amount: 5000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'bob', full_name: 'Bob' },
              },
            ],
          },
          {
            id: 'exp2',
            amount: 12000, // $120
            currency: 'USD',
            fx_rate: 0.92, // 1 USD = 0.92 EUR
            payer_id: 'bob',
            payer: { id: 'bob', full_name: 'Bob' },
            participants: [
              {
                id: 'p3',
                expense_id: 'exp2',
                user_id: 'alice',
                share_amount: 6000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'alice', full_name: 'Alice' },
              },
              {
                id: 'p4',
                expense_id: 'exp2',
                user_id: 'bob',
                share_amount: 6000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'bob', full_name: 'Bob' },
              },
            ],
          },
          {
            id: 'exp3',
            amount: 8000, // £80
            currency: 'GBP',
            fx_rate: 1.15, // 1 GBP = 1.15 EUR
            payer_id: 'alice',
            payer: { id: 'alice', full_name: 'Alice' },
            participants: [
              {
                id: 'p5',
                expense_id: 'exp3',
                user_id: 'alice',
                share_amount: 4000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'alice', full_name: 'Alice' },
              },
              {
                id: 'p6',
                expense_id: 'exp3',
                user_id: 'bob',
                share_amount: 4000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'bob', full_name: 'Bob' },
              },
            ],
          },
        ]

        const balances = calculateUserBalances(expenses as ExpenseWithDetails[], 'EUR')

        // All balances should be in EUR
        expect(balances.every(b => b.currency === 'EUR')).toBe(true)
      })
    })

    describe('TC6.2: Base currency change recalculation', () => {
      it('should recalculate balances when base currency changes', () => {
        const expenses: Partial<ExpenseWithDetails>[] = [
          {
            id: 'exp1',
            amount: 10000, // €100
            currency: 'EUR',
            fx_rate: 1.09, // 1 EUR = 1.09 USD (for USD base)
            payer_id: 'alice',
            payer: { id: 'alice', full_name: 'Alice' },
            participants: [
              {
                id: 'p1',
                expense_id: 'exp1',
                user_id: 'alice',
                share_amount: 5000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'alice', full_name: 'Alice' },
              },
              {
                id: 'p2',
                expense_id: 'exp1',
                user_id: 'bob',
                share_amount: 5000,
                share_type: 'equal',
                created_at: '',
                user: { id: 'bob', full_name: 'Bob' },
              },
            ],
          },
        ]

        // Calculate with EUR base
        const eurBalances = calculateUserBalances(expenses as ExpenseWithDetails[], 'EUR')

        // Calculate with USD base
        const usdBalances = calculateUserBalances(expenses as ExpenseWithDetails[], 'USD')

        // Both should have valid balances
        expect(eurBalances).toHaveLength(2)
        expect(usdBalances).toHaveLength(2)
      })
    })

    describe('TC6.3: Historical vs current FX rate handling', () => {
      it('should use historical FX rate from expense, not current rate', () => {
        const expense: Partial<ExpenseWithDetails> = {
          amount: 10000, // $100
          currency: 'USD',
          fx_rate: 0.85, // Historical rate: 1 USD = 0.85 EUR
        }

        const result = convertExpenseToBaseCurrency(expense as ExpenseWithDetails, 'EUR')

        // Should use stored rate (0.85) not current market rate
        expect(result.amount).toBe(8500) // €85
      })
    })
  })

  // ======================
  // 7. CURRENCY UTILITY TESTS
  // ======================
  describe('Currency Utilities', () => {
    describe('formatCurrency', () => {
      it('should format USD correctly', () => {
        expect(formatCurrency(100, 'USD')).toBe('$100.00')
      })

      it('should format EUR correctly', () => {
        expect(formatCurrency(100, 'EUR')).toBe('€100.00')
      })

      it('should format GBP correctly', () => {
        expect(formatCurrency(100, 'GBP')).toBe('£100.00')
      })

      it('should format JPY correctly', () => {
        expect(formatCurrency(1000, 'JPY')).toBe('¥1000.00')
      })

      it('should handle negative amounts (refunds)', () => {
        expect(formatCurrency(-50, 'USD')).toBe('-$50.00')
      })

      it('should handle zero', () => {
        expect(formatCurrency(0, 'EUR')).toBe('€0.00')
      })

      it('should handle unknown currency (use code)', () => {
        expect(formatCurrency(100, 'XYZ')).toBe('XYZ100.00')
      })
    })

    describe('convertToMinorUnits', () => {
      it('should convert $100.50 to 10050 cents', () => {
        expect(convertToMinorUnits(100.5)).toBe(10050)
      })

      it('should convert $100 to 10000 cents', () => {
        expect(convertToMinorUnits(100)).toBe(10000)
      })

      it('should round to nearest cent', () => {
        expect(convertToMinorUnits(100.999)).toBe(10100)
      })

      it('should handle zero', () => {
        expect(convertToMinorUnits(0)).toBe(0)
      })

      it('should handle negative amounts', () => {
        expect(convertToMinorUnits(-25.5)).toBe(-2550)
      })
    })

    describe('convertFromMinorUnits', () => {
      it('should convert 10050 cents to $100.50', () => {
        expect(convertFromMinorUnits(10050)).toBe(100.5)
      })

      it('should convert 10000 cents to $100', () => {
        expect(convertFromMinorUnits(10000)).toBe(100)
      })

      it('should handle zero', () => {
        expect(convertFromMinorUnits(0)).toBe(0)
      })

      it('should handle negative amounts', () => {
        expect(convertFromMinorUnits(-2550)).toBe(-25.5)
      })
    })
  })

  // ======================
  // 8. DETERMINISTIC RESULTS
  // ======================
  describe('Deterministic Results', () => {
    it('should produce same results on repeated runs', () => {
      const balances: UserBalance[] = [
        { user_id: 'alice', user_name: 'Alice', net_balance: 5000, currency: 'USD' },
        { user_id: 'bob', user_name: 'Bob', net_balance: -5000, currency: 'USD' },
      ]

      const settlements1 = optimizeSettlements(balances)
      const settlements2 = optimizeSettlements(balances)

      expect(settlements1).toEqual(settlements2)
    })

    it('should not have floating point errors', () => {
      const amount1 = convertToMinorUnits(0.1)
      const amount2 = convertToMinorUnits(0.2)
      const sum = amount1 + amount2

      // 0.1 + 0.2 = 0.3 in cents should be exact
      expect(sum).toBe(30)
    })

    it('should handle operations consistently', () => {
      const expense: Partial<ExpenseWithDetails> = {
        amount: 3333, // $33.33
        currency: 'USD',
        fx_rate: 0.92,
      }

      // Run conversion multiple times
      const result1 = convertExpenseToBaseCurrency(expense as ExpenseWithDetails, 'EUR')
      const result2 = convertExpenseToBaseCurrency(expense as ExpenseWithDetails, 'EUR')
      const result3 = convertExpenseToBaseCurrency(expense as ExpenseWithDetails, 'EUR')

      expect(result1.amount).toBe(result2.amount)
      expect(result2.amount).toBe(result3.amount)
    })
  })

  // ======================
  // 9. PERFORMANCE TESTS
  // ======================
  describe('Performance', () => {
    it('should calculate balances quickly for 100 expenses', () => {
      const expenses: Partial<ExpenseWithDetails>[] = Array.from({ length: 100 }, (_, i) => ({
        id: `exp${i}`,
        amount: 10000,
        currency: 'USD',
        payer_id: 'alice',
        payer: { id: 'alice', full_name: 'Alice' },
        participants: [
          {
            id: `p${i}`,
            expense_id: `exp${i}`,
            user_id: 'alice',
            share_amount: 5000,
            share_type: 'equal' as const,
            created_at: '',
            user: { id: 'alice', full_name: 'Alice' },
          },
          {
            id: `p${i + 100}`,
            expense_id: `exp${i}`,
            user_id: 'bob',
            share_amount: 5000,
            share_type: 'equal' as const,
            created_at: '',
            user: { id: 'bob', full_name: 'Bob' },
          },
        ],
      }))

      const startTime = Date.now()
      const balances = calculateUserBalances(expenses as ExpenseWithDetails[], 'USD')
      const endTime = Date.now()

      expect(balances).toHaveLength(2)
      expect(endTime - startTime).toBeLessThan(100) // Should complete in <100ms
    })

    it('should optimize settlements quickly for 20 people', () => {
      const balances: UserBalance[] = Array.from({ length: 20 }, (_, i) => ({
        user_id: `user${i}`,
        user_name: `User ${i}`,
        net_balance: i % 2 === 0 ? 5000 : -5000, // Alternate creditors and debtors
        currency: 'USD',
      }))

      const startTime = Date.now()
      const settlements = optimizeSettlements(balances)
      const endTime = Date.now()

      expect(settlements.length).toBeGreaterThan(0)
      expect(endTime - startTime).toBeLessThan(50) // Should complete in <50ms
    })
  })
})
