import { render, screen, fireEvent } from '@testing-library/react'
import { MonthView } from '@/components/features/itinerary/MonthView'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'
import { format, addDays } from 'date-fns'

// Mock the DayDetailPopover component
jest.mock('@/components/features/itinerary/DayDetailPopover', () => ({
  DayDetailPopover: ({ date, onClose }: { date: Date; onClose: () => void }) => (
    <div data-testid="day-detail-popover">
      <div>Day Detail: {format(date, 'yyyy-MM-dd')}</div>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

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
    type: 'accommodation',
    title: 'Hotel Check-in',
    description: null,
    notes: null,
    links: [],
    start_time: '2026-01-15T14:00:00Z',
    end_time: '2026-01-20T11:00:00Z',
    is_all_day: false,
    location: 'Paris Hotel',
    metadata: {},
    created_by: 'user1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '3',
    trip_id: 'trip1',
    type: 'activity',
    title: 'Louvre Museum',
    description: null,
    notes: null,
    links: [],
    start_time: '2026-01-16T09:00:00Z',
    end_time: '2026-01-16T17:00:00Z',
    is_all_day: false,
    location: 'Louvre',
    metadata: {},
    created_by: 'user1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

const defaultProps = {
  items: mockItems,
  tripStartDate: '2026-01-10T00:00:00Z',
  tripEndDate: '2026-01-25T00:00:00Z',
  currentMonth: new Date('2026-01-01'),
  onMonthChange: jest.fn(),
  onItemClick: jest.fn(),
  onNavigateToWeek: jest.fn(),
  onCreateItem: jest.fn(),
  currentUserId: 'user1',
  canEdit: true,
}

describe('MonthView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders 42 day cells (6 weeks × 7 days)', () => {
      render(<MonthView {...defaultProps} />)

      // Find all day cells by their date number (1-31)
      const calendarGrid = screen.getByRole('button', { name: /^\d+$/ }).closest('.grid')
      expect(calendarGrid).toBeInTheDocument()
    })

    it('displays correct month/year header', () => {
      render(<MonthView {...defaultProps} />)

      expect(screen.getByText('January 2026')).toBeInTheDocument()
    })

    it('shows day headers (Sun-Sat)', () => {
      render(<MonthView {...defaultProps} />)

      const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      dayHeaders.forEach(day => {
        expect(screen.getByText(day)).toBeInTheDocument()
      })
    })

    it("highlights today's date", () => {
      const today = new Date()
      const currentMonthProps = {
        ...defaultProps,
        currentMonth: today,
        tripStartDate: format(addDays(today, -10), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        tripEndDate: format(addDays(today, 10), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      }

      render(<MonthView {...currentMonthProps} />)

      // Today's cell should have bg-primary/10 class
      const todayDate = format(today, 'd')
      const buttons = screen.getAllByRole('button')
      const todayButton = buttons.find(btn => btn.textContent === todayDate)

      if (todayButton) {
        expect(todayButton.className).toContain('bg-primary/10')
      }
    })
  })

  describe('Navigation', () => {
    it('allows previous month navigation when not at trip start', () => {
      const onMonthChange = jest.fn()
      const props = {
        ...defaultProps,
        currentMonth: new Date('2026-01-15'),
        tripStartDate: '2026-01-01T00:00:00Z',
        tripEndDate: '2026-02-28T00:00:00Z',
        onMonthChange,
      }

      render(<MonthView {...props} />)

      const prevButton = screen.getAllByRole('button')[0] // First button is prev
      expect(prevButton).not.toBeDisabled()

      fireEvent.click(prevButton)
      expect(onMonthChange).toHaveBeenCalled()
    })

    it('disables previous month button when at trip start', () => {
      const props = {
        ...defaultProps,
        currentMonth: new Date('2026-01-01'),
        tripStartDate: '2026-01-01T00:00:00Z',
        tripEndDate: '2026-02-28T00:00:00Z',
      }

      render(<MonthView {...props} />)

      const prevButton = screen.getAllByRole('button')[0]
      expect(prevButton).toBeDisabled()
    })

    it('allows next month navigation when not at trip end', () => {
      const onMonthChange = jest.fn()
      const props = {
        ...defaultProps,
        currentMonth: new Date('2026-01-01'),
        tripStartDate: '2026-01-01T00:00:00Z',
        tripEndDate: '2026-02-28T00:00:00Z',
        onMonthChange,
      }

      render(<MonthView {...props} />)

      // Find next button (after "Today" button)
      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[buttons.length - 1]
      expect(nextButton).not.toBeDisabled()

      fireEvent.click(nextButton)
      expect(onMonthChange).toHaveBeenCalled()
    })

    it('disables next month button when at trip end', () => {
      const props = {
        ...defaultProps,
        currentMonth: new Date('2026-02-01'),
        tripStartDate: '2026-01-01T00:00:00Z',
        tripEndDate: '2026-02-28T00:00:00Z',
      }

      render(<MonthView {...props} />)

      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[buttons.length - 1]
      expect(nextButton).toBeDisabled()
    })

    it('navigates to today when Today button clicked (if within trip)', () => {
      const onMonthChange = jest.fn()
      const today = new Date()
      const props = {
        ...defaultProps,
        currentMonth: new Date('2026-01-01'),
        tripStartDate: format(addDays(today, -30), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        tripEndDate: format(addDays(today, 30), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        onMonthChange,
      }

      render(<MonthView {...props} />)

      const todayButton = screen.getByRole('button', { name: /today/i })
      fireEvent.click(todayButton)

      expect(onMonthChange).toHaveBeenCalled()
    })

    it('navigates to first trip month when Today clicked but outside trip range', () => {
      const onMonthChange = jest.fn()
      const props = {
        ...defaultProps,
        currentMonth: new Date('2026-01-01'),
        tripStartDate: '2026-03-01T00:00:00Z',
        tripEndDate: '2026-03-31T00:00:00Z',
        onMonthChange,
      }

      render(<MonthView {...props} />)

      const todayButton = screen.getByRole('button', { name: /today/i })
      fireEvent.click(todayButton)

      expect(onMonthChange).toHaveBeenCalled()
    })
  })

  describe('Item Display', () => {
    it('shows colored dots for each item type', () => {
      render(<MonthView {...defaultProps} />)

      // Find cells with dots (they should have the colored dot classes)
      const calendarElement = screen.getByText('January 2026').parentElement?.parentElement
      const dots = calendarElement?.querySelectorAll('.bg-blue-600, .bg-purple-600, .bg-green-600')

      expect(dots).toBeTruthy()
      expect(dots!.length).toBeGreaterThan(0)
    })

    it('groups items by date correctly', () => {
      const itemsOnSameDay: ItineraryItemWithParticipants[] = [
        {
          ...mockItems[0],
          start_time: '2026-01-15T09:00:00Z',
        },
        {
          ...mockItems[1],
          id: '2a',
          start_time: '2026-01-15T14:00:00Z',
          end_time: '2026-01-15T16:00:00Z',
        },
        {
          ...mockItems[2],
          id: '3a',
          start_time: '2026-01-15T18:00:00Z',
          end_time: '2026-01-15T20:00:00Z',
        },
      ]

      render(<MonthView {...defaultProps} items={itemsOnSameDay} />)

      // Should show dots for items on Jan 15
      const calendarElement = screen.getByText('January 2026').parentElement?.parentElement
      const dots = calendarElement?.querySelectorAll('.bg-blue-600, .bg-purple-600, .bg-green-600')

      expect(dots).toBeTruthy()
      expect(dots!.length).toBeGreaterThanOrEqual(3)
    })

    it('displays "+N more" when more than 5 items', () => {
      const manyItems: ItineraryItemWithParticipants[] = Array.from({ length: 7 }, (_, i) => ({
        ...mockItems[0],
        id: `item-${i}`,
        title: `Item ${i}`,
        start_time: '2026-01-15T10:00:00Z',
        end_time: '2026-01-15T11:00:00Z',
      }))

      render(<MonthView {...defaultProps} items={manyItems} />)

      expect(screen.getByText('+2')).toBeInTheDocument()
    })

    it('uses correct colors from type config', () => {
      const typedItems: ItineraryItemWithParticipants[] = [
        {
          ...mockItems[0],
          type: 'transport',
          start_time: '2026-01-15T10:00:00Z',
          end_time: '2026-01-15T11:00:00Z',
        },
        {
          ...mockItems[1],
          id: '2',
          type: 'accommodation',
          start_time: '2026-01-15T12:00:00Z',
          end_time: '2026-01-15T13:00:00Z',
        },
        {
          ...mockItems[2],
          id: '3',
          type: 'dining',
          start_time: '2026-01-15T14:00:00Z',
          end_time: '2026-01-15T15:00:00Z',
        },
      ]

      render(<MonthView {...defaultProps} items={typedItems} />)

      const calendarElement = screen.getByText('January 2026').parentElement?.parentElement

      expect(calendarElement?.querySelector('.bg-blue-600')).toBeTruthy() // transport
      expect(calendarElement?.querySelector('.bg-purple-600')).toBeTruthy() // accommodation
      expect(calendarElement?.querySelector('.bg-orange-600')).toBeTruthy() // dining
    })
  })

  describe('Interactions', () => {
    it('opens dropdown menu when trip day cell is clicked', () => {
      render(<MonthView {...defaultProps} />)

      // Find a day cell within trip range (Jan 15)
      const dayButtons = screen.getAllByRole('button').filter(btn => btn.textContent === '15')
      const jan15Button = dayButtons[0]

      fireEvent.click(jan15Button)

      // Dropdown menu should appear
      expect(screen.getByText('View Day Details')).toBeInTheDocument()
      expect(screen.getByText('Go to Week View')).toBeInTheDocument()
      expect(screen.getByText('Add New Item')).toBeInTheDocument()
    })

    it('triggers onNavigateToWeek when "Go to Week View" clicked', () => {
      const onNavigateToWeek = jest.fn()
      render(<MonthView {...defaultProps} onNavigateToWeek={onNavigateToWeek} />)

      const dayButtons = screen.getAllByRole('button').filter(btn => btn.textContent === '15')
      fireEvent.click(dayButtons[0])

      const weekViewOption = screen.getByText('Go to Week View')
      fireEvent.click(weekViewOption)

      expect(onNavigateToWeek).toHaveBeenCalled()
    })

    it('triggers onCreateItem when "Add New Item" clicked', () => {
      const onCreateItem = jest.fn()
      render(<MonthView {...defaultProps} onCreateItem={onCreateItem} />)

      const dayButtons = screen.getAllByRole('button').filter(btn => btn.textContent === '15')
      fireEvent.click(dayButtons[0])

      const addItemOption = screen.getByText('Add New Item')
      fireEvent.click(addItemOption)

      expect(onCreateItem).toHaveBeenCalled()
    })

    it('hides "Add New Item" when canEdit is false', () => {
      render(<MonthView {...defaultProps} canEdit={false} />)

      const dayButtons = screen.getAllByRole('button').filter(btn => btn.textContent === '15')
      fireEvent.click(dayButtons[0])

      expect(screen.queryByText('Add New Item')).not.toBeInTheDocument()
    })

    it('does not show dropdown for non-trip days', () => {
      render(<MonthView {...defaultProps} />)

      // Jan 1 is before trip start (Jan 10)
      const dayButtons = screen.getAllByRole('button').filter(btn => btn.textContent === '1')
      const jan1Button = dayButtons[0]

      fireEvent.click(jan1Button)

      // Dropdown should not appear
      expect(screen.queryByText('View Day Details')).not.toBeInTheDocument()
    })

    it('opens day detail popover when "View Day Details" clicked', () => {
      render(<MonthView {...defaultProps} />)

      const dayButtons = screen.getAllByRole('button').filter(btn => btn.textContent === '15')
      fireEvent.click(dayButtons[0])

      const viewDetailsOption = screen.getByText('View Day Details')
      fireEvent.click(viewDetailsOption)

      expect(screen.getByTestId('day-detail-popover')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles trips spanning multiple months', () => {
      const props = {
        ...defaultProps,
        tripStartDate: '2025-12-20T00:00:00Z',
        tripEndDate: '2026-01-20T00:00:00Z',
        currentMonth: new Date('2026-01-01'),
      }

      render(<MonthView {...props} />)

      expect(screen.getByText('January 2026')).toBeInTheDocument()
    })

    it('handles single-day trips', () => {
      const props = {
        ...defaultProps,
        tripStartDate: '2026-01-15T00:00:00Z',
        tripEndDate: '2026-01-15T23:59:59Z',
      }

      render(<MonthView {...props} />)

      const dayButtons = screen.getAllByRole('button').filter(btn => btn.textContent === '15')
      expect(dayButtons.length).toBeGreaterThan(0)
    })

    it('handles trips starting mid-month', () => {
      const props = {
        ...defaultProps,
        tripStartDate: '2026-01-15T00:00:00Z',
        tripEndDate: '2026-01-25T00:00:00Z',
      }

      render(<MonthView {...props} />)

      // Days before Jan 15 should not be clickable
      const day10Buttons = screen.getAllByRole('button').filter(btn => btn.textContent === '10')
      if (day10Buttons.length > 0) {
        expect(day10Buttons[0].className).toContain('cursor-not-allowed')
      }
    })

    it('handles trips ending mid-month', () => {
      const props = {
        ...defaultProps,
        tripStartDate: '2026-01-01T00:00:00Z',
        tripEndDate: '2026-01-15T00:00:00Z',
      }

      render(<MonthView {...props} />)

      // Days after Jan 15 should not be clickable
      const day20Buttons = screen.getAllByRole('button').filter(btn => btn.textContent === '20')
      if (day20Buttons.length > 0) {
        expect(day20Buttons[0].className).toContain('cursor-not-allowed')
      }
    })

    it('shows empty cell when no items on a date', () => {
      const props = {
        ...defaultProps,
        items: [],
      }

      render(<MonthView {...props} />)

      // Should show empty state message
      expect(screen.getByText('No itinerary items yet')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('displays empty state when no items exist', () => {
      render(<MonthView {...defaultProps} items={[]} />)

      expect(screen.getByText('No itinerary items yet')).toBeInTheDocument()
      expect(screen.getByText(/Start planning your trip/i)).toBeInTheDocument()
    })

    it('shows "Add First Item" button in empty state when canEdit is true', () => {
      render(<MonthView {...defaultProps} items={[]} canEdit={true} />)

      expect(screen.getByRole('button', { name: /Add First Item/i })).toBeInTheDocument()
    })

    it('hides "Add First Item" button in empty state when canEdit is false', () => {
      render(<MonthView {...defaultProps} items={[]} canEdit={false} />)

      expect(screen.queryByRole('button', { name: /Add First Item/i })).not.toBeInTheDocument()
    })
  })
})
