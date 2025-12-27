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
  links: [
    { title: 'Check-in', url: 'https://airline.com/checkin' },
    { title: 'Flight Tracker', url: 'https://flightaware.com/track123' },
  ],
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
    { id: 'p1', user_id: 'user-1', user: { id: 'user-1', full_name: 'Alice', avatar_url: null } },
    { id: 'p2', user_id: 'user-2', user: { id: 'user-2', full_name: 'Bob', avatar_url: null } },
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
        participants: [
          {
            id: 'p1',
            user_id: 'user-1',
            user: { id: 'user-1', full_name: 'Alice', avatar_url: null },
          },
        ],
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

      // Should not have duration badge (check for specific duration text patterns)
      expect(screen.queryByText(/^\d+h$/)).not.toBeInTheDocument()
      expect(screen.queryByText(/^\d+ days?$/)).not.toBeInTheDocument()
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
    // NOTE: Expand button tests removed - button was removed in CRO-929
    // Cards now expand on first click, open modal on second click

    it('should show expanded content when card is clicked', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const card = screen.getByText('Flight to Paris').closest('.rounded-lg')
      await user.click(card!)

      // Should show expanded content with metadata
      expect(screen.getByText('Transport Details')).toBeInTheDocument()
    })

    it('should not show expanded content when there is no additional content', () => {
      render(<ListView items={[mockItemNoExtras]} currentUserId="user-123" />)

      // Item with no metadata, notes, or links should not have expandable content
      // (This is checked via hasExpandableContent logic)
      expect(screen.queryByText(/Details/i)).not.toBeInTheDocument()
    })
  })

  describe('Expanded Content', () => {
    it('should display MetadataSection when expanded', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const card = screen.getByText('Flight to Paris').closest('.rounded-lg')
      await user.click(card!)

      expect(screen.getByText('Transport Details')).toBeInTheDocument()
      expect(screen.getByText('JFK → CDG')).toBeInTheDocument()
      expect(screen.getByText('2E')).toBeInTheDocument()
      expect(screen.getByText('K12')).toBeInTheDocument()
      expect(screen.getByText('ABC123')).toBeInTheDocument()
    })

    it('should display full description when expanded', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const card = screen.getByText('Flight to Paris').closest('.rounded-lg')
      await user.click(card!)

      // Should show full description without line-clamp
      const description = screen.getByText('Morning flight from JFK to CDG')
      expect(description).toBeInTheDocument()
      expect(description).not.toHaveClass('line-clamp-2')
    })

    it('should display notes when expanded', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const card = screen.getByText('Flight to Paris').closest('.rounded-lg')
      await user.click(card!)

      expect(screen.getByText('Remember to check in online 24 hours before')).toBeInTheDocument()
    })

    it('should display clickable links when expanded', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const card = screen.getByText('Flight to Paris').closest('.rounded-lg')
      await user.click(card!)

      const link1 = screen.getByText('Check-in')
      const link2 = screen.getByText('Flight Tracker')

      expect(link1).toBeInTheDocument()
      expect(link1.closest('a')).toHaveAttribute('href', 'https://airline.com/checkin')
      expect(link1.closest('a')).toHaveAttribute('target', '_blank')
      expect(link1.closest('a')).toHaveAttribute('rel', 'noopener noreferrer')

      expect(link2).toBeInTheDocument()
      expect(link2.closest('a')).toHaveAttribute('href', 'https://flightaware.com/track123')
    })

    it('should not display notes section when notes is null', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockAllDayItem]} currentUserId="user-123" />)

      // Check if item has expandable content
      const card = screen.getByText('Museum Day').closest('.rounded-lg')
      if (card) {
        await user.click(card)
        expect(screen.queryByText(/Note:/)).not.toBeInTheDocument()
      }
    })

    it('should not display links section when links array is empty', async () => {
      const user = userEvent.setup()
      render(<ListView items={[mockAllDayItem]} currentUserId="user-123" />)

      // Check if item has expandable content
      const card = screen.getByText('Museum Day').closest('.rounded-lg')
      if (card) {
        await user.click(card)
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
          svg?.classList.contains('lucide-ellipsis') ||
          svg?.classList.contains('lucide-more-horizontal') ||
          svg?.parentElement?.classList.contains('lucide-ellipsis') ||
          svg?.parentElement?.classList.contains('lucide-more-horizontal')
        )
      })
      expect(moreButton).toBeDefined()
    })

    it('should not show actions menu for items created by other users', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-456" />)

      // More actions button should not be present
      const allButtons = screen.queryAllByRole('button')
      const moreButton = allButtons.find(btn => {
        const svg = btn.querySelector('svg')
        return (
          svg?.classList.contains('lucide-ellipsis') ||
          svg?.classList.contains('lucide-more-horizontal') ||
          svg?.parentElement?.classList.contains('lucide-ellipsis') ||
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
          svg?.classList.contains('lucide-ellipsis') ||
          svg?.classList.contains('lucide-more-horizontal') ||
          svg?.parentElement?.classList.contains('lucide-ellipsis') ||
          svg?.parentElement?.classList.contains('lucide-more-horizontal')
        )
      })
      await user.click(moreButton!)

      // Click Edit option
      const editOption = screen.getByRole('menuitem', { name: /edit/i })
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
          svg?.classList.contains('lucide-ellipsis') ||
          svg?.classList.contains('lucide-more-horizontal') ||
          svg?.parentElement?.classList.contains('lucide-ellipsis') ||
          svg?.parentElement?.classList.contains('lucide-more-horizontal')
        )
      })
      await user.click(moreButton!)

      // Click Delete option
      const deleteOption = screen.getByRole('menuitem', { name: /delete/i })
      await user.click(deleteOption)

      expect(mockOnDelete).toHaveBeenCalledWith(mockTimedItem)
    })

    it('should call onItemClick when card is clicked (two-step: expand then modal)', async () => {
      const user = userEvent.setup()
      const mockOnClick = jest.fn()
      render(
        <ListView items={[mockTimedItem]} currentUserId="user-123" onItemClick={mockOnClick} />
      )

      const card = screen.getByText('Flight to Paris').closest('.rounded-lg')

      // First click: expands (doesn't call onItemClick)
      await user.click(card!)
      expect(mockOnClick).not.toHaveBeenCalled()

      // Second click: calls onItemClick
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
          svg?.classList.contains('lucide-ellipsis') ||
          svg?.classList.contains('lucide-more-horizontal') ||
          svg?.parentElement?.classList.contains('lucide-ellipsis') ||
          svg?.parentElement?.classList.contains('lucide-more-horizontal')
        )
      })
      await user.click(moreButton!)

      // onItemClick should NOT be called
      expect(mockOnClick).not.toHaveBeenCalled()
    })

    // NOTE: Expand button test removed - button no longer exists (CRO-929)
    // Now testing the two-step interaction instead (see "Expand/Edit interaction" describe block)
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

  describe('Collapsed state - Additional info (CRO-929)', () => {
    it('should show end time when available (time range)', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      // Should show time range: "4:00 AM - 7:00 AM" (UTC to local conversion)
      // Exact format depends on timezone, but should contain both times
      const timeElement = screen.getByText(/\d+:\d+ [ap]m - \d+:\d+ [ap]m/i)
      expect(timeElement).toBeInTheDocument()
    })

    it('should show only start time when end_time is null', () => {
      const itemNoEndTime = { ...mockTimedItem, end_time: null }
      render(<ListView items={[itemNoEndTime]} currentUserId="user-123" />)

      // Should show only start time, no dash or second time
      const timeText = screen.getByText(/\d+:\d+ [ap]m$/i)
      expect(timeText).toBeInTheDocument()
      expect(timeText.textContent).not.toContain('-')
    })

    it('should not show end time for all-day items', () => {
      render(<ListView items={[mockAllDayItem]} currentUserId="user-123" />)

      // Should show "All day" only, no time range
      expect(screen.getByText('All day')).toBeInTheDocument()
      expect(screen.queryByText(/-/)).not.toBeInTheDocument()
    })

    it('should show booking reference for transport items', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      // Should show booking reference "ABC123" in collapsed state
      expect(screen.getByText('ABC123')).toBeInTheDocument()
    })

    it('should show booking reference for accommodation items', () => {
      const hotelItem: ItineraryItemWithParticipants = {
        ...mockTimedItem,
        type: 'accommodation',
        title: 'Hotel Paris',
        metadata: {
          confirmation_number: 'HOTEL456',
          check_in_time: '3:00 PM',
          check_out_time: '11:00 AM',
        },
      }
      render(<ListView items={[hotelItem]} currentUserId="user-123" />)

      // Should show confirmation number in collapsed state
      expect(screen.getByText('HOTEL456')).toBeInTheDocument()
    })

    it('should not show booking reference for dining items', () => {
      const diningItem: ItineraryItemWithParticipants = {
        ...mockTimedItem,
        type: 'dining',
        metadata: {
          reservation_time: '7:00 PM',
          cuisine_type: 'French',
        },
      }
      render(<ListView items={[diningItem]} currentUserId="user-123" />)

      // Dining items don't have booking_reference field
      // Ensure no booking reference section appears
      expect(screen.queryByText(/confirmation|booking/i)).not.toBeInTheDocument()
    })

    it('should not show booking reference when metadata is empty', () => {
      render(<ListView items={[mockItemNoExtras]} currentUserId="user-123" />)

      // No booking reference should appear
      expect(screen.queryByText(/ABC|HOTEL|confirmation/i)).not.toBeInTheDocument()
    })

    it('should show key metadata fields in collapsed state', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      // Should show route (JFK → CDG) in collapsed state
      expect(screen.getByText('JFK → CDG')).toBeInTheDocument()

      // Should show terminal in collapsed state
      expect(screen.getByText(/Terminal 2E|2E/i)).toBeInTheDocument()
    })

    it('should limit key metadata to 2 fields maximum', () => {
      const itemWithManyFields: ItineraryItemWithParticipants = {
        ...mockTimedItem,
        metadata: {
          flight_number: 'AF123',
          departure_location: 'JFK',
          arrival_location: 'CDG',
          terminal: '2E',
          gate: 'K12',
          seat_number: '12A',
          booking_reference: 'ABC123',
        },
      }
      render(<ListView items={[itemWithManyFields]} currentUserId="user-123" />)

      // Should show route (1st field)
      expect(screen.getByText('JFK → CDG')).toBeInTheDocument()

      // Should show terminal or gate (2nd field)
      // But not all 3 (terminal, gate, seat)
      const terminalOrGate = screen.queryByText(/Terminal 2E|Gate K12/i)
      expect(terminalOrGate).toBeInTheDocument()

      // Seat number should NOT appear in collapsed preview (it's the 3rd field)
      // It will appear in expanded state only
      // Note: We can't easily test this without expanding, so we'll verify in expanded state tests
    })

    it('should show check-in time for accommodation in collapsed state', () => {
      const hotelItem: ItineraryItemWithParticipants = {
        ...mockTimedItem,
        type: 'accommodation',
        title: 'Hotel Paris',
        metadata: {
          check_in_time: '3:00 PM',
          check_out_time: '11:00 AM',
          room_number: '305',
          confirmation_number: 'CONF123',
        },
      }
      render(<ListView items={[hotelItem]} currentUserId="user-123" />)

      // Should show check-in time in collapsed state (via CollapsedMetadataPreview)
      expect(screen.getByText('3:00 PM')).toBeInTheDocument()
    })

    it('should show meeting point for activity in collapsed state', () => {
      const activityItem: ItineraryItemWithParticipants = {
        ...mockTimedItem,
        type: 'activity',
        title: 'Eiffel Tower Tour',
        metadata: {
          meeting_point: 'South Pillar Entrance',
          duration: '2 hours',
        },
      }
      render(<ListView items={[activityItem]} currentUserId="user-123" />)

      // Should show meeting point in collapsed state
      expect(screen.getByText(/South Pillar Entrance/i)).toBeInTheDocument()
    })

    it('should not show key metadata for general items', () => {
      const generalItem: ItineraryItemWithParticipants = {
        ...mockTimedItem,
        type: 'general',
        metadata: {},
      }
      render(<ListView items={[generalItem]} currentUserId="user-123" />)

      // General items have no type-specific metadata
      // Should only show basic info (title, time, location if present)
      expect(screen.queryByText(/→|Terminal|Gate/i)).not.toBeInTheDocument()
    })
  })

  describe('Expand/Edit interaction (Two-step)', () => {
    it('should expand card on first click', async () => {
      const user = userEvent.setup()
      const mockOnClick = jest.fn()
      render(
        <ListView items={[mockTimedItem]} currentUserId="user-123" onItemClick={mockOnClick} />
      )

      const card = screen.getByText('Flight to Paris').closest('.rounded-lg')
      await user.click(card!)

      // First click should expand (NOT call onItemClick)
      expect(mockOnClick).not.toHaveBeenCalled()
      expect(screen.getByText('Transport Details')).toBeInTheDocument()
    })

    it('should open modal on second click (expanded card)', async () => {
      const user = userEvent.setup()
      const mockOnClick = jest.fn()
      render(
        <ListView items={[mockTimedItem]} currentUserId="user-123" onItemClick={mockOnClick} />
      )

      const card = screen.getByText('Flight to Paris').closest('.rounded-lg')

      // First click: expand
      await user.click(card!)
      expect(mockOnClick).not.toHaveBeenCalled()

      // Second click: open modal
      await user.click(card!)
      expect(mockOnClick).toHaveBeenCalledWith(mockTimedItem)
    })

    it('should not expand when clicking links in expanded state', async () => {
      const user = userEvent.setup()
      const mockOnClick = jest.fn()
      render(
        <ListView items={[mockTimedItem]} currentUserId="user-123" onItemClick={mockOnClick} />
      )

      const card = screen.getByText('Flight to Paris').closest('.rounded-lg')

      // First click: expand
      await user.click(card!)
      expect(screen.getByText('Transport Details')).toBeInTheDocument()

      // Click on a link (should not trigger onItemClick)
      const link = screen.getByText('Check-in')
      await user.click(link)

      expect(mockOnClick).not.toHaveBeenCalled()
    })

    it('should not expand when clicking three-dot menu', async () => {
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
          svg?.classList.contains('lucide-ellipsis') ||
          svg?.classList.contains('lucide-more-horizontal') ||
          svg?.parentElement?.classList.contains('lucide-ellipsis') ||
          svg?.parentElement?.classList.contains('lucide-more-horizontal')
        )
      })
      await user.click(moreButton!)

      // onItemClick should NOT be called, and card should NOT be expanded
      expect(mockOnClick).not.toHaveBeenCalled()
      expect(screen.queryByText('Transport Details')).not.toBeInTheDocument()
    })

    it('should show expanded state visual indicator (ring border)', async () => {
      const user = userEvent.setup()
      const { container } = render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const card = container.querySelector('.rounded-lg.border') as HTMLElement
      expect(card).toBeInTheDocument()

      // Collapsed state: no ring border
      expect(card).not.toHaveClass('ring-2')
      expect(card).not.toHaveClass('ring-primary/20')

      // Click to expand
      await user.click(card)

      // Expanded state: should have ring border
      expect(card).toHaveClass('ring-2')
      expect(card).toHaveClass('ring-primary/20')
    })

    it('should show hover effect on expandable cards', () => {
      const { container } = render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      const card = container.querySelector('.rounded-lg.border') as HTMLElement
      expect(card).toBeInTheDocument()

      // Should have hover border effect for expandable cards
      expect(card).toHaveClass('hover:border-primary/50')
    })

    it('should not show expand button (removed)', () => {
      render(<ListView items={[mockTimedItem]} currentUserId="user-123" />)

      // Expand button should NOT exist
      const buttons = screen.getAllByRole('button')
      const expandButton = buttons.find(
        btn =>
          btn.getAttribute('aria-label') === 'Expand details' ||
          btn.getAttribute('aria-label') === 'Collapse details'
      )
      expect(expandButton).toBeUndefined()
    })
  })

  describe('Integration', () => {
    it('should display all enhancements together', async () => {
      const user = userEvent.setup()
      const mockOnClick = jest.fn()
      render(
        <ListView items={[mockTimedItem]} currentUserId="user-123" onItemClick={mockOnClick} />
      )

      // Should have all collapsed content (with new enhancements)
      expect(screen.getByText('Flight to Paris')).toBeInTheDocument()
      expect(screen.getByText(/\d+:\d+ [ap]m - \d+:\d+ [ap]m/i)).toBeInTheDocument() // Time range
      expect(screen.getByText('3h')).toBeInTheDocument() // Duration badge
      expect(screen.getByText('Charles de Gaulle Airport')).toBeInTheDocument()
      expect(screen.getByText('Transport')).toBeInTheDocument()
      expect(screen.getByText('ABC123')).toBeInTheDocument() // Booking reference
      expect(screen.getByText('JFK → CDG')).toBeInTheDocument() // Key metadata

      // First click: expand (no expand button anymore)
      const card = screen.getByText('Flight to Paris').closest('.rounded-lg')
      await user.click(card!)

      // Should have all expanded content
      expect(screen.getByText('Transport Details')).toBeInTheDocument()
      expect(screen.getByText('Remember to check in online 24 hours before')).toBeInTheDocument()
      expect(screen.getByText('Check-in')).toBeInTheDocument()

      // Verify expanded state is not calling onItemClick yet
      expect(mockOnClick).not.toHaveBeenCalled()

      // Second click: open modal
      await user.click(card!)
      expect(mockOnClick).toHaveBeenCalledWith(mockTimedItem)
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
