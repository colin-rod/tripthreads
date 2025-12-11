/**
 * Component Tests: ItineraryListItem
 *
 * Tests the itinerary list item component with expandable details for the list view.
 */

import { describe, it, jest } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'

// Import the parent component to access the internal ItineraryListItem
import { ListView } from '@/components/features/itinerary/ListView'

const mockTimedItem: ItineraryItemWithParticipants = {
  id: 'item-1',
  trip_id: 'trip-123',
  type: 'transport',
  title: 'Flight to Paris',
  description: 'Morning flight from JFK to CDG',
  notes: 'Remember to check in online 24 hours before',
  links: ['https://airline.com/checkin', 'https://flightaware.com/track123'],
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
    booking_reference: 'ABC123',
  },
  created_by: 'user-123',
  created_at: '2025-06-01T10:00:00Z',
  updated_at: '2025-06-01T10:00:00Z',
  participants: [
    { id: 'p1', user_id: 'user-1', display_name: 'Alice' },
    { id: 'p2', user_id: 'user-2', display_name: 'Bob' },
  ],
}

const mockAllDayItem: ItineraryItemWithParticipants = {
  id: 'item-2',
  trip_id: 'trip-123',
  type: 'activity',
  title: 'Museum Day',
  description: "Visit the Louvre and Musée d'Orsay",
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

const mockItemNoExtras: ItineraryItemWithParticipants = {
  id: 'item-3',
  trip_id: 'trip-123',
  type: 'dining',
  title: 'Dinner Reservation',
  description: null,
  notes: null,
  links: [],
  start_time: '2025-06-16T19:00:00Z',
  end_time: '2025-06-16T21:00:00Z',
  is_all_day: false,
  location: null,
  metadata: {},
  created_by: 'user-123',
  created_at: '2025-06-01T10:00:00Z',
  updated_at: '2025-06-01T10:00:00Z',
  participants: [],
}

describe('ItineraryListItem', () => {
  describe('Basic Display', () => {
    it('should display title and time for timed items', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      expect(screen.getByText('Flight to Paris')).toBeInTheDocument()
      expect(screen.getByText(/\d+:\d+ [ap]m/i)).toBeInTheDocument()
    })

    it('should display "All day" for all-day items', () => {
      render(<ListView items={[mockAllDayItem]} currentUserId="user-123" />)

      expect(screen.getByText('Museum Day')).toBeInTheDocument()
      expect(screen.getByText('All day')).toBeInTheDocument()
    })

    it('should display location when provided', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      expect(screen.getByText('Charles de Gaulle Airport')).toBeInTheDocument()
    })

    it('should not display location when not provided', () => {
      render(<ListView items={[mockItemNoExtras]} currentUserId="user-123" />)

      expect(screen.queryByText(/Airport|Museum/)).not.toBeInTheDocument()
    })

    it('should display type badge', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      expect(screen.getByText('Transport')).toBeInTheDocument()
    })

    it('should display type-specific icon', () => {
      const { container } = render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      // Transport type should have Plane icon
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should display description (line-clamped when collapsed)', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      expect(screen.getByText('Morning flight from JFK to CDG')).toBeInTheDocument()
    })

    it('should display participant count', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      expect(screen.getByText('2 participants')).toBeInTheDocument()
    })

    it('should display "1 participant" (singular) correctly', () => {
      const oneParticipantItem = {
        ...mockTimedItem,
        participants: [{ id: 'p1', user_id: 'user-1', display_name: 'Alice' }],
      }
      render(<ListView items={[oneParticipantItem]} currentUserId="user-123" />)

      expect(screen.getByText('1 participant')).toBeInTheDocument()
    })
  })

  describe('Enhanced Features (Duration Badge)', () => {
    it('should display duration badge for items with end_time', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      // Should show duration: 8:00 AM to 11:00 AM = 3h
      expect(screen.getByText('3h')).toBeInTheDocument()
    })

    it('should not display duration badge for all-day items', () => {
      render(<ListView items={[mockAllDayItem]} currentUserId="user-123" />)

      // Should not have duration badge
      expect(screen.queryByText(/\dh/)).not.toBeInTheDocument()
      expect(screen.queryByText(/days?/)).not.toBeInTheDocument()
    })

    it('should not display duration badge when end_time is null', () => {
      const itemNoEndTime = { ...mockTimedItem, end_time: null }
      render(<ListView items={[itemNoEndTime]} currentUserId="user-123" />)

      expect(screen.queryByText(/\dh/)).not.toBeInTheDocument()
    })

    it('should display hours and minutes in duration', () => {
      const item = {
        ...mockTimedItem,
        start_time: '2025-06-15T08:00:00Z',
        end_time: '2025-06-15T10:30:00Z',
      }
      render(<ListView items={[item]} currentUserId="user-123" />)

      expect(screen.getByText('2h 30m')).toBeInTheDocument()
    })

    it('should display multi-day duration', () => {
      const item = {
        ...mockTimedItem,
        start_time: '2025-06-15T08:00:00Z',
        end_time: '2025-06-18T08:00:00Z',
      }
      render(<ListView items={[item]} currentUserId="user-123" />)

      expect(screen.getByText('3 days')).toBeInTheDocument()
    })
  })

  describe('Enhanced Features (Tooltip with Metadata)', () => {
    it('should wrap item in tooltip when metadata is present', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      // Item should still render normally
      expect(screen.getByText('Flight to Paris')).toBeInTheDocument()
    })

    it('should work without tooltip when no metadata', () => {
      render(<ListView items={[mockItemNoExtras]} currentUserId="user-123" />)

      // Item should render normally even without metadata
      expect(screen.getByText('Dinner Reservation')).toBeInTheDocument()
      expect(screen.getByText(/\d+:\d+ [ap]m/i)).toBeInTheDocument()
    })
  })

  describe('Expandable Details', () => {
    it('should not show expand button when collapsed by default', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      // Should show ChevronDown button
      const buttons = screen.getAllByRole('button')
      const expandButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Expand details')
      expect(expandButton).toBeInTheDocument()
    })

    it('should expand details when expand button is clicked', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const buttons = screen.getAllByRole('button')
      const expandButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Expand details')

      await user.click(expandButton!)

      // Should show expanded content with metadata
      expect(screen.getByText('Transport Details')).toBeInTheDocument()
    })

    it('should collapse details when collapse button is clicked', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const buttons = screen.getAllByRole('button')
      const expandButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Expand details')

      // Expand
      await user.click(expandButton!)
      expect(screen.getByText('Transport Details')).toBeInTheDocument()

      // Collapse
      const collapseButton = screen
        .getAllByRole('button')
        .find(btn => btn.getAttribute('aria-label') === 'Collapse details')
      await user.click(collapseButton!)

      expect(screen.queryByText('Transport Details')).not.toBeInTheDocument()
    })

    it('should not show expand button when there is no additional content to show', () => {
      render(<ListView items={[mockItemNoExtras]} currentUserId="user-123" />)

      const buttons = screen.getAllByRole('button')
      const expandButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Expand details')
      expect(expandButton).not.toBeInTheDocument()
    })
  })

  describe('Expanded Content', () => {
    it('should display MetadataSection when expanded', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const buttons = screen.getAllByRole('button')
      const expandButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Expand details')
      await user.click(expandButton!)

      expect(screen.getByText('Transport Details')).toBeInTheDocument()
      expect(screen.getByText('JFK → CDG')).toBeInTheDocument()
      expect(screen.getByText('2E')).toBeInTheDocument()
      expect(screen.getByText('K12')).toBeInTheDocument()
      expect(screen.getByText('ABC123')).toBeInTheDocument()
    })

    it('should display full description when expanded', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const buttons = screen.getAllByRole('button')
      const expandButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Expand details')
      await user.click(expandButton!)

      // Should show full description without line-clamp
      const description = screen.getByText('Morning flight from JFK to CDG')
      expect(description).toBeInTheDocument()
      expect(description).not.toHaveClass('line-clamp-2')
    })

    it('should display notes when expanded', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const buttons = screen.getAllByRole('button')
      const expandButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Expand details')
      await user.click(expandButton!)

      expect(screen.getByText('Remember to check in online 24 hours before')).toBeInTheDocument()
    })

    it('should display clickable links when expanded', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const buttons = screen.getAllByRole('button')
      const expandButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Expand details')
      await user.click(expandButton!)

      const link1 = screen.getByText('https://airline.com/checkin')
      const link2 = screen.getByText('https://flightaware.com/track123')

      expect(link1).toBeInTheDocument()
      expect(link1.closest('a')).toHaveAttribute('href', 'https://airline.com/checkin')
      expect(link1.closest('a')).toHaveAttribute('target', '_blank')
      expect(link1.closest('a')).toHaveAttribute('rel', 'noopener noreferrer')

      expect(link2).toBeInTheDocument()
    })

    it('should not display notes section when notes is null', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockAllDayItem]} currentUserId="user-123" />)

      const buttons = screen.getAllByRole('button')
      const expandButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Expand details')

      if (expandButton) {
        await user.click(expandButton)
        expect(screen.queryByText(/Note:/)).not.toBeInTheDocument()
      }
    })

    it('should not display links section when links array is empty', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockAllDayItem]} currentUserId="user-123" />)

      const buttons = screen.getAllByRole('button')
      const expandButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Expand details')

      if (expandButton) {
        await user.click(expandButton)
        expect(screen.queryByText(/Links:/)).not.toBeInTheDocument()
      }
    })
  })

  describe('Permissions and Actions', () => {
    it('should show actions menu for items created by current user', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      // More actions button should be present (may be hidden until hover)
      const buttons = screen.getAllByRole('button')
      const moreButton = buttons.find(btn => {
        const svg = btn.querySelector('svg')
        return (
          svg?.classList.contains('lucide-more-horizontal') ||
          svg?.parentElement?.classList.contains('lucide-more-horizontal')
        )
      })
      expect(moreButton).toBeDefined()
    })

    it('should not show actions menu for items created by other users', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-456" />)

      // More actions button should not be present
      const buttons = screen.getAllByRole('button')
      const moreButton = buttons.find(btn => {
        const svg = btn.querySelector('svg')
        return (
          svg?.classList.contains('lucide-more-horizontal') ||
          svg?.parentElement?.classList.contains('lucide-more-horizontal')
        )
      })
      expect(moreButton).toBeUndefined()
    })

    it('should call onEdit when edit is clicked', async () => {
      const user = userEvent.setup()
      const mockOnEdit = jest.fn()
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" onEditItem={mockOnEdit} />)

      // Find and click the more actions button
      const buttons = screen.getAllByRole('button')
      const moreButton = buttons.find(btn => {
        const svg = btn.querySelector('svg')
        return (
          svg?.classList.contains('lucide-more-horizontal') ||
          svg?.parentElement?.classList.contains('lucide-more-horizontal')
        )
      })
      await user.click(moreButton!)

      // Click Edit option
      const editOption = screen.getByText('Edit')
      await user.click(editOption)

      expect(mockOnEdit).toHaveBeenCalledWith(mockTimedItem)
    })

    it('should call onDelete when delete is clicked', async () => {
      const user = userEvent.setup()
      const mockOnDelete = jest.fn()
      render(
        <ListView items={[mockTimedItem]} currentUserId="user-123" onDeleteItem={mockOnDelete} />
      )

      // Find and click the more actions button
      const buttons = screen.getAllByRole('button')
      const moreButton = buttons.find(btn => {
        const svg = btn.querySelector('svg')
        return (
          svg?.classList.contains('lucide-more-horizontal') ||
          svg?.parentElement?.classList.contains('lucide-more-horizontal')
        )
      })
      await user.click(moreButton!)

      // Click Delete option
      const deleteOption = screen.getByText('Delete')
      await user.click(deleteOption)

      expect(mockOnDelete).toHaveBeenCalledWith(mockTimedItem)
    })

    it('should call onItemClick when card is clicked', async () => {
      const user = userEvent.setup()
      const mockOnClick = jest.fn()
      render(
        <ListView items={[mockTimedItem]} currentUserId="user-123" onItemClick={mockOnClick} />
      )

      const card = screen.getByText('Flight to Paris').closest('.rounded-lg')
      await user.click(card!)

      expect(mockOnClick).toHaveBeenCalledWith(mockTimedItem)
    })

    it('should stop propagation when actions menu is clicked', async () => {
      const user = userEvent.setup()
      const mockOnClick = jest.fn()
      render(
        <ListView items={[mockTimedItem]} currentUserId="user-123" onItemClick={mockOnClick} />
      )

      // Click the more actions button
      const buttons = screen.getAllByRole('button')
      const moreButton = buttons.find(btn => {
        const svg = btn.querySelector('svg')
        return (
          svg?.classList.contains('lucide-more-horizontal') ||
          svg?.parentElement?.classList.contains('lucide-more-horizontal')
        )
      })
      await user.click(moreButton!)

      // onItemClick should NOT be called
      expect(mockOnClick).not.toHaveBeenCalled()
    })

    it('should stop propagation when expand button is clicked', async () => {
      const user = userEvent.setup()
      const mockOnClick = jest.fn()
      render(
        <ListView items={[mockTimedItem]} currentUserId="user-123" onItemClick={mockOnClick} />
      )

      // Click the expand button
      const buttons = screen.getAllByRole('button')
      const expandButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Expand details')
      await user.click(expandButton!)

      // onItemClick should NOT be called
      expect(mockOnClick).not.toHaveBeenCalled()
    })
  })

  describe('Styling and Layout', () => {
    it('should apply border and hover effects', () => {
      const { container } = render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const card = container.querySelector('.rounded-lg.border')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('hover:shadow-md')
    })

    it('should apply type-specific background color', () => {
      const { container } = render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const card = container.querySelector('.bg-blue-50')
      expect(card).toBeInTheDocument()
    })

    it('should truncate long titles', () => {
      const longTitleItem = {
        ...mockTimedItem,
        title:
          'This is a very long title that should be truncated because it exceeds the available space',
      }
      render(<ListView items={[longTitleItem]} currentUserId="user-123" />)

      const titleElement = screen.getByText(longTitleItem.title)
      expect(titleElement).toHaveClass('truncate')
    })

    it('should line-clamp description when collapsed', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const description = screen.getByText('Morning flight from JFK to CDG')
      expect(description).toHaveClass('line-clamp-2')
    })
  })

  describe('Edge Cases', () => {
    it('should handle item with no end time', () => {
      const itemNoEndTime = { ...mockTimedItem, end_time: null }
      render(<ListView items={[itemNoEndTime]} currentUserId="user-123" />)

      expect(screen.getByText('Flight to Paris')).toBeInTheDocument()
      expect(screen.getByText(/\d+:\d+ [ap]m/i)).toBeInTheDocument()
    })

    it('should handle item with no description', () => {
      render(<ListView items={[mockItemNoExtras]} currentUserId="user-123" />)

      expect(screen.getByText('Dinner Reservation')).toBeInTheDocument()
      expect(screen.queryByText(/flight|museum/i)).not.toBeInTheDocument()
    })

    it('should handle midnight times correctly', () => {
      const midnightItem = {
        ...mockTimedItem,
        start_time: '2025-06-15T00:00:00Z',
      }
      render(<ListView items={[midnightItem]} currentUserId="user-123" />)

      // Should display time in AM/PM format (exact time depends on timezone)
      expect(screen.getByText(/\d+:\d+ [ap]m/i)).toBeInTheDocument()
    })

    it('should handle noon times correctly', () => {
      const noonItem = {
        ...mockTimedItem,
        start_time: '2025-06-15T12:00:00Z',
      }
      render(<ListView items={[noonItem]} currentUserId="user-123" />)

      // Should display time in AM/PM format (exact time depends on timezone)
      expect(screen.getByText(/\d+:\d+ [ap]m/i)).toBeInTheDocument()
    })
  })

  describe('Integration', () => {
    it('should display all enhancements together', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      // Should have all collapsed content
      expect(screen.getByText('Flight to Paris')).toBeInTheDocument()
      expect(screen.getByText(/\d+:\d+ [ap]m/i)).toBeInTheDocument()
      expect(screen.getByText('3h')).toBeInTheDocument() // Duration badge
      expect(screen.getByText('Charles de Gaulle Airport')).toBeInTheDocument()
      expect(screen.getByText('Transport')).toBeInTheDocument()

      // Expand
      const buttons = screen.getAllByRole('button')
      const expandButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Expand details')
      await user.click(expandButton!)

      // Should have all expanded content
      expect(screen.getByText('Transport Details')).toBeInTheDocument()
      expect(screen.getByText('JFK → CDG')).toBeInTheDocument()
      expect(screen.getByText('Remember to check in online 24 hours before')).toBeInTheDocument()
      expect(screen.getByText('https://airline.com/checkin')).toBeInTheDocument()
    })

    it('should maintain responsive layout with all features', () => {
      const { container } = render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const card = container.querySelector('.rounded-lg.border')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('hover:shadow-md')

      const layout = container.querySelector('.flex.items-start.justify-between')
      expect(layout).toBeInTheDocument()
    })
  })
})
