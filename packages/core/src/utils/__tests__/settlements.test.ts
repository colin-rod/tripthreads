/**
 * Tests for settlement calculation and optimization algorithms
 *
 * Tests verify:
 * - Balance calculation across multiple expenses
 * - Debt optimization (minimize transactions)
 * - Multi-currency conversion handling
 * - Edge cases (zero balances, single payer, etc.)
 */

import { describe, it, expect } from '@jest/globals'
import {
  calculateUserBalances,
  optimizeSettlements,
  convertExpenseToBaseCurrency,
} from '../settlements'
import type { ExpenseWithDetails, UserBalance } from '../../types/expense'

describe('convertExpenseToBaseCurrency', () => {
  it('should return original amount when expense currency matches base currency', () => {
    const expense: Partial<ExpenseWithDetails> = {
      amount: 10000, // €100.00
      currency: 'EUR',
      fx_rate: null,
    }

    const result = convertExpenseToBaseCurrency(expense as ExpenseWithDetails, 'EUR')

    expect(result).toEqual({
      amount: 10000,
      currency: 'EUR',
      needsFxRate: false,
    })
  })

  it('should convert using stored FX rate when expense currency differs', () => {
    const expense: Partial<ExpenseWithDetails> = {
      amount: 6000, // $60.00
      currency: 'USD',
      fx_rate: 0.85, // 1 USD = 0.85 EUR
    }

    const result = convertExpenseToBaseCurrency(expense as ExpenseWithDetails, 'EUR')

    expect(result).toEqual({
      amount: 5100, // 60 * 0.85 = €51.00
      currency: 'EUR',
      needsFxRate: false,
    })
  })

  it('should flag when FX rate is missing', () => {
    const expense: Partial<ExpenseWithDetails> = {
      amount: 6000,
      currency: 'USD',
      fx_rate: null, // Missing!
    }

    const result = convertExpenseToBaseCurrency(expense as ExpenseWithDetails, 'EUR')

    expect(result).toEqual({
      amount: 0,
      currency: 'EUR',
      needsFxRate: true,
    })
  })

  it('should handle same currency with existing fx_rate (edge case)', () => {
    // Edge case: expense currency = base currency but fx_rate is set (shouldn't happen, but handle gracefully)
    const expense: Partial<ExpenseWithDetails> = {
      amount: 10000,
      currency: 'EUR',
      fx_rate: 1.0,
    }

    const result = convertExpenseToBaseCurrency(expense as ExpenseWithDetails, 'EUR')

    expect(result).toEqual({
      amount: 10000,
      currency: 'EUR',
      needsFxRate: false,
    })
  })
})

