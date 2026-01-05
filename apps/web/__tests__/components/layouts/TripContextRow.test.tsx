/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { TripContextRow } from '@/components/layouts/TripContextRow'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

describe('TripContextRow', () => {
  const mockTrip = {
    id: 'trip-1',
    name: 'Summer Vacation',
    description: 'A fun trip to the beach',
    start_date: '2024-06-01',
    end_date: '2024-06-15',
    trip_participants: [
      {
        id: 'participant-1',
        role: 'owner' as const,
        user: {
          id: 'user-1',
          full_name: 'John Doe',
          avatar_url: null,
        },
      },
      {
        id: 'participant-2',
        role: 'participant' as const,
        user: {
          id: 'user-2',
          full_name: 'Jane Smith',
          avatar_url: null,
        },
      },
    ],
  }

  const mockOnNavigate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Date formatting', () => {
    it('renders dates in correct format for same-year trips', () => {
      render(
        <TripContextRow
          trip={mockTrip}
          isOwner={true}
          userRole="owner"
          activeSection="home"
          onNavigate={mockOnNavigate}
        />
      )

      // Should format as "MMM d - MMM d, yyyy"
      expect(screen.getByText(/Jun 1 - Jun 15, 2024/i)).toBeInTheDocument()
    })

    it('renders dates correctly for cross-year trips', () => {
      const crossYearTrip = {
        ...mockTrip,
        start_date: '2026-12-30',
        end_date: '2027-01-08',
      }

      render(
        <TripContextRow
          trip={crossYearTrip}
          isOwner={true}
          userRole="owner"
          activeSection="home"
          onNavigate={mockOnNavigate}
        />
      )

      // Should format as "Dec 30 - Jan 8, 2027"
      // Both month names should be present
      expect(screen.getByText(/Dec 30 - Jan 8, 2027/i)).toBeInTheDocument()
    })

    it('includes month name in end date (bug fix verification)', () => {
      const tripWithBugScenario = {
        ...mockTrip,
        start_date: '2026-12-30',
        end_date: '2027-01-08',
      }

      render(
        <TripContextRow
          trip={tripWithBugScenario}
          isOwner={true}
          userRole="owner"
          activeSection="home"
          onNavigate={mockOnNavigate}
        />
      )

      // Verify the end date includes "Jan" (not just "8, 2027")
      const dateElement = screen.getByText(/Dec 30 - Jan 8, 2027/i)
      expect(dateElement).toBeInTheDocument()

      // Ensure the old buggy format is NOT present
      expect(screen.queryByText(/Dec 30-8, 2027/i)).not.toBeInTheDocument()
    })

    it('includes spaces around the dash separator', () => {
      render(
        <TripContextRow
          trip={mockTrip}
          isOwner={true}
          userRole="owner"
          activeSection="home"
          onNavigate={mockOnNavigate}
        />
      )

      // Should have spaces: "Jun 1 - Jun 15, 2024"
      // Not "Jun 1-Jun 15, 2024"
      const dateText = screen.getByText(/Jun 1 - Jun 15, 2024/i).textContent
      expect(dateText).toMatch(/\s-\s/)
    })
  })

  describe('Basic rendering', () => {
    it('renders trip name', () => {
      render(
        <TripContextRow
          trip={mockTrip}
          isOwner={true}
          userRole="owner"
          activeSection="home"
          onNavigate={mockOnNavigate}
        />
      )

      expect(screen.getByText('Summer Vacation')).toBeInTheDocument()
    })

    it('shows Owner badge for owner', () => {
      render(
        <TripContextRow
          trip={mockTrip}
          isOwner={true}
          userRole="owner"
          activeSection="home"
          onNavigate={mockOnNavigate}
        />
      )

      expect(screen.getByText('Owner')).toBeInTheDocument()
    })

    it('shows Viewer badge for viewer', () => {
      render(
        <TripContextRow
          trip={mockTrip}
          isOwner={false}
          userRole="viewer"
          activeSection="home"
          onNavigate={mockOnNavigate}
        />
      )

      expect(screen.getByText('Viewer')).toBeInTheDocument()
    })
  })
})
