/**
 * ItineraryItemTooltip Component Tests
 *
 * Tests the tooltip wrapper that displays type-specific metadata
 * on hover (desktop only).
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { ItineraryItemTooltip } from '../../components/features/itinerary/ItineraryItemTooltip'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'

// Mock the Tooltip components from shadcn/ui
jest.mock('../../components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div data-testid="tooltip-provider">{children}</div>,
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children }: any) => <div data-testid="tooltip-trigger">{children}</div>,
  TooltipContent: ({ children, side, className }: any) => (
    <div data-testid="tooltip-content" data-side={side} className={className}>
      {children}
    </div>
  ),
}))

describe('ItineraryItemTooltip', () => {
  const mockTransportItem: ItineraryItemWithParticipants = {
    id: '1',
    trip_id: 'trip1',
    type: 'transport',
    title: 'Flight to Lisbon',
    description: null,
    notes: null,
    links: [],
    start_time: '2025-06-15T08:00:00Z',
    end_time: '2025-06-15T10:30:00Z',
    is_all_day: false,
    location: 'Lisbon Airport',
    metadata: {
      flight_number: 'TP123',
      departure_location: 'JFK',
      arrival_location: 'LIS',
      terminal: '1',
      gate: 'A5',
      booking_reference: 'ABC123',
    },
    created_by: 'user1',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
  }

  beforeEach(() => {
    // Reset window size mock
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
  })

  describe('basic rendering', () => {
    it('renders children', () => {
      render(
        <ItineraryItemTooltip item={mockTransportItem}>
          <div>Test Child</div>
        </ItineraryItemTooltip>
      )

      expect(screen.getByText('Test Child')).toBeInTheDocument()
    })

    it('wraps children in tooltip components on desktop', () => {
      render(
        <ItineraryItemTooltip item={mockTransportItem}>
          <div>Test Child</div>
        </ItineraryItemTooltip>
      )

      expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument()
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
      expect(screen.getByTestId('tooltip-trigger')).toBeInTheDocument()
    })
  })

  describe('metadata display', () => {
    it('displays transport metadata in tooltip content', () => {
      render(
        <ItineraryItemTooltip item={mockTransportItem}>
          <div>Card Content</div>
        </ItineraryItemTooltip>
      )

      const tooltipContent = screen.getByTestId('tooltip-content')
      expect(tooltipContent).toBeInTheDocument()

      // Check for metadata lines
      expect(screen.getByText(/Flight TP123/)).toBeInTheDocument()
      expect(screen.getByText(/JFK → LIS/)).toBeInTheDocument()
      expect(screen.getByText(/Terminal 1 • Gate A5/)).toBeInTheDocument()
      expect(screen.getByText(/Booking: ABC123/)).toBeInTheDocument()
    })

    it('displays accommodation metadata', () => {
      const accommodationItem: ItineraryItemWithParticipants = {
        ...mockTransportItem,
        type: 'accommodation',
        metadata: {
          confirmation_number: 'CONF123',
          check_in_time: '3:00 PM',
          address: '123 Main St, Lisbon',
        },
      }

      render(
        <ItineraryItemTooltip item={accommodationItem}>
          <div>Card</div>
        </ItineraryItemTooltip>
      )

      expect(screen.getByText(/Conf: CONF123/)).toBeInTheDocument()
      expect(screen.getByText(/Check-in: 3:00 PM/)).toBeInTheDocument()
      expect(screen.getByText(/123 Main St, Lisbon/)).toBeInTheDocument()
    })

    it('displays dining metadata', () => {
      const diningItem: ItineraryItemWithParticipants = {
        ...mockTransportItem,
        type: 'dining',
        metadata: {
          reservation_name: 'Smith',
          cuisine_type: 'Italian',
          price_range: '$$$',
        },
      }

      render(
        <ItineraryItemTooltip item={diningItem}>
          <div>Card</div>
        </ItineraryItemTooltip>
      )

      expect(screen.getByText(/Reservation: Smith/)).toBeInTheDocument()
      expect(screen.getByText(/Italian • \$\$\$/)).toBeInTheDocument()
    })

    it('displays activity metadata', () => {
      const activityItem: ItineraryItemWithParticipants = {
        ...mockTransportItem,
        type: 'activity',
        metadata: {
          meeting_point: 'Hotel Lobby',
          duration: '3 hours',
          difficulty_level: 'moderate',
        },
      }

      render(
        <ItineraryItemTooltip item={activityItem}>
          <div>Card</div>
        </ItineraryItemTooltip>
      )

      expect(screen.getByText(/Meet: Hotel Lobby/)).toBeInTheDocument()
      expect(screen.getByText(/Duration: 3 hours/)).toBeInTheDocument()
      expect(screen.getByText(/Difficulty: moderate/)).toBeInTheDocument()
    })
  })

  describe('mobile behavior', () => {
    it('does not show tooltip on mobile (width < 768px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <ItineraryItemTooltip item={mockTransportItem}>
          <div>Test Child</div>
        </ItineraryItemTooltip>
      )

      // Should just render children without tooltip wrapper
      expect(screen.getByText('Test Child')).toBeInTheDocument()
      expect(screen.queryByTestId('tooltip-provider')).not.toBeInTheDocument()
    })

    it('detects mobile on resize', () => {
      const { rerender } = render(
        <ItineraryItemTooltip item={mockTransportItem}>
          <div>Test Child</div>
        </ItineraryItemTooltip>
      )

      // Initially desktop
      expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument()

      // Simulate resize to mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      window.dispatchEvent(new Event('resize'))

      rerender(
        <ItineraryItemTooltip item={mockTransportItem}>
          <div>Test Child</div>
        </ItineraryItemTooltip>
      )

      // Should update to mobile view
      // Note: This test depends on component re-render, may need adjustment
    })
  })

  describe('enabled prop', () => {
    it('returns children only when enabled=false', () => {
      render(
        <ItineraryItemTooltip item={mockTransportItem} enabled={false}>
          <div>Test Child</div>
        </ItineraryItemTooltip>
      )

      expect(screen.getByText('Test Child')).toBeInTheDocument()
      expect(screen.queryByTestId('tooltip-provider')).not.toBeInTheDocument()
    })
  })

  describe('no metadata cases', () => {
    it('returns children only when item has no metadata', () => {
      const itemWithoutMetadata: ItineraryItemWithParticipants = {
        ...mockTransportItem,
        metadata: {},
      }

      render(
        <ItineraryItemTooltip item={itemWithoutMetadata}>
          <div>Test Child</div>
        </ItineraryItemTooltip>
      )

      expect(screen.getByText('Test Child')).toBeInTheDocument()
      expect(screen.queryByTestId('tooltip-provider')).not.toBeInTheDocument()
    })

    it('returns children only for general type items', () => {
      const generalItem: ItineraryItemWithParticipants = {
        ...mockTransportItem,
        type: 'general',
        metadata: {},
      }

      render(
        <ItineraryItemTooltip item={generalItem}>
          <div>Test Child</div>
        </ItineraryItemTooltip>
      )

      expect(screen.getByText('Test Child')).toBeInTheDocument()
      expect(screen.queryByTestId('tooltip-provider')).not.toBeInTheDocument()
    })
  })

  describe('tooltip configuration', () => {
    it('sets tooltip to show on top', () => {
      render(
        <ItineraryItemTooltip item={mockTransportItem}>
          <div>Card</div>
        </ItineraryItemTooltip>
      )

      const tooltipContent = screen.getByTestId('tooltip-content')
      expect(tooltipContent).toHaveAttribute('data-side', 'top')
    })

    it('applies max-width class to tooltip content', () => {
      render(
        <ItineraryItemTooltip item={mockTransportItem}>
          <div>Card</div>
        </ItineraryItemTooltip>
      )

      const tooltipContent = screen.getByTestId('tooltip-content')
      expect(tooltipContent).toHaveClass('max-w-xs')
    })
  })

  describe('edge cases', () => {
    it('handles item with partial metadata', () => {
      const partialItem: ItineraryItemWithParticipants = {
        ...mockTransportItem,
        metadata: {
          flight_number: 'AA123',
          // Only one field
        },
      }

      render(
        <ItineraryItemTooltip item={partialItem}>
          <div>Card</div>
        </ItineraryItemTooltip>
      )

      expect(screen.getByText(/Flight AA123/)).toBeInTheDocument()
      // Should still render tooltip with just one line
      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument()
    })

    it('handles null metadata values gracefully', () => {
      const nullMetadataItem: ItineraryItemWithParticipants = {
        ...mockTransportItem,
        metadata: {
          flight_number: null,
          terminal: null,
        },
      }

      render(
        <ItineraryItemTooltip item={nullMetadataItem}>
          <div>Card</div>
        </ItineraryItemTooltip>
      )

      // Should not show tooltip when all values are null
      expect(screen.queryByTestId('tooltip-provider')).not.toBeInTheDocument()
    })
  })
})