describe('calculateUserBalances', () => {
  it('should calculate balances for single expense with equal split', () => {
    const expenses: Partial<ExpenseWithDetails>[] = [
      {
        id: 'exp1',
        amount: 9000, // €90
        currency: 'EUR',
        payer_id: 'alice',
        payer: { id: 'alice', full_name: 'Alice' },
        participants: [
          {
            id: 'p1',
            expense_id: 'exp1',
            user_id: 'alice',
            share_amount: 3000, // €30
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
    ]

    const balances = calculateUserBalances(expenses as ExpenseWithDetails[], 'EUR')

    expect(balances).toHaveLength(3)

    // Alice paid €90, owes €30, so net +€60
    const alice = balances.find(b => b.user_id === 'alice')
    expect(alice).toEqual({
      user_id: 'alice',
      user_name: 'Alice',
      net_balance: 6000,
      currency: 'EUR',
    })

    // Bob owes €30
    const bob = balances.find(b => b.user_id === 'bob')
    expect(bob).toEqual({
      user_id: 'bob',
      user_name: 'Bob',
      net_balance: -3000,
      currency: 'EUR',
    })

    // Charlie owes €30
    const charlie = balances.find(b => b.user_id === 'charlie')
    expect(charlie).toEqual({
      user_id: 'charlie',
      user_name: 'Charlie',
      net_balance: -3000,
      currency: 'EUR',
    })
  })

  it('should calculate balances for multiple expenses with different payers', () => {
    const expenses: Partial<ExpenseWithDetails>[] = [
      {
        id: 'exp1',
        amount: 10000, // Alice pays €100
        currency: 'EUR',
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
        amount: 6000, // Bob pays €60
        currency: 'EUR',
        payer_id: 'bob',
        payer: { id: 'bob', full_name: 'Bob' },
        participants: [
          {
            id: 'p3',
            expense_id: 'exp2',
            user_id: 'alice',
            share_amount: 3000,
            share_type: 'equal',
            created_at: '',
            user: { id: 'alice', full_name: 'Alice' },
          },
          {
            id: 'p4',
            expense_id: 'exp2',
            user_id: 'bob',
            share_amount: 3000,
            share_type: 'equal',
            created_at: '',
            user: { id: 'bob', full_name: 'Bob' },
          },
        ],
      },
    ]

    const balances = calculateUserBalances(expenses as ExpenseWithDetails[], 'EUR')

    // Alice: paid €100, owes €50 + €30 = €80, net = +€20
    const alice = balances.find(b => b.user_id === 'alice')
    expect(alice?.net_balance).toBe(2000)

    // Bob: paid €60, owes €50 + €30 = €80, net = -€20
    const bob = balances.find(b => b.user_id === 'bob')
    expect(bob?.net_balance).toBe(-2000)
  })

  it('should handle zero balances when all settled', () => {
    const expenses: Partial<ExpenseWithDetails>[] = [
      {
        id: 'exp1',
        amount: 5000,
        currency: 'EUR',
        payer_id: 'alice',
        payer: { id: 'alice', full_name: 'Alice' },
        participants: [
          {
            id: 'p1',
            expense_id: 'exp1',
            user_id: 'alice',
            share_amount: 2500,
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
        ],
      },
      {
        id: 'exp2',
        amount: 5000,
        currency: 'EUR',
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

    balances.forEach(balance => {
      expect(balance.net_balance).toBe(0)
    })
  })

  it('should return empty array when no expenses', () => {
    const balances = calculateUserBalances([], 'EUR')
    expect(balances).toEqual([])
  })
})

describe('optimizeSettlements', () => {
  it('should return empty array when all balances are zero', () => {
    const balances: UserBalance[] = [
      {
        user_id: 'alice',
        user_name: 'Alice',
        net_balance: 0,
        currency: 'EUR',
      },
      {
        user_id: 'bob',
        user_name: 'Bob',
        net_balance: 0,
        currency: 'EUR',
      },
    ]

    const settlements = optimizeSettlements(balances)
    expect(settlements).toEqual([])
  })

  it('should create single settlement for two-person trip', () => {
    const balances: UserBalance[] = [
      {
        user_id: 'alice',
        user_name: 'Alice',
        net_balance: 5000, // Alice is owed €50
        currency: 'EUR',
      },
      {
        user_id: 'bob',
        user_name: 'Bob',
        net_balance: -5000, // Bob owes €50
        currency: 'EUR',
      },
    ]

    const settlements = optimizeSettlements(balances)

    expect(settlements).toHaveLength(1)
    expect(settlements[0]).toEqual({
      from_user_id: 'bob',
      from_user_name: 'Bob',
      to_user_id: 'alice',
      to_user_name: 'Alice',
      amount: 5000,
      currency: 'EUR',
    })
  })

  it('should minimize transactions for three-person trip', () => {
    // Scenario: Alice is owed €60, Bob owes €30, Charlie owes €30
    // Optimal: 2 transfers (Bob→Alice, Charlie→Alice)
    const balances: UserBalance[] = [
      {
        user_id: 'alice',
        user_name: 'Alice',
        net_balance: 6000,
        currency: 'EUR',
      },
      {
        user_id: 'bob',
        user_name: 'Bob',
        net_balance: -3000,
        currency: 'EUR',
      },
      {
        user_id: 'charlie',
        user_name: 'Charlie',
        net_balance: -3000,
        currency: 'EUR',
      },
    ]

    const settlements = optimizeSettlements(balances)

    expect(settlements).toHaveLength(2)

    // Verify total owed to Alice = €60
    const totalToAlice = settlements
      .filter(s => s.to_user_id === 'alice')
      .reduce((sum, s) => sum + s.amount, 0)
    expect(totalToAlice).toBe(6000)

    // Verify Bob and Charlie each pay €30
    expect(settlements).toContainEqual({
      from_user_id: 'bob',
      from_user_name: 'Bob',
      to_user_id: 'alice',
      to_user_name: 'Alice',
      amount: 3000,
      currency: 'EUR',
    })
    expect(settlements).toContainEqual({
      from_user_id: 'charlie',
      from_user_name: 'Charlie',
      to_user_id: 'alice',
      to_user_name: 'Alice',
      amount: 3000,
      currency: 'EUR',
    })
  })

  it('should optimize complex multi-creditor scenario', () => {
    // Scenario: Alice +€50, Bob +€30, Charlie -€40, David -€40
    // Without optimization: 4 transactions
    // With optimization: 3 transactions (Charlie→Alice €40, David→Alice €10, David→Bob €30)
    // OR: Charlie→Alice €40, David→Bob €30, David→Alice €10 (both valid, 3 transactions)
    const balances: UserBalance[] = [
      {
        user_id: 'alice',
        user_name: 'Alice',
        net_balance: 5000,
        currency: 'EUR',
      },
      {
        user_id: 'bob',
        user_name: 'Bob',
        net_balance: 3000,
        currency: 'EUR',
      },
      {
        user_id: 'charlie',
        user_name: 'Charlie',
        net_balance: -4000,
        currency: 'EUR',
      },
      {
        user_id: 'david',
        user_name: 'David',
        net_balance: -4000,
        currency: 'EUR',
      },
    ]

    const settlements = optimizeSettlements(balances)

    // Should create 3 transfers (optimal)
    expect(settlements.length).toBeLessThanOrEqual(3)

    // Verify balances sum to zero
    const totalPaid = settlements.reduce((sum, s) => sum + s.amount, 0)
    const totalOwed = balances
      .filter(b => b.net_balance > 0)
      .reduce((sum, b) => sum + b.net_balance, 0)
    expect(totalPaid).toBe(totalOwed)

    // Verify each person's settlements match their balance
    const charliePayments = settlements
      .filter(s => s.from_user_id === 'charlie')
      .reduce((sum, s) => sum + s.amount, 0)
    expect(charliePayments).toBe(4000)

    const davidPayments = settlements
      .filter(s => s.from_user_id === 'david')
      .reduce((sum, s) => sum + s.amount, 0)
    expect(davidPayments).toBe(4000)

    const aliceReceives = settlements
      .filter(s => s.to_user_id === 'alice')
      .reduce((sum, s) => sum + s.amount, 0)
    expect(aliceReceives).toBe(5000)

    const bobReceives = settlements
      .filter(s => s.to_user_id === 'bob')
      .reduce((sum, s) => sum + s.amount, 0)
    expect(bobReceives).toBe(3000)
  })

  it('should handle single payer scenario (everyone owes one person)', () => {
    const balances: UserBalance[] = [
      {
        user_id: 'alice',
        user_name: 'Alice',
        net_balance: 15000, // Alice paid everything
        currency: 'EUR',
      },
      {
        user_id: 'bob',
        user_name: 'Bob',
        net_balance: -5000,
        currency: 'EUR',
      },
      {
        user_id: 'charlie',
        user_name: 'Charlie',
        net_balance: -5000,
        currency: 'EUR',
      },
      {
        user_id: 'david',
        user_name: 'David',
        net_balance: -5000,
        currency: 'EUR',
      },
    ]

    const settlements = optimizeSettlements(balances)

    // Optimal: 3 transfers (Bob→Alice, Charlie→Alice, David→Alice)
    expect(settlements).toHaveLength(3)
    expect(settlements.every(s => s.to_user_id === 'alice')).toBe(true)

    const totalToAlice = settlements.reduce((sum, s) => sum + s.amount, 0)
    expect(totalToAlice).toBe(15000)
  })

  it('should handle rounding errors gracefully', () => {
    // Small amounts with potential rounding issues
    const balances: UserBalance[] = [
      {
        user_id: 'alice',
        user_name: 'Alice',
        net_balance: 333, // €3.33
        currency: 'EUR',
      },
      {
        user_id: 'bob',
        user_name: 'Bob',
        net_balance: 333,
        currency: 'EUR',
      },
      {
        user_id: 'charlie',
        user_name: 'Charlie',
        net_balance: -334, // €3.34 (rounding difference)
        currency: 'EUR',
      },
      {
        user_id: 'david',
        user_name: 'David',
        net_balance: -332,
        currency: 'EUR',
      },
    ]

    const settlements = optimizeSettlements(balances)

    // Should handle gracefully without errors
    expect(settlements.length).toBeGreaterThan(0)

    // Total paid should approximately equal total owed (within 1 cent tolerance)
    const totalPaid = settlements.reduce((sum, s) => sum + s.amount, 0)
    const totalOwed = balances
      .filter(b => b.net_balance > 0)
      .reduce((sum, b) => sum + b.net_balance, 0)
    expect(Math.abs(totalPaid - totalOwed)).toBeLessThanOrEqual(2) // Allow 2 cent variance
  })

  it('should return empty array when input is empty', () => {
    const settlements = optimizeSettlements([])
    expect(settlements).toEqual([])
  })
})
