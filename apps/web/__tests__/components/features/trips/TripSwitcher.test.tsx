import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { TripSwitcher } from '@/components/features/trips/TripSwitcher'
import { TripWithParticipants } from '@tripthreads/core'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock getTripStatus from trip-utils
jest.mock('@/lib/utils/trip-utils', () => ({
  getTripStatus: jest.fn(trip => {
    const now = new Date()
    const startDate = new Date(trip.start_date)
    const endDate = new Date(trip.end_date)

    now.setHours(0, 0, 0, 0)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    if (now < startDate) {
      return 'upcoming'
    } else if (now >= startDate && now <= endDate) {
      return 'ongoing'
    } else {
      return 'past'
    }
  }),
}))

describe('TripSwitcher', () => {
  const mockPush = jest.fn()
  const mockRouter = { push: mockPush }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  // Date helper utilities for dynamic test dates
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  const getToday = (): Date => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }

  // Helper to create trips with dynamic dates relative to today
  const createOngoingTrip = (
    id: string,
    name: string,
    startDaysAgo = 5,
    endDaysFromNow = 5
  ): TripWithParticipants => {
    const today = getToday()
    const startDate = formatDate(addDays(today, -startDaysAgo))
    const endDate = formatDate(addDays(today, endDaysFromNow))
    return createMockTrip(id, name, startDate, endDate)
  }

  const createUpcomingTrip = (
    id: string,
    name: string,
    startDaysFromNow = 3,
    durationDays = 5
  ): TripWithParticipants => {
    const today = getToday()
    const startDate = formatDate(addDays(today, startDaysFromNow))
    const endDate = formatDate(addDays(today, startDaysFromNow + durationDays))
    return createMockTrip(id, name, startDate, endDate)
  }

  const createPastTrip = (id: string, name: string, endDaysAgo = 2): TripWithParticipants => {
    const today = getToday()
    const startDate = formatDate(addDays(today, -(endDaysAgo + 5)))
    const endDate = formatDate(addDays(today, -endDaysAgo))
    return createMockTrip(id, name, startDate, endDate)
  }

  const createMockTrip = (
    id: string,
    name: string,
    startDate: string,
    endDate: string
  ): TripWithParticipants => ({
    id,
    name,
    description: null,
    start_date: startDate,
    end_date: endDate,
    cover_image_url: null,
    owner_id: 'user-1',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    base_currency: 'EUR',
    owner: {
      id: 'user-1',
      full_name: 'Test User',
      avatar_url: null,
    },
    trip_participants: [
      {
        id: 'participant-1',
        role: 'owner',
        user: {
          id: 'user-1',
          full_name: 'Test User',
          avatar_url: null,
        },
      },
    ],
  })

  describe('Filtering and Display', () => {
    it('filters and displays only active and upcoming trips (excludes past)', async () => {
      const user = userEvent.setup()
      const trips = [
        createPastTrip('past-trip', 'Past Trip'),
        createOngoingTrip('ongoing-trip', 'Ongoing Trip'),
        createUpcomingTrip('upcoming-trip', 'Upcoming Trip'),
      ]

      render(
        <TripSwitcher currentTripId="ongoing-trip" currentTripName="Ongoing Trip" trips={trips} />
      )

      // Open dropdown - use getByLabelText for better accessibility querying
      const trigger = screen.getByLabelText('Switch trip')
      await user.click(trigger)

      // Wait for dropdown content to appear and verify trips shown
      const menuItems = await screen.findAllByRole('menuitem')
      expect(menuItems).toHaveLength(2)

      // Check trip names in menu
      expect(menuItems[0]).toHaveTextContent('Ongoing Trip')
      expect(menuItems[1]).toHaveTextContent('Upcoming Trip')

      // Past trip should not be in menu
      expect(screen.queryByText('Past Trip')).not.toBeInTheDocument()
    })

    it('sorts trips by start date (chronological)', async () => {
      const user = userEvent.setup()
      // Create 3 ongoing/upcoming trips with different start dates
      // First Trip: started 10 days ago (ongoing)
      // Second Trip: started 2 days ago (ongoing)
      // Third Trip: starts in 5 days (upcoming)
      const trips = [
        createUpcomingTrip('trip-3', 'Third Trip', 5, 5), // Starts in 5 days
        createOngoingTrip('trip-1', 'First Trip', 10, 3), // Started 10 days ago
        createOngoingTrip('trip-2', 'Second Trip', 2, 5), // Started 2 days ago
      ]

      render(<TripSwitcher currentTripId="trip-1" currentTripName="First Trip" trips={trips} />)

      // Open dropdown
      const trigger = screen.getByLabelText('Switch trip')
      await user.click(trigger)

      // Wait for menu items to appear
      const menuItems = await screen.findAllByRole('menuitem')

      // Should be sorted chronologically (earliest first)
      expect(menuItems[0]).toHaveTextContent('First Trip')
      expect(menuItems[1]).toHaveTextContent('Second Trip')
      expect(menuItems[2]).toHaveTextContent('Third Trip')
    })

    it('handles empty trips array gracefully', () => {
      render(
        <TripSwitcher currentTripId="current-trip" currentTripName="Current Trip" trips={[]} />
      )

      // Should show static trip name
      expect(screen.getByRole('heading', { name: 'Current Trip' })).toBeInTheDocument()

      // Should NOT have dropdown trigger
      expect(screen.queryByLabelText('Switch trip')).not.toBeInTheDocument()
    })
  })

  describe('Current Trip Highlighting', () => {
    it('highlights current trip with bg-accent background', async () => {
      const user = userEvent.setup()
      const trips = [
        createOngoingTrip('trip-1', 'Trip A', 5, 10),
        createOngoingTrip('trip-2', 'Trip B', 2, 5),
      ]

      render(<TripSwitcher currentTripId="trip-1" currentTripName="Trip A" trips={trips} />)

      // Open dropdown
      await user.click(screen.getByLabelText('Switch trip'))

      // Wait for menu items
      const menuItems = await screen.findAllByRole('menuitem')

      // First item should be Trip A (current trip) with highlighting
      expect(menuItems[0]).toHaveTextContent('Trip A')
      expect(menuItems[0]).toHaveClass('bg-accent')
      expect(menuItems[0]).toHaveClass('text-accent-foreground')
    })
  })

  describe('Status Badges', () => {
    it('displays correct status badges for ongoing and upcoming trips', async () => {
      const user = userEvent.setup()
      const trips = [
        createOngoingTrip('ongoing', 'Ongoing Trip'),
        createUpcomingTrip('upcoming', 'Upcoming Trip'),
      ]

      render(<TripSwitcher currentTripId="ongoing" currentTripName="Ongoing Trip" trips={trips} />)

      await user.click(screen.getByLabelText('Switch trip'))

      // Wait for menu items with badges
      const menuItems = await screen.findAllByRole('menuitem')

      // Check both badges are present
      expect(menuItems[0]).toHaveTextContent('Ongoing')
      expect(menuItems[1]).toHaveTextContent('Upcoming')
    })
  })

  describe('Navigation Behavior', () => {
    it('navigates to trip overview on trip selection', async () => {
      const user = userEvent.setup()
      const trips = [
        createOngoingTrip('trip-1', 'Trip A', 5, 10),
        createOngoingTrip('trip-2', 'Trip B', 2, 5),
      ]

      render(<TripSwitcher currentTripId="trip-1" currentTripName="Trip A" trips={trips} />)

      // Open dropdown
      await user.click(screen.getByLabelText('Switch trip'))

      // Wait for and click Trip B
      const tripB = await screen.findByText('Trip B')
      await user.click(tripB)

      // Verify navigation
      expect(mockPush).toHaveBeenCalledWith('/trips/trip-2')
    })

    it('calls onMobileSheetClose callback after navigation', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      const trips = [
        createOngoingTrip('trip-1', 'Trip A', 5, 10),
        createOngoingTrip('trip-2', 'Trip B', 2, 5),
      ]

      render(
        <TripSwitcher
          currentTripId="trip-1"
          currentTripName="Trip A"
          trips={trips}
          onMobileSheetClose={onClose}
        />
      )

      await user.click(screen.getByLabelText('Switch trip'))
      const tripB = await screen.findByText('Trip B')
      await user.click(tripB)

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Empty State Handling', () => {
    it('renders static trip name when fewer than 2 active trips', () => {
      const trips = [createOngoingTrip('only-trip', 'Only Trip')]

      render(<TripSwitcher currentTripId="only-trip" currentTripName="Only Trip" trips={trips} />)

      // Should NOT have dropdown trigger
      expect(screen.queryByLabelText('Switch trip')).not.toBeInTheDocument()

      // Should have static heading
      expect(screen.getByRole('heading', { name: 'Only Trip' })).toBeInTheDocument()
    })

    it('renders static trip name when all trips are past', () => {
      const trips = [
        createPastTrip('past-1', 'Past Trip 1', 5),
        createPastTrip('past-2', 'Past Trip 2', 3),
      ]

      render(<TripSwitcher currentTripId="past-1" currentTripName="Past Trip 1" trips={trips} />)

      // Should NOT have dropdown trigger (no active trips)
      expect(screen.queryByLabelText('Switch trip')).not.toBeInTheDocument()

      // Should have static heading
      expect(screen.getByRole('heading', { name: 'Past Trip 1' })).toBeInTheDocument()
    })
  })

  describe('UI Behavior', () => {
    it('truncates long trip names with title tooltip', async () => {
      const user = userEvent.setup()
      const longName =
        'My Amazing European Adventure Across 7 Countries Including France, Italy, Spain, and More'
      const trips = [
        createOngoingTrip('trip-1', longName, 5, 10),
        createOngoingTrip('trip-2', 'Short Trip', 2, 5),
      ]

      render(<TripSwitcher currentTripId="trip-1" currentTripName={longName} trips={trips} />)

      await user.click(screen.getByLabelText('Switch trip'))

      // Wait for dropdown and find the truncated span
      await waitFor(() => {
        const truncatedSpan = screen.getByText(longName, { selector: 'span.truncate' })
        expect(truncatedSpan).toHaveAttribute('title', longName)
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes on trigger button', () => {
      const trips = [
        createOngoingTrip('trip-1', 'Trip A', 5, 10),
        createOngoingTrip('trip-2', 'Trip B', 2, 5),
      ]

      render(<TripSwitcher currentTripId="trip-1" currentTripName="Trip A" trips={trips} />)

      const trigger = screen.getByLabelText('Switch trip')
      expect(trigger).toHaveAttribute('aria-label', 'Switch trip')
    })

    it('marks current trip with aria-current attribute', async () => {
      const user = userEvent.setup()
      const trips = [
        createOngoingTrip('trip-1', 'Trip A', 5, 10),
        createOngoingTrip('trip-2', 'Trip B', 2, 5),
      ]

      render(<TripSwitcher currentTripId="trip-1" currentTripName="Trip A" trips={trips} />)

      await user.click(screen.getByLabelText('Switch trip'))

      const menuItems = await screen.findAllByRole('menuitem')
      // First item is the current trip (Trip A)
      expect(menuItems[0]).toHaveAttribute('aria-current', 'page')
    })
  })

  describe('Keyboard Navigation', () => {
    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      const trips = [
        createOngoingTrip('trip-1', 'Trip A', 5, 10),
        createOngoingTrip('trip-2', 'Trip B', 2, 5),
      ]

      render(<TripSwitcher currentTripId="trip-1" currentTripName="Trip A" trips={trips} />)

      const trigger = screen.getByLabelText('Switch trip')

      // Focus and open with keyboard
      await user.tab()
      expect(trigger).toHaveFocus()

      // Open with Enter key
      await user.keyboard('{Enter}')

      // Menu should be visible
      const menuItems = await screen.findAllByRole('menuitem')
      expect(menuItems).toHaveLength(2)
    })
  })
})
