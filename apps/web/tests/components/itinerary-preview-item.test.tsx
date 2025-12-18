/**
 * Component Tests: ItineraryPreviewItem
 *
 * Tests the itinerary preview item component for displaying items in the trip detail page preview.
 */

import { describe, it } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'

// Import the parent component to access the internal ItineraryPreviewItem
import { ItineraryPreview } from '@/components/features/itinerary/ItineraryPreview'

const mockTimedItem: ItineraryItemWithParticipants = {
  id: 'item-1',
  trip_id: 'trip-123',
  type: 'transport',
  title: 'Flight to Paris',
  description: 'Morning flight',
  notes: null,
  links: [],
  start_time: '2025-06-15T08:00:00Z',
  end_time: '2025-06-15T11:00:00Z',
  is_all_day: false,
  location: 'Charles de Gaulle Airport',
  metadata: {
    flight_number: 'AF123',
    departure_location: 'JFK',
    arrival_location: 'CDG',
    terminal: '2E',
    gate: 'K12',
  },
  created_by: 'user-123',
  created_at: '2025-06-01T10:00:00Z',
  updated_at: '2025-06-01T10:00:00Z',
  participants: [],
}

const mockAllDayItem: ItineraryItemWithParticipants = {
  id: 'item-2',
  trip_id: 'trip-123',
  type: 'activity',
  title: 'Museum Day',
  description: 'Visit the Louvre',
  notes: null,
  links: [],
  start_time: '2025-06-16T00:00:00Z',
  end_time: null,
  is_all_day: true,
  location: 'Louvre Museum',
  metadata: {},
  created_by: 'user-123',
  created_at: '2025-06-01T10:00:00Z',
  updated_at: '2025-06-01T10:00:00Z',
  participants: [],
}

