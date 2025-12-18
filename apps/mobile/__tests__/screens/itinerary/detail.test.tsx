/**
 * Component tests for Itinerary Item Detail Screen
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import ItineraryItemDetailScreen from '../../../app/(app)/trips/[id]/itinerary/[itemId]'
import * as ItineraryQueries from '@tripthreads/core'

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
  getItineraryItem: jest.fn(),
  updateItineraryItem: jest.fn(),
  deleteItineraryItem: jest.fn(),
}))

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
}

const mockItineraryItem = {
  id: 'item-1',
  trip_id: 'trip-1',
  type: 'activity',
  title: 'Visit Eiffel Tower',
  description: 'See the iconic Eiffel Tower',
  notes: 'Buy tickets online',
  start_time: '2025-10-15T10:00:00Z',
  end_time: '2025-10-15T12:00:00Z',
  location: 'Paris, France',
  created_by: 'user-1',
  created_at: '2025-10-01T10:00:00Z',
  updated_at: '2025-10-01T10:00:00Z',
}

describe('ItineraryItemDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useLocalSearchParams as jest.Mock).mockReturnValue({
      id: 'trip-1',
      itemId: 'item-1',
    })
    ;(ItineraryQueries.getItineraryItem as jest.Mock).mockResolvedValue(mockItineraryItem)
  })

  describe('View Mode', () => {
    it('should render itinerary item details', async () => {
      render(<ItineraryItemDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('Visit Eiffel Tower')).toBeTruthy()
      })

      expect(screen.getByText('See the iconic Eiffel Tower')).toBeTruthy()
      expect(screen.getByText('Buy tickets online')).toBeTruthy()
      expect(screen.getByText(/Paris, France/)).toBeTruthy()
    })

    it('should display type icon', async () => {
      render(<ItineraryItemDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('🎯')).toBeTruthy() // Activity icon
      })
    })

    it('should display time range', async () => {
      render(<ItineraryItemDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText(/10\/15\/2025/)).toBeTruthy()
      })
    })

    it('should show edit and delete buttons', async () => {
      render(<ItineraryItemDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeTruthy()
        expect(screen.getByText('🗑️ Delete')).toBeTruthy()
      })
    })

    it('should display different icons for different types', async () => {
      const types = [
        { type: 'transport', icon: '✈️' },
        { type: 'accommodation', icon: '🏨' },
        { type: 'dining', icon: '🍽️' },
        { type: 'activity', icon: '🎯' },
        { type: 'sightseeing', icon: '🏛️' },
        { type: 'general', icon: '📌' },
      ]

      for (const { type, icon } of types) {
        ;(ItineraryQueries.getItineraryItem as jest.Mock).mockResolvedValue({
          ...mockItineraryItem,
          type,
        })

        const { unmount } = render(<ItineraryItemDetailScreen />)

        await waitFor(() => {
          expect(screen.getByText(icon)).toBeTruthy()
        })

        unmount()
      }
    })
  })

  describe('Edit Mode', () => {
    it('should enter edit mode when edit button is tapped', async () => {
      render(<ItineraryItemDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('✏️ Edit'))

      await waitFor(() => {
        expect(screen.getByText('💾 Save')).toBeTruthy()
        expect(screen.getByText('Cancel')).toBeTruthy()
      })
    })

    it('should show form fields in edit mode', async () => {
      render(<ItineraryItemDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('✏️ Edit'))

      await waitFor(() => {
        expect(screen.getByText(/Type\s*\*/)).toBeTruthy()
        expect(screen.getByText(/Title\s*\*/)).toBeTruthy()
        expect(screen.getByText(/Start Time\s*\*/)).toBeTruthy()
        expect(screen.getByText('End Time (Optional)')).toBeTruthy()
        expect(screen.getByText('Location')).toBeTruthy()
        expect(screen.getByText('Description')).toBeTruthy()
        expect(screen.getByText('Notes')).toBeTruthy()
      })
    })

    it('should pre-populate form with current values', async () => {
      render(<ItineraryItemDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('✏️ Edit'))

      await waitFor(() => {
        expect(screen.getByDisplayValue('Visit Eiffel Tower')).toBeTruthy()
        expect(screen.getByDisplayValue('See the iconic Eiffel Tower')).toBeTruthy()
        expect(screen.getByDisplayValue('Buy tickets online')).toBeTruthy()
        expect(screen.getByDisplayValue('Paris, France')).toBeTruthy()
      })
    })

    it('should cancel edit mode without saving', async () => {
      render(<ItineraryItemDetailScreen />)

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
      const updatedItem = { ...mockItineraryItem, title: 'Updated Title' }
      ;(ItineraryQueries.updateItineraryItem as jest.Mock).mockResolvedValue(updatedItem)

      render(<ItineraryItemDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('✏️ Edit'))

      await waitFor(() => {
        expect(screen.getByDisplayValue('Visit Eiffel Tower')).toBeTruthy()
      })

      const titleInput = screen.getByDisplayValue('Visit Eiffel Tower')
      fireEvent.changeText(titleInput, 'Updated Title')

      fireEvent.press(screen.getByText('💾 Save'))

      await waitFor(() => {
        expect(ItineraryQueries.updateItineraryItem).toHaveBeenCalledWith(
          expect.anything(),
          'item-1',
          expect.objectContaining({
            title: 'Updated Title',
          })
        )
      })
    })
  })

  describe('Delete Flow', () => {
    it('should show confirmation alert when delete is tapped', async () => {
      // Note: Testing Alert in React Native is challenging
      // This test verifies the delete button is present and callable
      render(<ItineraryItemDetailScreen />)

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
      ;(ItineraryQueries.getItineraryItem as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockItineraryItem), 100))
      )

      render(<ItineraryItemDetailScreen />)

      expect(screen.getByText('Loading...')).toBeTruthy()

      // Wait for content to appear instead of loading to disappear
      await waitFor(() => {
        expect(screen.getByText('Visit Eiffel Tower')).toBeTruthy()
      })

      // Then verify loading is gone
      expect(screen.queryByText('Loading...')).toBeFalsy()
    })

    it('should show not found message when item does not exist', async () => {
      ;(ItineraryQueries.getItineraryItem as jest.Mock).mockRejectedValue(new Error('Not found'))

      render(<ItineraryItemDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('Item Not Found')).toBeTruthy()
        expect(screen.getByText('Go Back')).toBeTruthy()
      })
    })
  })

  describe('Navigation', () => {
    it('should navigate back when back button is pressed', async () => {
      render(<ItineraryItemDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('← Back')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('← Back'))

      expect(mockRouter.back).toHaveBeenCalled()
    })
  })

  describe('Type Selection', () => {
    it('should display all type options in edit mode', async () => {
      render(<ItineraryItemDetailScreen />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('✏️ Edit'))

      await waitFor(() => {
        expect(screen.getByText('✈️ Transport')).toBeTruthy()
        expect(screen.getByText('🏨 Accommodation')).toBeTruthy()
        expect(screen.getByText('🍽️ Dining')).toBeTruthy()
        expect(screen.getByText('🎯 Activity')).toBeTruthy()
        expect(screen.getByText('🏛️ Sightseeing')).toBeTruthy()
        expect(screen.getByText('📌 General')).toBeTruthy()
      })
    })
  })
})
