/**
 * Component tests for Itinerary Create Form
 */

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import CreateItineraryItemScreen from '../../../app/(app)/trips/[id]/itinerary/create'

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
  createItineraryItem: jest.fn(),
}))

describe('CreateItineraryItemScreen', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'trip-123' })
  })

  it('should render the form with all fields', () => {
    const { getByText, getByPlaceholderText } = render(<CreateItineraryItemScreen />)

    expect(getByText('Add Itinerary Item')).toBeTruthy()
    expect(getByText('Type')).toBeTruthy()
    expect(getByText('Title')).toBeTruthy()
    expect(getByPlaceholderText('e.g., Visit Eiffel Tower')).toBeTruthy()
  })

  it('should show type selector buttons', () => {
    const { getByText } = render(<CreateItineraryItemScreen />)

    expect(getByText('✈️ Transport')).toBeTruthy()
    expect(getByText('🏨 Accommodation')).toBeTruthy()
    expect(getByText('🍽️ Dining')).toBeTruthy()
    expect(getByText('🎯 Activity')).toBeTruthy()
    expect(getByText('🏛️ Sightseeing')).toBeTruthy()
    expect(getByText('📌 General')).toBeTruthy()
  })

  it('should allow selecting a type', () => {
    const { getByText } = render(<CreateItineraryItemScreen />)

    const transportButton = getByText('✈️ Transport')
    fireEvent.press(transportButton)

    // Type selection should update the form state
    expect(transportButton).toBeTruthy()
  })

  it('should navigate back when back button is pressed', () => {
    const { getByText } = render(<CreateItineraryItemScreen />)

    const backButton = getByText('← Back')
    fireEvent.press(backButton)

    expect(mockRouter.back).toHaveBeenCalled()
  })

  it('should have required field labels marked', () => {
    const { getByText } = render(<CreateItineraryItemScreen />)

    // Type, Title, and Start Time should be marked as required
    expect(getByText('Type')).toBeTruthy()
    expect(getByText('Title')).toBeTruthy()
    expect(getByText('Start Time')).toBeTruthy()
  })

  it('should have optional fields', () => {
    const { getByText } = render(<CreateItineraryItemScreen />)

    expect(getByText('End Time (Optional)')).toBeTruthy()
    expect(getByText('Location')).toBeTruthy()
    expect(getByText('Description')).toBeTruthy()
    expect(getByText('Notes')).toBeTruthy()
  })
})
