/**
 * Component Tests: CalendarEventCard
 *
 * Tests the calendar event card component for displaying itinerary items in calendar view.
 */

import { describe, it, jest } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalendarEventCard } from '@/components/features/itinerary/CalendarEventCard'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'

const mockTimedItem: ItineraryItemWithParticipants = {
  id: 'item-1',
  trip_id: 'trip-123',
  type: 'transport',
  title: 'Flight to Lisbon',
  description: 'Morning flight',
  notes: null,
  links: [],
  start_time: '2025-06-15T08:00:00Z',
  end_time: '2025-06-15T11:00:00Z',
  is_all_day: false,
  location: 'Lisbon Airport',
  metadata: {},
  created_by: 'user-123',
  created_at: '2025-06-01T10:00:00Z',
  updated_at: '2025-06-01T10:00:00Z',
  participants: [],
}

const mockAllDayItem: ItineraryItemWithParticipants = {
  id: 'item-2',
  trip_id: 'trip-123',
  type: 'activity',
  title: 'Beach Day',
  description: 'Relax at Cascais',
  notes: null,
  links: [],
  start_time: '2025-06-16T00:00:00Z',
  end_time: null,
  is_all_day: true,
  location: 'Cascais Beach',
  metadata: {},
  created_by: 'user-123',
  created_at: '2025-06-01T10:00:00Z',
  updated_at: '2025-06-01T10:00:00Z',
  participants: [],
}

