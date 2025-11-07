/**
 * Component Tests: ListView
 *
 * Tests the list view component for displaying itinerary items.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ListView } from '@/components/features/itinerary/ListView'
import type { ItineraryItemWithParticipants } from '@/../../packages/shared/types/itinerary'

const mockItems: ItineraryItemWithParticipants[] = [
  {
    id: 'item-1',
    trip_id: 'trip-123',
    type: 'transport',
    title: 'Flight to Lisbon',
    description: 'Morning flight',
    notes: 'Bring passport',
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
  },
  {
    id: 'item-2',
    trip_id: 'trip-123',
    type: 'accommodation',
    title: 'Hotel Check-in',
    description: 'Downtown hotel',
    notes: null,
    links: [],
    start_time: '2025-06-15T14:00:00Z',
    end_time: null,
    is_all_day: false,
    location: 'Hotel Lisboa',
    metadata: {},
    created_by: 'user-456',
    created_at: '2025-06-01T10:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
    participants: [
      { user_id: 'user-123', user: { full_name: 'Alice Smith' } },
      { user_id: 'user-456', user: { full_name: 'Bob Jones' } },
    ],
  },
  {
    id: 'item-3',
    trip_id: 'trip-123',
    type: 'activity',
    title: 'City Tour',
    description: null,
    notes: null,
    links: [],
    start_time: '2025-06-16T10:00:00Z',
    end_time: '2025-06-16T13:00:00Z',
    is_all_day: false,
    location: 'Alfama District',
    metadata: {},
    created_by: 'user-123',
    created_at: '2025-06-01T10:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
    participants: [],
  },
  {
    id: 'item-4',
    trip_id: 'trip-123',
    type: 'dining',
    title: 'Beach Day',
    description: 'Relax at the beach',
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
  },
]

describe('ListView', () => {
  const mockOnItemClick = vi.fn()
  const mockOnEditItem = vi.fn()
  const mockOnDeleteItem = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty State', () => {
    it('should display empty state when no items', () => {
      render(
        <ListView
          items={[]}
          currentUserId="user-123"
          onItemClick={mockOnItemClick}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
        />
      )

      expect(screen.getByText('No itinerary items yet')).toBeInTheDocument()
      expect(
        screen.getByText('Start building your trip itinerary by adding your first item.')
      ).toBeInTheDocument()
    })
  })

  describe('Items Display', () => {
    it('should group items by date', () => {
      render(
        <ListView
          items={mockItems}
          currentUserId="user-123"
          onItemClick={mockOnItemClick}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
        />
      )

      // Two date headers (June 15 and June 16)
      expect(screen.getByText(/June 15, 2025/i)).toBeInTheDocument()
      expect(screen.getByText(/June 16, 2025/i)).toBeInTheDocument()
    })

    it('should display all item details', () => {
      render(
        <ListView
          items={mockItems}
          currentUserId="user-123"
          onItemClick={mockOnItemClick}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
        />
      )

      // Titles
      expect(screen.getByText('Flight to Lisbon')).toBeInTheDocument()
      expect(screen.getByText('Hotel Check-in')).toBeInTheDocument()
      expect(screen.getByText('City Tour')).toBeInTheDocument()

      // Descriptions
      expect(screen.getByText('Morning flight')).toBeInTheDocument()
      expect(screen.getByText('Downtown hotel')).toBeInTheDocument()

      // Locations
      expect(screen.getByText('Lisbon Airport')).toBeInTheDocument()
      expect(screen.getByText('Hotel Lisboa')).toBeInTheDocument()
      expect(screen.getByText('Alfama District')).toBeInTheDocument()
    })

    it('should display time for timed events', () => {
      render(
        <ListView
          items={mockItems}
          currentUserId="user-123"
          onItemClick={mockOnItemClick}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
        />
      )

      // Flight at 8:00 AM
      expect(screen.getByText(/8:00 am/i)).toBeInTheDocument()
      // Hotel check-in at 2:00 PM
      expect(screen.getByText(/2:00 pm/i)).toBeInTheDocument()
    })

    it('should display "All day" for all-day events', () => {
      render(
        <ListView
          items={mockItems}
          currentUserId="user-123"
          onItemClick={mockOnItemClick}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
        />
      )

      // Beach Day is all-day
      const beachDayItem = screen.getByText('Beach Day').closest('div')
      expect(within(beachDayItem!).queryByText(/\d+:\d+ [ap]m/i)).not.toBeInTheDocument()
    })

    it('should display type badges', () => {
      render(
        <ListView
          items={mockItems}
          currentUserId="user-123"
          onItemClick={mockOnItemClick}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
        />
      )

      expect(screen.getByText('Transport')).toBeInTheDocument()
      expect(screen.getByText('Accommodation')).toBeInTheDocument()
      expect(screen.getByText('Activity')).toBeInTheDocument()
    })

    it('should display participant count when participants exist', () => {
      render(
        <ListView
          items={mockItems}
          currentUserId="user-123"
          onItemClick={mockOnItemClick}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
        />
      )

      // Hotel Check-in has 2 participants
      const hotelItem = screen.getByText('Hotel Check-in').closest('div')
      expect(within(hotelItem!).getByText('2 participants')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call onItemClick when item is clicked', async () => {
      const user = userEvent.setup()

      render(
        <ListView
          items={mockItems}
          currentUserId="user-123"
          onItemClick={mockOnItemClick}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
        />
      )

      const flightItem = screen.getByText('Flight to Lisbon').closest('div')
      await user.click(flightItem!)

      expect(mockOnItemClick).toHaveBeenCalledWith(mockItems[0])
    })

    it('should show actions menu for items created by current user', async () => {
      const user = userEvent.setup()

      render(
        <ListView
          items={mockItems}
          currentUserId="user-123"
          onItemClick={mockOnItemClick}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
        />
      )

      // Flight was created by user-123, should have menu
      const flightItem = screen.getByText('Flight to Lisbon').closest('div')

      // Hover to reveal menu button
      await user.hover(flightItem!)

      // Menu button should appear (it's hidden by default with opacity-0)
      const menuButton = within(flightItem!).getByRole('button')
      expect(menuButton).toBeInTheDocument()
    })

    it('should not show actions menu for items created by other users', () => {
      render(
        <ListView
          items={mockItems}
          currentUserId="user-123"
          onItemClick={mockOnItemClick}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
        />
      )

      // Hotel Check-in was created by user-456, should not have menu
      const hotelItem = screen.getByText('Hotel Check-in').closest('div')
      const menuButton = within(hotelItem!).queryByRole('button')
      expect(menuButton).not.toBeInTheDocument()
    })

    it('should call onEditItem when Edit is clicked', async () => {
      const user = userEvent.setup()

      render(
        <ListView
          items={mockItems}
          currentUserId="user-123"
          onItemClick={mockOnItemClick}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
        />
      )

      const flightItem = screen.getByText('Flight to Lisbon').closest('div')

      // Open menu
      const menuButton = within(flightItem!).getByRole('button')
      await user.click(menuButton)

      // Click Edit
      const editButton = screen.getByText('Edit')
      await user.click(editButton)

      expect(mockOnEditItem).toHaveBeenCalledWith(mockItems[0])
      expect(mockOnItemClick).not.toHaveBeenCalled() // Should not trigger item click
    })

    it('should call onDeleteItem when Delete is clicked', async () => {
      const user = userEvent.setup()

      render(
        <ListView
          items={mockItems}
          currentUserId="user-123"
          onItemClick={mockOnItemClick}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
        />
      )

      const flightItem = screen.getByText('Flight to Lisbon').closest('div')

      // Open menu
      const menuButton = within(flightItem!).getByRole('button')
      await user.click(menuButton)

      // Click Delete
      const deleteButton = screen.getByText('Delete')
      await user.click(deleteButton)

      expect(mockOnDeleteItem).toHaveBeenCalledWith(mockItems[0])
      expect(mockOnItemClick).not.toHaveBeenCalled()
    })
  })

  describe('Sorting', () => {
    it('should display items in chronological order within each day', () => {
      render(
        <ListView
          items={mockItems}
          currentUserId="user-123"
          onItemClick={mockOnItemClick}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
        />
      )

      // Get all items for June 15
      const june15Section = screen.getByText(/June 15, 2025/i).parentElement
      const june15Items = within(june15Section!).getAllByRole('button')

      // Flight (8am) should come before Hotel (2pm)
      const flightIndex = june15Items.findIndex(item =>
        item.textContent?.includes('Flight to Lisbon')
      )
      const hotelIndex = june15Items.findIndex(item => item.textContent?.includes('Hotel Check-in'))

      expect(flightIndex).toBeLessThan(hotelIndex)
    })
  })

  describe('Styling', () => {
    it('should apply type-specific colors', () => {
      render(
        <ListView
          items={mockItems}
          currentUserId="user-123"
          onItemClick={mockOnItemClick}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
        />
      )

      // Each item should have type-specific background color
      const flightItem = screen.getByText('Flight to Lisbon').closest('div')
      expect(flightItem).toHaveClass('bg-blue-50') // Transport color

      const hotelItem = screen.getByText('Hotel Check-in').closest('div')
      expect(hotelItem).toHaveClass('bg-purple-50') // Accommodation color
    })

    it('should apply hover effects', () => {
      render(
        <ListView
          items={mockItems}
          currentUserId="user-123"
          onItemClick={mockOnItemClick}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
        />
      )

      const flightItem = screen.getByText('Flight to Lisbon').closest('div')

      // Should have hover shadow class
      expect(flightItem).toHaveClass('hover:shadow-md')
    })
  })
})