describe('ItineraryPreviewItem', () => {
  describe('Basic Display', () => {
    it('should display title and time for timed items', () => {
      render(<ItineraryPreview items={[mockTimedItem]} tripId="trip-123" />)

      expect(screen.getByText('Flight to Paris')).toBeInTheDocument()
      expect(screen.getByText(/\d+:\d+ [ap]m/i)).toBeInTheDocument()
    })

    it('should display "All day" for all-day items', () => {
      render(<ItineraryPreview items={[mockAllDayItem]} tripId="trip-123" />)

      expect(screen.getByText('Museum Day')).toBeInTheDocument()
      expect(screen.getByText('All day')).toBeInTheDocument()
    })

    it('should display location when provided', () => {
      render(<ItineraryPreview items={[mockTimedItem]} tripId="trip-123" />)

      expect(screen.getByText('Charles de Gaulle Airport')).toBeInTheDocument()
    })

    it('should not display location when not provided', () => {
      const itemWithoutLocation = { ...mockTimedItem, location: null }
      render(<ItineraryPreview items={[itemWithoutLocation]} tripId="trip-123" />)

      expect(screen.queryByText('Charles de Gaulle Airport')).not.toBeInTheDocument()
    })

    it('should display type badge', () => {
      render(<ItineraryPreview items={[mockTimedItem]} tripId="trip-123" />)

      expect(screen.getByText('Transport')).toBeInTheDocument()
    })

    it('should display type-specific icon', () => {
      const { container } = render(<ItineraryPreview items={[mockTimedItem]} tripId="trip-123" />)

      // Transport type should have Plane icon
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Event Types', () => {
    const testCases: Array<{
      type: ItineraryItemWithParticipants['type']
      expectedLabel: string
      expectedBadge: string
    }> = [
      { type: 'transport', expectedLabel: 'Flight to Paris', expectedBadge: 'Transport' },
      { type: 'accommodation', expectedLabel: 'Hotel Check-in', expectedBadge: 'Accommodation' },
      { type: 'dining', expectedLabel: 'Dinner Reservation', expectedBadge: 'Dining' },
      { type: 'activity', expectedLabel: 'Museum Tour', expectedBadge: 'Activity' },
      { type: 'sightseeing', expectedLabel: 'Eiffel Tower', expectedBadge: 'Sightseeing' },
      { type: 'general', expectedLabel: 'Meeting', expectedBadge: 'General' },
    ]

    testCases.forEach(({ type, expectedLabel, expectedBadge }) => {
      it(`should display ${type} items with correct badge`, () => {
        const item = { ...mockTimedItem, type, title: expectedLabel }
        render(<ItineraryPreview items={[item]} tripId="trip-123" />)

        expect(screen.getByText(expectedLabel)).toBeInTheDocument()
        expect(screen.getByText(expectedBadge)).toBeInTheDocument()
      })
    })
  })

  describe('Styling', () => {
    it('should apply border and padding', () => {
      const { container } = render(<ItineraryPreview items={[mockTimedItem]} tripId="trip-123" />)

      const card = container.querySelector('.rounded-lg.border.bg-card.p-3')
      expect(card).toBeInTheDocument()
    })

    it('should apply hover effects', () => {
      const { container } = render(<ItineraryPreview items={[mockTimedItem]} tripId="trip-123" />)

      const card = container.querySelector('.hover\\:shadow-sm')
      expect(card).toBeInTheDocument()
    })

    it('should truncate long titles', () => {
      const longTitleItem = {
        ...mockTimedItem,
        title:
          'This is a very long title that should be truncated because it exceeds the available space in the preview card layout',
      }
      render(<ItineraryPreview items={[longTitleItem]} tripId="trip-123" />)

      const titleElement = screen.getByText(longTitleItem.title)
      expect(titleElement).toHaveClass('truncate')
    })

    it('should truncate long locations', () => {
      const longLocationItem = {
        ...mockTimedItem,
        location:
          'This is a very long location name that should be truncated to fit in the preview',
      }
      render(<ItineraryPreview items={[longLocationItem]} tripId="trip-123" />)

      const locationElement = screen.getByText(longLocationItem.location)
      expect(locationElement).toHaveClass('truncate')
    })
  })

  describe('Layout', () => {
    it('should use flex layout with gap', () => {
      const { container } = render(<ItineraryPreview items={[mockTimedItem]} tripId="trip-123" />)

      const layout = container.querySelector('.flex.items-start.gap-3')
      expect(layout).toBeInTheDocument()
    })

    it('should display time on the right side', () => {
      const { container } = render(<ItineraryPreview items={[mockTimedItem]} tripId="trip-123" />)

      const timeContainer = container.querySelector('.flex.items-baseline.justify-between')
      expect(timeContainer).toBeInTheDocument()
    })

    it('should display type badge on far right', () => {
      render(<ItineraryPreview items={[mockTimedItem]} tripId="trip-123" />)

      const badge = screen.getByText('Transport')
      expect(badge).toHaveClass('flex-shrink-0')
    })
  })

  describe('Edge Cases', () => {
    it('should handle item with no end time', () => {
      const itemNoEndTime = { ...mockTimedItem, end_time: null }
      render(<ItineraryPreview items={[itemNoEndTime]} tripId="trip-123" />)

      expect(screen.getByText('Flight to Paris')).toBeInTheDocument()
      expect(screen.getByText(/\d+:\d+ [ap]m/i)).toBeInTheDocument()
    })

    it('should handle item with no description', () => {
      const itemNoDescription = { ...mockTimedItem, description: null }
      render(<ItineraryPreview items={[itemNoDescription]} tripId="trip-123" />)

      expect(screen.getByText('Flight to Paris')).toBeInTheDocument()
    })

    it('should handle midnight times correctly', () => {
      const midnightItem = {
        ...mockTimedItem,
        start_time: '2025-06-15T00:00:00Z',
      }
      render(<ItineraryPreview items={[midnightItem]} tripId="trip-123" />)

      // Should display time in AM/PM format (exact time depends on timezone)
      expect(screen.getByText(/\d+:\d+ [ap]m/i)).toBeInTheDocument()
    })

    it('should handle noon times correctly', () => {
      const noonItem = {
        ...mockTimedItem,
        start_time: '2025-06-15T12:00:00Z',
      }
      render(<ItineraryPreview items={[noonItem]} tripId="trip-123" />)

      // Should display time in AM/PM format (exact time depends on timezone)
      expect(screen.getByText(/\d+:\d+ [ap]m/i)).toBeInTheDocument()
    })
  })

  describe('Enhanced Features (Duration Badge)', () => {
    it('should display duration badge for items with end_time', () => {
      render(<ItineraryPreview items={[mockTimedItem]} tripId="trip-123" />)

      // Should show duration: 8:00 AM to 11:00 AM = 3h
      expect(screen.getByText('3h')).toBeInTheDocument()
    })

    it('should not display duration badge for all-day items', () => {
      render(<ItineraryPreview items={[mockAllDayItem]} tripId="trip-123" />)

      // Should not have duration badge
      expect(screen.queryByText(/\dh/)).not.toBeInTheDocument()
      expect(screen.queryByText(/\d+\s+days?/)).not.toBeInTheDocument()
    })

    it('should not display duration badge when end_time is null', () => {
      const itemNoEndTime = { ...mockTimedItem, end_time: null }
      render(<ItineraryPreview items={[itemNoEndTime]} tripId="trip-123" />)

      expect(screen.queryByText(/\dh/)).not.toBeInTheDocument()
    })

    it('should display hours and minutes in duration', () => {
      const item = {
        ...mockTimedItem,
        start_time: '2025-06-15T08:00:00Z',
        end_time: '2025-06-15T10:30:00Z',
      }
      render(<ItineraryPreview items={[item]} tripId="trip-123" />)

      expect(screen.getByText('2h 30m')).toBeInTheDocument()
    })

    it('should display multi-day duration', () => {
      const item = {
        ...mockTimedItem,
        start_time: '2025-06-15T08:00:00Z',
        end_time: '2025-06-18T08:00:00Z',
      }
      render(<ItineraryPreview items={[item]} tripId="trip-123" />)

      expect(screen.getByText('3 days')).toBeInTheDocument()
    })
  })

  describe('Enhanced Features (Tooltip with Metadata)', () => {
    it('should wrap item in tooltip when metadata is present', () => {
      render(<ItineraryPreview items={[mockTimedItem]} tripId="trip-123" />)

      // Item should still render normally
      expect(screen.getByText('Flight to Paris')).toBeInTheDocument()
    })

    it('should work without tooltip when no metadata', () => {
      const itemWithoutMetadata = { ...mockTimedItem, metadata: {} }
      render(<ItineraryPreview items={[itemWithoutMetadata]} tripId="trip-123" />)

      // Item should render normally even without metadata
      expect(screen.getByText('Flight to Paris')).toBeInTheDocument()
      expect(screen.getByText(/\d+:\d+ [ap]m/i)).toBeInTheDocument()
    })
  })

  describe('Enhanced Features (Integration)', () => {
    it('should display both duration badge and tooltip wrapper', () => {
      render(<ItineraryPreview items={[mockTimedItem]} tripId="trip-123" />)

      // Should have all original content
      expect(screen.getByText('Flight to Paris')).toBeInTheDocument()
      expect(screen.getByText(/\d+:\d+ [ap]m/i)).toBeInTheDocument()
      expect(screen.getByText('Charles de Gaulle Airport')).toBeInTheDocument()

      // Should have duration badge
      expect(screen.getByText('3h')).toBeInTheDocument()

      // Should have type badge
      expect(screen.getByText('Transport')).toBeInTheDocument()
    })

    it('should maintain layout with enhancements', () => {
      const { container } = render(<ItineraryPreview items={[mockTimedItem]} tripId="trip-123" />)

      const card = container.querySelector('.rounded-lg.border.bg-card.p-3')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('hover:shadow-sm')

      const layout = container.querySelector('.flex.items-start.gap-3')
      expect(layout).toBeInTheDocument()
    })
  })
})