describe('CalendarEventCard', () => {
  describe('Timed Events', () => {
    it('should display title and time for timed events', () => {
      render(<CalendarEventCard item={mockTimedItem} isAllDay={false} />)

      expect(screen.getByText('Flight to Lisbon')).toBeInTheDocument()
      expect(screen.getByText(/8:00 am/i)).toBeInTheDocument()
    })

    it('should display location if provided', () => {
      render(<CalendarEventCard item={mockTimedItem} isAllDay={false} />)

      expect(screen.getByText('Lisbon Airport')).toBeInTheDocument()
    })

    it('should not display location if not provided', () => {
      const itemWithoutLocation = { ...mockTimedItem, location: null }
      render(<CalendarEventCard item={itemWithoutLocation} isAllDay={false} />)

      expect(screen.queryByText('Lisbon Airport')).not.toBeInTheDocument()
    })

    it('should display type-specific icon', () => {
      const { container } = render(<CalendarEventCard item={mockTimedItem} isAllDay={false} />)

      // Transport type should have Plane icon (lucide-react)
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should apply type-specific colors', () => {
      const { container } = render(<CalendarEventCard item={mockTimedItem} isAllDay={false} />)

      // Transport type has blue colors
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('bg-blue-50')
      expect(card).toHaveClass('border-blue-200')
    })
  })

  describe('All-Day Events', () => {
    it('should display "All day" instead of time', () => {
      render(<CalendarEventCard item={mockAllDayItem} isAllDay={true} />)

      expect(screen.getByText('All day')).toBeInTheDocument()
      expect(screen.queryByText(/\d+:\d+ [ap]m/i)).not.toBeInTheDocument()
    })

    it('should apply min-height for all-day events', () => {
      const { container } = render(<CalendarEventCard item={mockAllDayItem} isAllDay={true} />)

      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('min-h-[40px]')
    })
  })

  describe('Event Types', () => {
    const testCases: Array<{
      type: ItineraryItemWithParticipants['type']
      expectedLabel: string
      expectedColor: string
    }> = [
      { type: 'transport', expectedLabel: 'Flight to Lisbon', expectedColor: 'text-blue-600' },
      { type: 'accommodation', expectedLabel: 'Hotel Stay', expectedColor: 'text-purple-600' },
      { type: 'dining', expectedLabel: 'Dinner', expectedColor: 'text-amber-600' },
      { type: 'activity', expectedLabel: 'Museum Visit', expectedColor: 'text-green-600' },
      { type: 'sightseeing', expectedLabel: 'City Tour', expectedColor: 'text-pink-600' },
      { type: 'general', expectedLabel: 'Meeting', expectedColor: 'text-gray-600' },
    ]

    testCases.forEach(({ type, expectedLabel, expectedColor }) => {
      it(`should display ${type} events with correct styling`, () => {
        const item = { ...mockTimedItem, type, title: expectedLabel }
        render(<CalendarEventCard item={item} isAllDay={false} />)

        expect(screen.getByText(expectedLabel)).toBeInTheDocument()

        const titleElement = screen.getByText(expectedLabel)
        expect(titleElement).toHaveClass(expectedColor)
      })
    })
  })

  describe('Interactions', () => {
    it('should call onClick when clicked', async () => {
      const user = userEvent.setup()
      const mockOnClick = jest.fn()

      render(<CalendarEventCard item={mockTimedItem} isAllDay={false} onClick={mockOnClick} />)

      const card = screen.getByRole('button')
      await user.click(card)

      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      const mockOnClick = jest.fn()

      render(<CalendarEventCard item={mockTimedItem} isAllDay={false} onClick={mockOnClick} />)

      const card = screen.getByRole('button')
      card.focus()
      await user.keyboard('{Enter}')

      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('should apply hover effects', () => {
      const { container } = render(<CalendarEventCard item={mockTimedItem} isAllDay={false} />)

      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('hover:shadow-md')
    })
  })

  describe('Text Truncation', () => {
    it('should truncate long titles', () => {
      const longTitleItem = {
        ...mockTimedItem,
        title:
          'This is a very long title that should be truncated because it exceeds the available space',
      }
      render(<CalendarEventCard item={longTitleItem} isAllDay={false} />)

      const titleElement = screen.getByText(longTitleItem.title)
      expect(titleElement).toHaveClass('truncate')
    })

    it('should truncate long locations', () => {
      const longLocationItem = {
        ...mockTimedItem,
        location: 'This is a very long location name that should be truncated',
      }
      render(<CalendarEventCard item={longLocationItem} isAllDay={false} />)

      const locationElement = screen.getByText(longLocationItem.location)
      expect(locationElement).toHaveClass('truncate')
    })
  })

  describe('Responsive Design', () => {
    it('should use compact layout with flex', () => {
      const { container } = render(<CalendarEventCard item={mockTimedItem} isAllDay={false} />)

      const contentDiv = container.querySelector('.flex.items-start.gap-2')
      expect(contentDiv).toBeInTheDocument()
    })

    it('should have border-l-4 for visual emphasis', () => {
      const { container } = render(<CalendarEventCard item={mockTimedItem} isAllDay={false} />)

      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('border-l-4')
    })
  })

  describe('Edge Cases', () => {
    it('should handle item with no end time', () => {
      const itemNoEndTime = { ...mockTimedItem, end_time: null }
      render(<CalendarEventCard item={itemNoEndTime} isAllDay={false} />)

      expect(screen.getByText('Flight to Lisbon')).toBeInTheDocument()
      expect(screen.getByText(/8:00 am/i)).toBeInTheDocument()
    })

    it('should handle item with no description', () => {
      const itemNoDescription = { ...mockTimedItem, description: null }
      render(<CalendarEventCard item={itemNoDescription} isAllDay={false} />)

      expect(screen.getByText('Flight to Lisbon')).toBeInTheDocument()
    })

    it('should handle midnight times correctly', () => {
      const midnightItem = {
        ...mockTimedItem,
        start_time: '2025-06-15T00:00:00Z',
      }
      render(<CalendarEventCard item={midnightItem} isAllDay={false} />)

      // Should display as 12:00 AM
      expect(screen.getByText(/12:00 am/i)).toBeInTheDocument()
    })

    it('should handle noon times correctly', () => {
      const noonItem = {
        ...mockTimedItem,
        start_time: '2025-06-15T12:00:00Z',
      }
      render(<CalendarEventCard item={noonItem} isAllDay={false} />)

      // Should display as 12:00 PM
      expect(screen.getByText(/12:00 pm/i)).toBeInTheDocument()
    })
  })
})
