import { render, screen, fireEvent } from '@testing-library/react'
import { DayDetailPopover } from '@/components/features/itinerary/DayDetailPopover'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'

const mockItems: ItineraryItemWithParticipants[] = [
  {
    id: '1',
    trip_id: 'trip1',
    type: 'transport',
    title: 'Flight to Paris',
    description: null,
    notes: null,
    links: [],
    start_time: '2026-01-15T10:00:00Z',
    end_time: '2026-01-15T12:30:00Z',
    is_all_day: false,
    location: 'CDG Airport',
    metadata: {},
    created_by: 'user1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    trip_id: 'trip1',
    type: 'activity',
    title: 'Louvre Museum Tour',
    description: null,
    notes: null,
    links: [],
    start_time: '2026-01-15T14:00:00Z',
    end_time: '2026-01-15T17:00:00Z',
    is_all_day: false,
    location: 'Louvre',
    metadata: {},
    created_by: 'user1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '3',
    trip_id: 'trip1',
    type: 'dining',
    title: 'Le Jules Verne',
    description: null,
    notes: null,
    links: [],
    start_time: '2026-01-15T19:30:00Z',
    end_time: '2026-01-15T22:00:00Z',
    is_all_day: false,
    location: 'Eiffel Tower',
    metadata: {},
    created_by: 'user1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

const defaultProps = {
  date: new Date('2026-01-15T00:00:00Z'),
  items: mockItems,
  onViewItem: jest.fn(),
  onNavigateToWeek: jest.fn(),
  onCreateItem: jest.fn(),
  onClose: jest.fn(),
  canEdit: true,
}

describe('DayDetailPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('displays the date in header', () => {
      render(<DayDetailPopover {...defaultProps} />)

      expect(screen.getByText(/Wednesday, January 15, 2026/i)).toBeInTheDocument()
    })

    it('displays all items for the selected day', () => {
      render(<DayDetailPopover {...defaultProps} />)

      expect(screen.getByText('Flight to Paris')).toBeInTheDocument()
      expect(screen.getByText('Louvre Museum Tour')).toBeInTheDocument()
      expect(screen.getByText('Le Jules Verne')).toBeInTheDocument()
    })

    it('shows item type badges with correct labels', () => {
      render(<DayDetailPopover {...defaultProps} />)

      expect(screen.getByText('Transport')).toBeInTheDocument()
      expect(screen.getByText('Activity')).toBeInTheDocument()
      expect(screen.getByText('Dining')).toBeInTheDocument()
    })

    it('shows time ranges formatted correctly for timed events', () => {
      render(<DayDetailPopover {...defaultProps} />)

      // Check for time ranges (format: "h:mm a - h:mm a")
      expect(screen.getByText(/10:00 AM - 12:30 PM/i)).toBeInTheDocument()
      expect(screen.getByText(/2:00 PM - 5:00 PM/i)).toBeInTheDocument()
      expect(screen.getByText(/7:30 PM - 10:00 PM/i)).toBeInTheDocument()
    })

    it('shows "All day" for all-day events', () => {
      const allDayItem: ItineraryItemWithParticipants = {
        ...mockItems[0],
        is_all_day: true,
      }

      render(<DayDetailPopover {...defaultProps} items={[allDayItem]} />)

      expect(screen.getByText('All day')).toBeInTheDocument()
    })

    it('displays location when available', () => {
      render(<DayDetailPopover {...defaultProps} />)

      expect(screen.getByText('CDG Airport')).toBeInTheDocument()
      expect(screen.getByText('Louvre')).toBeInTheDocument()
      expect(screen.getByText('Eiffel Tower')).toBeInTheDocument()
    })

    it('shows "View Details" button for each item', () => {
      render(<DayDetailPopover {...defaultProps} />)

      const viewDetailsButtons = screen.getAllByText('View Details')
      expect(viewDetailsButtons).toHaveLength(3)
    })
  })

  describe('Sorting', () => {
    it('sorts items by start time', () => {
      const unsortedItems: ItineraryItemWithParticipants[] = [
        { ...mockItems[2], start_time: '2026-01-15T19:30:00Z' }, // 7:30 PM
        { ...mockItems[0], start_time: '2026-01-15T10:00:00Z' }, // 10:00 AM
        { ...mockItems[1], start_time: '2026-01-15T14:00:00Z' }, // 2:00 PM
      ]

      render(<DayDetailPopover {...defaultProps} items={unsortedItems} />)

      const items = screen.getAllByText(/AM|PM/)
      expect(items[0].textContent).toContain('10:00 AM')
      expect(items[1].textContent).toContain('2:00 PM')
      expect(items[2].textContent).toContain('7:30 PM')
    })
  })

  describe('Interactions', () => {
    it('"View Details" button triggers onViewItem with correct item', () => {
      const onViewItem = jest.fn()
      render(<DayDetailPopover {...defaultProps} onViewItem={onViewItem} />)

      const viewDetailsButtons = screen.getAllByText('View Details')
      fireEvent.click(viewDetailsButtons[0])

      expect(onViewItem).toHaveBeenCalledWith(mockItems[0])
    })

    it('"View Details" button closes the popover', () => {
      const onClose = jest.fn()
      render(<DayDetailPopover {...defaultProps} onClose={onClose} />)

      const viewDetailsButtons = screen.getAllByText('View Details')
      fireEvent.click(viewDetailsButtons[0])

      expect(onClose).toHaveBeenCalled()
    })

    it('"View Week" button triggers onNavigateToWeek', () => {
      const onNavigateToWeek = jest.fn()
      render(<DayDetailPopover {...defaultProps} onNavigateToWeek={onNavigateToWeek} />)

      const viewWeekButton = screen.getByText('View Week')
      fireEvent.click(viewWeekButton)

      expect(onNavigateToWeek).toHaveBeenCalledWith(defaultProps.date)
    })

    it('"View Week" button closes the popover', () => {
      const onClose = jest.fn()
      render(<DayDetailPopover {...defaultProps} onClose={onClose} />)

      const viewWeekButton = screen.getByText('View Week')
      fireEvent.click(viewWeekButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('"Add Item" button triggers onCreateItem when canEdit is true', () => {
      const onCreateItem = jest.fn()
      render(<DayDetailPopover {...defaultProps} onCreateItem={onCreateItem} canEdit={true} />)

      const addItemButton = screen.getByText('Add Item')
      fireEvent.click(addItemButton)

      expect(onCreateItem).toHaveBeenCalledWith(defaultProps.date)
    })

    it('"Add Item" button closes the popover', () => {
      const onClose = jest.fn()
      render(<DayDetailPopover {...defaultProps} onClose={onClose} />)

      const addItemButton = screen.getByText('Add Item')
      fireEvent.click(addItemButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('hides "Add Item" button when canEdit is false', () => {
      render(<DayDetailPopover {...defaultProps} canEdit={false} />)

      expect(screen.queryByText('Add Item')).not.toBeInTheDocument()
    })

    it('close button triggers onClose', () => {
      const onClose = jest.fn()
      render(<DayDetailPopover {...defaultProps} onClose={onClose} />)

      // Find the X close button in the header
      const closeButtons = screen.getAllByRole('button')
      const xButton = closeButtons.find(btn => btn.querySelector('svg'))

      if (xButton) {
        fireEvent.click(xButton)
        expect(onClose).toHaveBeenCalled()
      }
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no items for the day', () => {
      render(<DayDetailPopover {...defaultProps} items={[]} />)

      expect(screen.getByText('No items scheduled for this day')).toBeInTheDocument()
    })

    it('shows "View Week" and "Add Item" buttons even with no items', () => {
      render(<DayDetailPopover {...defaultProps} items={[]} canEdit={true} />)

      expect(screen.getByText('View Week')).toBeInTheDocument()
      expect(screen.getByText('Add Item')).toBeInTheDocument()
    })
  })

  describe('Type Badges', () => {
    it('applies correct color classes to type badges', () => {
      render(<DayDetailPopover {...defaultProps} />)

      const badges = screen.getAllByText(/Transport|Activity|Dining/)

      // Badges should have border and background color classes
      badges.forEach(badge => {
        expect(badge.className).toMatch(/bg-|border-/)
      })
    })

    it('displays all supported item types correctly', () => {
      const allTypes: ItineraryItemWithParticipants[] = [
        {
          ...mockItems[0],
          id: '1',
          type: 'transport',
          title: 'Flight',
          start_time: '2026-01-15T08:00:00Z',
          end_time: '2026-01-15T09:00:00Z',
        },
        {
          ...mockItems[0],
          id: '2',
          type: 'accommodation',
          title: 'Hotel',
          start_time: '2026-01-15T10:00:00Z',
          end_time: '2026-01-15T11:00:00Z',
        },
        {
          ...mockItems[0],
          id: '3',
          type: 'dining',
          title: 'Lunch',
          start_time: '2026-01-15T12:00:00Z',
          end_time: '2026-01-15T13:00:00Z',
        },
        {
          ...mockItems[0],
          id: '4',
          type: 'activity',
          title: 'Tour',
          start_time: '2026-01-15T14:00:00Z',
          end_time: '2026-01-15T15:00:00Z',
        },
        {
          ...mockItems[0],
          id: '5',
          type: 'sightseeing',
          title: 'Museum',
          start_time: '2026-01-15T16:00:00Z',
          end_time: '2026-01-15T17:00:00Z',
        },
        {
          ...mockItems[0],
          id: '6',
          type: 'general',
          title: 'Note',
          start_time: '2026-01-15T18:00:00Z',
          end_time: '2026-01-15T19:00:00Z',
        },
      ]

      render(<DayDetailPopover {...defaultProps} items={allTypes} />)

      expect(screen.getByText('Transport')).toBeInTheDocument()
      expect(screen.getByText('Accommodation')).toBeInTheDocument()
      expect(screen.getByText('Dining')).toBeInTheDocument()
      expect(screen.getByText('Activity')).toBeInTheDocument()
      expect(screen.getByText('Sightseeing')).toBeInTheDocument()
      expect(screen.getByText('General')).toBeInTheDocument()
    })
  })

  describe('Scrolling', () => {
    it('applies scrollable container for many items', () => {
      const manyItems: ItineraryItemWithParticipants[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockItems[0],
        id: `item-${i}`,
        title: `Item ${i + 1}`,
        start_time: `2026-01-15T${String(i + 8).padStart(2, '0')}:00:00Z`,
        end_time: `2026-01-15T${String(i + 9).padStart(2, '0')}:00:00Z`,
      }))

      render(<DayDetailPopover {...defaultProps} items={manyItems} />)

      // Container should have max-height and overflow-y-auto
      const container = screen.getAllByText(/Item \d+/)[0].closest('.space-y-3')
      expect(container?.className).toContain('max-h-[400px]')
      expect(container?.className).toContain('overflow-y-auto')
    })
  })
})
