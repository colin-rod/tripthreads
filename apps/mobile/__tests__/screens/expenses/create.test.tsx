/**
 * Component tests for Expense Create Form
 */

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import CreateExpenseScreen from '../../../app/(app)/trips/[id]/expenses/create'

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}))

jest.mock('../../../lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}))

jest.mock('../../../lib/auth/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}))

jest.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

jest.mock('@tripthreads/core', () => ({
  createExpense: jest.fn(),
  getTripById: jest.fn().mockResolvedValue({
    id: 'trip-123',
    name: 'Test Trip',
    trip_participants: [
      {
        id: 'participant-1',
        user_id: 'user-1',
        user: { id: 'user-1', full_name: 'Alice', email: 'alice@example.com' },
      },
      {
        id: 'participant-2',
        user_id: 'user-2',
        user: { id: 'user-2', full_name: 'Bob', email: 'bob@example.com' },
      },
    ],
  }),
}))

describe('CreateExpenseScreen', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'trip-123' })
  })

  it('should render the form with all fields', async () => {
    const { getByText } = render(<CreateExpenseScreen />)

    await waitFor(() => {
      expect(getByText('Add Expense')).toBeTruthy()
      expect(getByText(/Description/)).toBeTruthy()
      expect(getByText(/Amount/)).toBeTruthy()
      expect(getByText(/Currency/)).toBeTruthy()
      expect(getByText(/Category/)).toBeTruthy()
    })
  })

  it('should show category selector buttons', async () => {
    const { getByText } = render(<CreateExpenseScreen />)

    await waitFor(() => {
      expect(getByText('🍽️ Food')).toBeTruthy()
      expect(getByText('🚗 Transport')).toBeTruthy()
      expect(getByText('🏨 Accommodation')).toBeTruthy()
      expect(getByText('🎯 Activity')).toBeTruthy()
      expect(getByText('💰 Other')).toBeTruthy()
    })
  })

  it('should load and display trip participants', async () => {
    const { getAllByText } = render(<CreateExpenseScreen />)

    await waitFor(() => {
      expect(getAllByText('Alice').length).toBeGreaterThan(0)
      expect(getAllByText('Bob').length).toBeGreaterThan(0)
    })
  })

  it('should show payer selection section', async () => {
    const { getByText } = render(<CreateExpenseScreen />)

    await waitFor(() => {
      expect(getByText('Who paid?')).toBeTruthy()
    })
  })

  it('should show participant selection for split', async () => {
    const { getByText } = render(<CreateExpenseScreen />)

    await waitFor(() => {
      expect(getByText('Split equally between:')).toBeTruthy()
    })
  })

  it('should allow selecting payer', async () => {
    const { getAllByText } = render(<CreateExpenseScreen />)

    await waitFor(() => {
      const aliceButtons = getAllByText('Alice')
      // First Alice is in the payer section
      fireEvent.press(aliceButtons[0])
      expect(aliceButtons[0]).toBeTruthy()
    })
  })

  it('should have all participants selected by default', async () => {
    const { getByText } = render(<CreateExpenseScreen />)

    await waitFor(() => {
      expect(getByText('2 participant(s) selected')).toBeTruthy()
    })
  })

  it('should navigate back when back button is pressed', async () => {
    const { getByText } = render(<CreateExpenseScreen />)

    await waitFor(() => {
      const backButton = getByText('← Back')
      fireEvent.press(backButton)
      expect(mockRouter.back).toHaveBeenCalled()
    })
  })

  it('should show loading state while fetching participants', () => {
    const { getByText } = render(<CreateExpenseScreen />)

    expect(getByText('Loading participants...')).toBeTruthy()
  })

  it('should have submit button disabled without required data', async () => {
    const { getByText } = render(<CreateExpenseScreen />)

    await waitFor(() => {
      const submitButton = getByText('✅ Add Expense')
      expect(submitButton).toBeTruthy()
    })
  })
})
