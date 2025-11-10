/**
 * Integration tests for Expense and Settlement calculations
 */

import { calculateUserBalances, optimizeSettlements } from '@tripthreads/core'
import type { ExpenseWithDetails } from '@tripthreads/core'

describe('Expense and Settlement Integration Tests', () => {
  describe('calculateUserBalances', () => {
    it('should calculate balances with single expense', () => {
      const expenses: ExpenseWithDetails[] = [
        {
          id: 'expense-1',
          trip_id: 'trip-1',
          description: 'Dinner',
          amount: 6000, // $60 in cents
          currency: 'USD',
          category: 'food',
          payer_id: 'user-1',
          date: '2024-01-15',
          receipt_url: null,
          fx_rate: 1,
          created_by: 'user-1',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          payer: {
            id: 'user-1',
            full_name: 'Alice',
            avatar_url: null,
          },
          participants: [
            {
              id: 'p-1',
              expense_id: 'expense-1',
              user_id: 'user-1',
              share_amount: 3000,
              share_type: 'equal',
              share_value: null,
              created_at: '2024-01-15T10:00:00Z',
              user: {
                id: 'user-1',
                full_name: 'Alice',
                avatar_url: null,
              },
            },
            {
              id: 'p-2',
              expense_id: 'expense-1',
              user_id: 'user-2',
              share_amount: 3000,
              share_type: 'equal',
              share_value: null,
              created_at: '2024-01-15T10:00:00Z',
              user: {
                id: 'user-2',
                full_name: 'Bob',
                avatar_url: null,
              },
            },
          ],
        },
      ]

      const balances = calculateUserBalances(expenses, 'USD')

      expect(balances).toHaveLength(2)

      const alice = balances.find(b => b.user_id === 'user-1')
      const bob = balances.find(b => b.user_id === 'user-2')

      expect(alice?.net_balance).toBe(3000) // Paid 6000, owes 3000 = +3000
      expect(bob?.net_balance).toBe(-3000) // Paid 0, owes 3000 = -3000
    })

    it('should calculate balances with multiple expenses', () => {
      const expenses: ExpenseWithDetails[] = [
        {
          id: 'expense-1',
          trip_id: 'trip-1',
          description: 'Dinner',
          amount: 6000,
          currency: 'USD',
          category: 'food',
          payer_id: 'user-1',
          date: '2024-01-15',
          receipt_url: null,
          fx_rate: 1,
          created_by: 'user-1',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          payer: { id: 'user-1', full_name: 'Alice', avatar_url: null },
          participants: [
            {
              id: 'p-1',
              expense_id: 'expense-1',
              user_id: 'user-1',
              share_amount: 3000,
              share_type: 'equal',
              share_value: null,
              created_at: '2024-01-15T10:00:00Z',
              user: { id: 'user-1', full_name: 'Alice', avatar_url: null },
            },
            {
              id: 'p-2',
              expense_id: 'expense-1',
              user_id: 'user-2',
              share_amount: 3000,
              share_type: 'equal',
              share_value: null,
              created_at: '2024-01-15T10:00:00Z',
              user: { id: 'user-2', full_name: 'Bob', avatar_url: null },
            },
          ],
        },
        {
          id: 'expense-2',
          trip_id: 'trip-1',
          description: 'Hotel',
          amount: 12000,
          currency: 'USD',
          category: 'accommodation',
          payer_id: 'user-2',
          date: '2024-01-16',
          receipt_url: null,
          fx_rate: 1,
          created_by: 'user-2',
          created_at: '2024-01-16T10:00:00Z',
          updated_at: '2024-01-16T10:00:00Z',
          payer: { id: 'user-2', full_name: 'Bob', avatar_url: null },
          participants: [
            {
              id: 'p-3',
              expense_id: 'expense-2',
              user_id: 'user-1',
              share_amount: 6000,
              share_type: 'equal',
              share_value: null,
              created_at: '2024-01-16T10:00:00Z',
              user: { id: 'user-1', full_name: 'Alice', avatar_url: null },
            },
            {
              id: 'p-4',
              expense_id: 'expense-2',
              user_id: 'user-2',
              share_amount: 6000,
              share_type: 'equal',
              share_value: null,
              created_at: '2024-01-16T10:00:00Z',
              user: { id: 'user-2', full_name: 'Bob', avatar_url: null },
            },
          ],
        },
      ]

      const balances = calculateUserBalances(expenses, 'USD')

      const alice = balances.find(b => b.user_id === 'user-1')
      const bob = balances.find(b => b.user_id === 'user-2')

      // Alice: Paid 6000, owes (3000 + 6000) = -3000
      expect(alice?.net_balance).toBe(-3000)

      // Bob: Paid 12000, owes (3000 + 6000) = +3000
      expect(bob?.net_balance).toBe(3000)
    })

    it('should handle empty expense list', () => {
      const balances = calculateUserBalances([], 'USD')
      expect(balances).toEqual([])
    })
  })

  describe('optimizeSettlements', () => {
    it('should optimize simple two-person settlement', () => {
      const balances = [
        { user_id: 'user-1', user_name: 'Alice', net_balance: 3000 },
        { user_id: 'user-2', user_name: 'Bob', net_balance: -3000 },
      ]

      const settlements = optimizeSettlements(balances)

      expect(settlements).toHaveLength(1)
      expect(settlements[0]).toEqual({
        from_id: 'user-2',
        from_name: 'Bob',
        to_id: 'user-1',
        to_name: 'Alice',
        amount: 3000,
      })
    })

    it('should optimize three-person settlement', () => {
      const balances = [
        { user_id: 'user-1', user_name: 'Alice', net_balance: 5000 },
        { user_id: 'user-2', user_name: 'Bob', net_balance: -3000 },
        { user_id: 'user-3', user_name: 'Charlie', net_balance: -2000 },
      ]

      const settlements = optimizeSettlements(balances)

      // Should minimize transactions (2 payments instead of 3)
      expect(settlements.length).toBeLessThanOrEqual(2)

      // Total amount owed should match total amount owed
      const totalOwed = settlements.reduce((sum, s) => sum + s.amount, 0)
      expect(totalOwed).toBe(5000)
    })

    it('should handle balanced accounts (no settlements needed)', () => {
      const balances = [
        { user_id: 'user-1', user_name: 'Alice', net_balance: 0 },
        { user_id: 'user-2', user_name: 'Bob', net_balance: 0 },
      ]

      const settlements = optimizeSettlements(balances)
      expect(settlements).toHaveLength(0)
    })

    it('should handle complex multi-person scenario', () => {
      const balances = [
        { user_id: 'user-1', user_name: 'Alice', net_balance: 10000 },
        { user_id: 'user-2', user_name: 'Bob', net_balance: -3000 },
        { user_id: 'user-3', user_name: 'Charlie', net_balance: -2000 },
        { user_id: 'user-4', user_name: 'David', net_balance: -5000 },
      ]

      const settlements = optimizeSettlements(balances)

      // Verify total amounts match
      const totalCredits = balances.filter(b => b.net_balance > 0).reduce((sum, b) => sum + b.net_balance, 0)
      const totalDebts = balances.filter(b => b.net_balance < 0).reduce((sum, b) => sum + Math.abs(b.net_balance), 0)
      const totalSettlements = settlements.reduce((sum, s) => sum + s.amount, 0)

      expect(totalCredits).toBe(totalDebts)
      expect(totalSettlements).toBe(totalCredits)

      // Verify all settlements are from debtors to creditors
      settlements.forEach(settlement => {
        const from = balances.find(b => b.user_id === settlement.from_id)
        const to = balances.find(b => b.user_id === settlement.to_id)
        expect(from?.net_balance).toBeLessThan(0)
        expect(to?.net_balance).toBeGreaterThan(0)
      })
    })
  })

  describe('End-to-End Expense Settlement Flow', () => {
    it('should calculate correct settlements from expenses', () => {
      // Scenario: Alice, Bob, and Charlie go on a trip
      // - Alice pays $120 for hotel (split 3 ways)
      // - Bob pays $60 for dinner (split 3 ways)
      // - Charlie pays $30 for taxi (split 3 ways)

      const expenses: ExpenseWithDetails[] = [
        {
          id: 'e1',
          trip_id: 'trip-1',
          description: 'Hotel',
          amount: 12000,
          currency: 'USD',
          category: 'accommodation',
          payer_id: 'alice',
          date: '2024-01-15',
          receipt_url: null,
          fx_rate: 1,
          created_by: 'alice',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          payer: { id: 'alice', full_name: 'Alice', avatar_url: null },
          participants: [
            {
              id: 'p1',
              expense_id: 'e1',
              user_id: 'alice',
              share_amount: 4000,
              share_type: 'equal',
              share_value: null,
              created_at: '2024-01-15T10:00:00Z',
              user: { id: 'alice', full_name: 'Alice', avatar_url: null },
            },
            {
              id: 'p2',
              expense_id: 'e1',
              user_id: 'bob',
              share_amount: 4000,
              share_type: 'equal',
              share_value: null,
              created_at: '2024-01-15T10:00:00Z',
              user: { id: 'bob', full_name: 'Bob', avatar_url: null },
            },
            {
              id: 'p3',
              expense_id: 'e1',
              user_id: 'charlie',
              share_amount: 4000,
              share_type: 'equal',
              share_value: null,
              created_at: '2024-01-15T10:00:00Z',
              user: { id: 'charlie', full_name: 'Charlie', avatar_url: null },
            },
          ],
        },
        {
          id: 'e2',
          trip_id: 'trip-1',
          description: 'Dinner',
          amount: 6000,
          currency: 'USD',
          category: 'food',
          payer_id: 'bob',
          date: '2024-01-15',
          receipt_url: null,
          fx_rate: 1,
          created_by: 'bob',
          created_at: '2024-01-15T18:00:00Z',
          updated_at: '2024-01-15T18:00:00Z',
          payer: { id: 'bob', full_name: 'Bob', avatar_url: null },
          participants: [
            {
              id: 'p4',
              expense_id: 'e2',
              user_id: 'alice',
              share_amount: 2000,
              share_type: 'equal',
              share_value: null,
              created_at: '2024-01-15T18:00:00Z',
              user: { id: 'alice', full_name: 'Alice', avatar_url: null },
            },
            {
              id: 'p5',
              expense_id: 'e2',
              user_id: 'bob',
              share_amount: 2000,
              share_type: 'equal',
              share_value: null,
              created_at: '2024-01-15T18:00:00Z',
              user: { id: 'bob', full_name: 'Bob', avatar_url: null },
            },
            {
              id: 'p6',
              expense_id: 'e2',
              user_id: 'charlie',
              share_amount: 2000,
              share_type: 'equal',
              share_value: null,
              created_at: '2024-01-15T18:00:00Z',
              user: { id: 'charlie', full_name: 'Charlie', avatar_url: null },
            },
          ],
        },
        {
          id: 'e3',
          trip_id: 'trip-1',
          description: 'Taxi',
          amount: 3000,
          currency: 'USD',
          category: 'transport',
          payer_id: 'charlie',
          date: '2024-01-15',
          receipt_url: null,
          fx_rate: 1,
          created_by: 'charlie',
          created_at: '2024-01-15T20:00:00Z',
          updated_at: '2024-01-15T20:00:00Z',
          payer: { id: 'charlie', full_name: 'Charlie', avatar_url: null },
          participants: [
            {
              id: 'p7',
              expense_id: 'e3',
              user_id: 'alice',
              share_amount: 1000,
              share_type: 'equal',
              share_value: null,
              created_at: '2024-01-15T20:00:00Z',
              user: { id: 'alice', full_name: 'Alice', avatar_url: null },
            },
            {
              id: 'p8',
              expense_id: 'e3',
              user_id: 'bob',
              share_amount: 1000,
              share_type: 'equal',
              share_value: null,
              created_at: '2024-01-15T20:00:00Z',
              user: { id: 'bob', full_name: 'Bob', avatar_url: null },
            },
            {
              id: 'p9',
              expense_id: 'e3',
              user_id: 'charlie',
              share_amount: 1000,
              share_type: 'equal',
              share_value: null,
              created_at: '2024-01-15T20:00:00Z',
              user: { id: 'charlie', full_name: 'Charlie', avatar_url: null },
            },
          ],
        },
      ]

      // Calculate balances
      const balances = calculateUserBalances(expenses, 'USD')

      // Alice: Paid 120, owes 40+20+10 = 70, net = +50
      // Bob: Paid 60, owes 40+20+10 = 70, net = -10
      // Charlie: Paid 30, owes 40+20+10 = 70, net = -40

      const alice = balances.find(b => b.user_id === 'alice')
      const bob = balances.find(b => b.user_id === 'bob')
      const charlie = balances.find(b => b.user_id === 'charlie')

      expect(alice?.net_balance).toBe(5000) // +$50
      expect(bob?.net_balance).toBe(-1000) // -$10
      expect(charlie?.net_balance).toBe(-4000) // -$40

      // Optimize settlements
      const settlements = optimizeSettlements(balances)

      // Should have 2 settlements (Bob → Alice, Charlie → Alice)
      expect(settlements).toHaveLength(2)

      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0)
      expect(totalSettled).toBe(5000) // $50 total
    })
  })
})
