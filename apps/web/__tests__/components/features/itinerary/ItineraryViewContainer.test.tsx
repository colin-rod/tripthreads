import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ItineraryViewContainer } from '@/components/features/itinerary/ItineraryViewContainer'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'
import { getTripItineraryItems } from '@tripthreads/core'

// Mock dependencies
jest.mock('@tripthreads/core', () => ({
  ...jest.requireActual('@tripthreads/core'),
  getTripItineraryItems: jest.fn(),
}))

jest.mock('@/app/actions/itinerary')

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({})),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock child components
jest.mock('@/components/features/itinerary/MonthView', () => ({
  MonthView: ({
    onNavigateToWeek,
    onCreateItem,
  }: {
    onNavigateToWeek: () => void
    onCreateItem: () => void
  }) => (
    <div data-testid="month-view">
      <button onClick={() => onNavigateToWeek()}>Navigate to Week</button>
      <button onClick={() => onCreateItem()}>Create Item</button>
    </div>
  ),
}))

jest.mock('@/components/features/itinerary/CalendarView', () => ({
  CalendarView: () => <div data-testid="calendar-view">Calendar View</div>,
}))

jest.mock('@/components/features/itinerary/ListView', () => ({
  ListView: () => <div data-testid="list-view">List View</div>,
}))

