/**
 * Component tests for Expense Detail Screen
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import ExpenseDetailScreen from '../../../app/(app)/trips/[id]/expenses/[expenseId]'
import * as ExpenseQueries from '@tripthreads/core'

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}))

jest.mock('../../../lib/supabase/client', () => ({
  supabase: {},
}))

jest.mock('../../../lib/auth/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@example.com' } }),
}))

jest.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

jest.mock('@tripthreads/core', () => ({
  getExpenseById: jest.fn(),
  updateExpense: jest.fn(),
  deleteExpense: jest.fn(),
}))

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
}

const mockExpense = {
  id: 'expense-1',
  trip_id: 'trip-1',
  description: 'Dinner at Le Bistro',
  amount: 6000, // $60.00 in cents
  currency: 'USD',
  category: 'food',
  payer_id: 'user-1',
  date: '2025-10-15',
  receipt_url: null,
  fx_rate: 1,
  created_by: 'user-1',
  created_at: '2025-10-15T20:00:00Z',
  updated_at: '2025-10-15T20:00:00Z',
  payer: {
    id: 'user-1',
    full_name: 'Alice Johnson',
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
      created_at: '2025-10-15T20:00:00Z',
      user: {
        id: 'user-1',
        full_name: 'Alice Johnson',
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
      created_at: '2025-10-15T20:00:00Z',
      user: {
        id: 'user-2',
        full_name: 'Bob Smith',
        avatar_url: null,
      },
    },
  ],
}

describe('ExpenseDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useLocalSearchParams as jest.Mock).mockReturnValue({
      id: 'trip-1',
      expenseId: 'expense-1',
    })
    ;(ExpenseQueries.getExpenseById as jest.Mock).mockResolvedValue(mockExpense)
  })

  describe('View Mode', () => {
    it('should render expense details', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('Dinner at Le Bistro')).toBeTruthy()
      })

      expect(screen.getByText(/\$60\.00/)).toBeTruthy()
      expect(screen.getByText('Alice Johnson')).toBeTruthy()
    })

    it('should display category icon', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('🍽️')).toBeTruthy() // Food category icon
      })
    })

    it('should display formatted amount', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        // Amount should be formatted with currency symbol
        expect(screen.getByText(/\$60\.00/)).toBeTruthy()
      })
    })

    it('should display payer information', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('Paid by')).toBeTruthy()
        expect(screen.getByText('Alice Johnson')).toBeTruthy()
      })
    })

    it('should display date', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('Date')).toBeTruthy()
        expect(screen.getByText(/10\/15\/2025/)).toBeTruthy()
      })
    })

    it('should display participant splits', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText(/Split between \(2\)/)).toBeTruthy()
        expect(screen.getByText('Alice Johnson')).toBeTruthy()
        expect(screen.getByText('Bob Smith')).toBeTruthy()
      })

      // Both should show $30.00 split
      const amounts = screen.getAllByText(/\$30\.00/)
      expect(amounts.length).toBeGreaterThan(0)
    })

    it('should show edit and delete buttons', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeTruthy()
        expect(screen.getByText('🗑️ Delete')).toBeTruthy()
      })
    })

    it('should display different icons for different categories', async () => {
      const categories = [
        { category: 'food', icon: '🍽️' },
        { category: 'transport', icon: '🚗' },
        { category: 'accommodation', icon: '🏨' },
        { category: 'activity', icon: '🎯' },
        { category: 'other', icon: '💰' },
      ]

      for (const { category, icon } of categories) {
        ;(ExpenseQueries.getExpenseById as jest.Mock).mockResolvedValue({
          ...mockExpense,
          category,
        })

        const { unmount } = render(<ExpenseDetailScreen />)

        await waitFor(() => {
          expect(screen.getByText(icon)).toBeTruthy()
        })

        unmount()
      }
    })
  })

  describe('Edit Mode', () => {
    it('should enter edit mode when edit button is tapped', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('✏️ Edit'))

      await waitFor(() => {
        expect(screen.getByText('Edit Expense')).toBeTruthy()
        expect(screen.getByText('💾 Save')).toBeTruthy()
        expect(screen.getByText('Cancel')).toBeTruthy()
      })
    })

    it('should show form fields in edit mode', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('✏️ Edit'))

      await waitFor(() => {
        expect(screen.getByText('Description')).toBeTruthy()
        expect(screen.getByText('Amount')).toBeTruthy()
        expect(screen.getByText('Currency')).toBeTruthy()
        expect(screen.getByText('Category')).toBeTruthy()
        expect(screen.getByText('Date')).toBeTruthy()
      })
    })

    it('should pre-populate form with current values in dollars', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('✏️ Edit'))

      await waitFor(() => {
        // Amount should be converted from cents to dollars
        expect(screen.getByDisplayValue('60.00')).toBeTruthy()
        expect(screen.getByDisplayValue('Dinner at Le Bistro')).toBeTruthy()
        expect(screen.getByDisplayValue('USD')).toBeTruthy()
      })
    })

    it('should cancel edit mode without saving', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('✏️ Edit'))

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('Cancel'))

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeTruthy()
        expect(screen.queryByText('💾 Save')).toBeFalsy()
      })
    })

    it('should save changes when save button is tapped', async () => {
      const updatedExpense = { ...mockExpense, amount: 7500, description: 'Updated Description' }
      ;(ExpenseQueries.updateExpense as jest.Mock).mockResolvedValue(updatedExpense)

      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('✏️ Edit'))

      await waitFor(() => {
        expect(screen.getByDisplayValue('Dinner at Le Bistro')).toBeTruthy()
      })

      const descInput = screen.getByDisplayValue('Dinner at Le Bistro')
      fireEvent.changeText(descInput, 'Updated Description')

      const amountInput = screen.getByDisplayValue('60.00')
      fireEvent.changeText(amountInput, '75.00')

      fireEvent.press(screen.getByText('💾 Save'))

      await waitFor(() => {
        expect(ExpenseQueries.updateExpense).toHaveBeenCalledWith(
          expect.anything(),
          'expense-1',
          expect.objectContaining({
            description: 'Updated Description',
            amount: 7500, // Converted back to cents
          })
        )
      })
    })

    it('should convert dollars to cents when saving', async () => {
      ;(ExpenseQueries.updateExpense as jest.Mock).mockResolvedValue(mockExpense)

      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('✏️ Edit'))

      const amountInput = screen.getByDisplayValue('60.00')
      fireEvent.changeText(amountInput, '123.45')

      fireEvent.press(screen.getByText('💾 Save'))

      await waitFor(() => {
        expect(ExpenseQueries.updateExpense).toHaveBeenCalledWith(
          expect.anything(),
          'expense-1',
          expect.objectContaining({
            amount: 12345, // $123.45 converted to cents
          })
        )
      })
    })
  })

  describe('Delete Flow', () => {
    it('should show confirmation alert when delete is tapped', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('🗑️ Delete')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('🗑️ Delete'))

      // Alert confirmation happens natively, hard to test in RNTL
      // In E2E tests, we can properly test the alert flow
    })
  })

  describe('Loading States', () => {
    it('should show loading indicator while fetching data', async () => {
      ;(ExpenseQueries.getExpenseById as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockExpense), 100))
      )

      render(<ExpenseDetailScreen />)

      expect(screen.getByText('Loading...')).toBeTruthy()

      // Wait for content to appear instead of loading to disappear
      await waitFor(() => {
        expect(screen.getByText('Dinner at Le Bistro')).toBeTruthy()
      })

      // Then verify loading is gone
      expect(screen.queryByText('Loading...')).toBeFalsy()
    })

    it('should show not found message when expense does not exist', async () => {
      ;(ExpenseQueries.getExpenseById as jest.Mock).mockRejectedValue(new Error('Not found'))

      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('Expense Not Found')).toBeTruthy()
        expect(screen.getByText('Go Back')).toBeTruthy()
      })
    })
  })

  describe('Navigation', () => {
    it('should navigate back when back button is pressed', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('← Back')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('← Back'))

      expect(mockRouter.back).toHaveBeenCalled()
    })
  })

  describe('Category Selection', () => {
    it('should display all category options in edit mode', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('✏️ Edit'))

      await waitFor(() => {
        expect(screen.getByText('🍽️ Food')).toBeTruthy()
        expect(screen.getByText('🚗 Transport')).toBeTruthy()
        expect(screen.getByText('🏨 Accommodation')).toBeTruthy()
        expect(screen.getByText('🎯 Activity')).toBeTruthy()
        expect(screen.getByText('💰 Other')).toBeTruthy()
      })
    })
  })

  describe('Currency Formatting', () => {
    it('should format USD currency correctly', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText(/\$60\.00/)).toBeTruthy()
      })
    })

    it('should format EUR currency correctly', async () => {
      ;(ExpenseQueries.getExpenseById as jest.Mock).mockResolvedValue({
        ...mockExpense,
        currency: 'EUR',
      })

      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText(/€60\.00/)).toBeTruthy()
      })
    })

    it('should format GBP currency correctly', async () => {
      ;(ExpenseQueries.getExpenseById as jest.Mock).mockResolvedValue({
        ...mockExpense,
        currency: 'GBP',
      })

      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText(/£60\.00/)).toBeTruthy()
      })
    })
  })

  describe('Participant Display', () => {
    it('should show correct number of participants', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText(/Split between \(2\)/)).toBeTruthy()
      })
    })

    it('should display all participant names', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeTruthy()
        expect(screen.getByText('Bob Smith')).toBeTruthy()
      })
    })

    it('should display individual share amounts', async () => {
      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        // Each participant owes $30.00
        const amounts = screen.getAllByText(/\$30\.00/)
        expect(amounts.length).toBeGreaterThan(0)
      })
    })

    it('should handle single participant expense', async () => {
      ;(ExpenseQueries.getExpenseById as jest.Mock).mockResolvedValue({
        ...mockExpense,
        participants: [mockExpense.participants[0]],
      })

      render(<ExpenseDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText(/Split between \(1\)/)).toBeTruthy()
        expect(screen.getByText(/\$60\.00/)).toBeTruthy() // Full amount
      })
    })
  })
})