jest.mock('@/components/features/itinerary/ItineraryItemDialog', () => ({
  ItineraryItemDialog: ({ mode, onSuccess }: { mode: string; onSuccess: () => void }) => (
    <div data-testid="itinerary-dialog">
      Dialog Mode: {mode}
      <button onClick={onSuccess}>Success</button>
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
]

const defaultProps = {
  tripId: 'trip1',
  tripStartDate: '2026-01-10T00:00:00Z',
  tripEndDate: '2026-01-25T00:00:00Z',
  currentUserId: 'user1',
  tripParticipants: [
    { id: 'user1', full_name: 'John Doe' },
    { id: 'user2', full_name: 'Jane Smith' },
  ],
  canEdit: true,
}

describe('ItineraryViewContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getTripItineraryItems as jest.Mock).mockResolvedValue(mockItems)
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    })
  })

  describe('Initial Rendering', () => {
    it('renders loading state initially', async () => {
      ;(getTripItineraryItems as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockItems), 100))
      )

      render(<ItineraryViewContainer {...defaultProps} />)

      expect(
        screen.getByRole('status', { hidden: true }) ||
          screen.getByText(/loading/i, { exact: false })
      ).toBeTruthy()
    })

    it('loads and displays itinerary items', async () => {
      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(getTripItineraryItems).toHaveBeenCalledWith({}, 'trip1')
      })
    })

    it('displays error message when items fail to load', async () => {
      ;(getTripItineraryItems as jest.Mock).mockRejectedValue(new Error('Failed to load'))

      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(getTripItineraryItems).toHaveBeenCalled()
      })
    })
  })

  describe('View Mode Toggle', () => {
    it('renders all three view mode buttons (Month, Week, List)', async () => {
      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Month')).toBeInTheDocument()
        expect(screen.getByText('Week')).toBeInTheDocument()
        expect(screen.getByText('List')).toBeInTheDocument()
      })
    })

    it('switches to month view when Month button clicked', async () => {
      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Month')).toBeInTheDocument()
      })

      const monthButton = screen.getByText('Month')
      fireEvent.click(monthButton)

      expect(screen.getByTestId('month-view')).toBeInTheDocument()
    })

    it('switches to calendar (week) view when Week button clicked', async () => {
      ;(window.localStorage.getItem as jest.Mock).mockReturnValue('month')

      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Week')).toBeInTheDocument()
      })

      const weekButton = screen.getByText('Week')
      fireEvent.click(weekButton)

      expect(screen.getByTestId('calendar-view')).toBeInTheDocument()
    })

    it('switches to list view when List button clicked', async () => {
      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('List')).toBeInTheDocument()
      })

      const listButton = screen.getByText('List')
      fireEvent.click(listButton)

      expect(screen.getByTestId('list-view')).toBeInTheDocument()
    })

    it('persists view mode to localStorage', async () => {
      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Month')).toBeInTheDocument()
      })

      const monthButton = screen.getByText('Month')
      fireEvent.click(monthButton)

      expect(window.localStorage.setItem).toHaveBeenCalledWith('itinerary-view-mode', 'month')
    })

    it('loads view mode from localStorage on mount', async () => {
      ;(window.localStorage.getItem as jest.Mock).mockReturnValue('list')

      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('list-view')).toBeInTheDocument()
      })
    })

    it('defaults to calendar view when no saved preference', async () => {
      ;(window.localStorage.getItem as jest.Mock).mockReturnValue(null)

      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('calendar-view')).toBeInTheDocument()
      })
    })
  })

  describe('Month View Integration', () => {
    it('renders MonthView with correct props', async () => {
      ;(window.localStorage.getItem as jest.Mock).mockReturnValue('month')

      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('month-view')).toBeInTheDocument()
      })
    })

    it('navigates to week view when MonthView triggers navigation', async () => {
      ;(window.localStorage.getItem as jest.Mock).mockReturnValue('month')

      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('month-view')).toBeInTheDocument()
      })

      const navigateButton = screen.getByText('Navigate to Week')
      fireEvent.click(navigateButton)

      expect(screen.getByTestId('calendar-view')).toBeInTheDocument()
      expect(window.localStorage.setItem).toHaveBeenCalledWith('itinerary-view-mode', 'calendar')
    })

    it('opens create dialog when MonthView triggers create action', async () => {
      ;(window.localStorage.getItem as jest.Mock).mockReturnValue('month')

      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('month-view')).toBeInTheDocument()
      })

      const createButton = screen.getByText('Create Item')
      fireEvent.click(createButton)

      expect(screen.getByText('Dialog Mode: create')).toBeInTheDocument()
    })
  })

  describe('Add Item Button', () => {
    it('shows Add Item button when canEdit is true', async () => {
      render(<ItineraryViewContainer {...defaultProps} canEdit={true} />)

      await waitFor(() => {
        expect(screen.getByText('Add Item')).toBeInTheDocument()
      })
    })

    it('hides Add Item button when canEdit is false', async () => {
      render(<ItineraryViewContainer {...defaultProps} canEdit={false} />)

      await waitFor(() => {
        expect(screen.queryByText('Add Item')).not.toBeInTheDocument()
      })
    })

    it('opens create dialog when Add Item button clicked', async () => {
      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Add Item')).toBeInTheDocument()
      })

      const addButton = screen.getByText('Add Item')
      fireEvent.click(addButton)

      expect(screen.getByText('Dialog Mode: create')).toBeInTheDocument()
    })
  })

  describe('Item Dialog', () => {
    it('reloads items when dialog success is triggered', async () => {
      ;(getTripItineraryItems as jest.Mock).mockResolvedValue(mockItems)

      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Add Item')).toBeInTheDocument()
      })

      // Open dialog
      const addButton = screen.getByText('Add Item')
      fireEvent.click(addButton)

      expect(screen.getByText('Dialog Mode: create')).toBeInTheDocument()

      // Clear previous calls
      ;(getTripItineraryItems as jest.Mock).mockClear()

      // Trigger success
      const successButton = screen.getByText('Success')
      fireEvent.click(successButton)

      await waitFor(() => {
        expect(getTripItineraryItems).toHaveBeenCalledWith({}, 'trip1')
      })
    })

    it('closes dialog and clears selected item on success', async () => {
      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Add Item')).toBeInTheDocument()
      })

      // Open dialog
      const addButton = screen.getByText('Add Item')
      fireEvent.click(addButton)

      // Trigger success
      const successButton = screen.getByText('Success')
      fireEvent.click(successButton)

      await waitFor(() => {
        expect(screen.queryByText('Dialog Mode:')).not.toBeInTheDocument()
      })
    })
  })

  describe('Delete Confirmation', () => {
    it('does not show delete dialog initially', async () => {
      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Month')).toBeInTheDocument()
      })

      expect(screen.queryByText('Delete Itinerary Item?')).not.toBeInTheDocument()
    })
  })

  describe('View Mode State', () => {
    it('maintains view mode when switching between views', async () => {
      render(<ItineraryViewContainer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Month')).toBeInTheDocument()
      })

      // Switch to month
      fireEvent.click(screen.getByText('Month'))
      expect(screen.getByTestId('month-view')).toBeInTheDocument()

      // Switch to list
      fireEvent.click(screen.getByText('List'))
      expect(screen.getByTestId('list-view')).toBeInTheDocument()

      // Switch back to month
      fireEvent.click(screen.getByText('Month'))
      expect(screen.getByTestId('month-view')).toBeInTheDocument()
    })
  })
})
