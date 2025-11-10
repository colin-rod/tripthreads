/**
 * Component tests for SettlementSummary
 *
 * Tests rendering of pending/settled settlements, toggle states,
 * dialog integration, and localStorage persistence.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettlementSummary } from '../SettlementSummary'
import { formatCurrencyFromMinorUnits } from '@tripthreads/core'
import type { SettlementSummary as SettlementSummaryType } from '@tripthreads/core'

// Mock the server action
jest.mock('@/app/actions/settlements', () => ({
  markSettlementAsPaidAction: jest.fn().mockResolvedValue({ success: true }),
}))

// Mock useToast
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

const mockSummaryWithPending: SettlementSummaryType = {
  balances: [
    { user_id: 'alice-id', user_name: 'Alice Johnson', net_balance: 3000, currency: 'EUR' },
    { user_id: 'benji-id', user_name: 'Benji Rodriguez', net_balance: -3000, currency: 'EUR' },
  ],
  pending_settlements: [
    {
      id: 'settlement-1',
      trip_id: 'trip-1',
      from_user_id: 'benji-id',
      to_user_id: 'alice-id',
      amount: 3000,
      currency: 'EUR',
      status: 'pending',
      settled_at: null,
      settled_by: null,
      note: null,
      created_at: '2025-01-25T10:00:00Z',
      updated_at: '2025-01-25T10:00:00Z',
      from_user: { id: 'benji-id', full_name: 'Benji Rodriguez', avatar_url: null },
      to_user: { id: 'alice-id', full_name: 'Alice Johnson', avatar_url: null },
      settled_by_user: null,
    },
  ],
  settled_settlements: [],
  total_expenses: 5,
  base_currency: 'EUR',
  excluded_expenses: [],
}

const mockSummaryWithSettled: SettlementSummaryType = {
  ...mockSummaryWithPending,
  pending_settlements: [],
  settled_settlements: [
    {
      id: 'settlement-2',
      trip_id: 'trip-1',
      from_user_id: 'benji-id',
      to_user_id: 'alice-id',
      amount: 2000,
      currency: 'EUR',
      status: 'settled',
      settled_at: '2025-01-26T14:30:00Z',
      settled_by: 'benji-id',
      note: 'Paid via Venmo',
      created_at: '2025-01-25T10:00:00Z',
      updated_at: '2025-01-26T14:30:00Z',
      from_user: { id: 'benji-id', full_name: 'Benji Rodriguez', avatar_url: null },
      to_user: { id: 'alice-id', full_name: 'Alice Johnson', avatar_url: null },
      settled_by_user: { id: 'benji-id', full_name: 'Benji Rodriguez', avatar_url: null },
    },
  ],
}

const mockSummaryWithBoth: SettlementSummaryType = {
  ...mockSummaryWithPending,
  settled_settlements: mockSummaryWithSettled.settled_settlements,
}

describe('SettlementSummary', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    mockToast.mockClear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Rendering', () => {
    it('should render nothing when summary is null', () => {
      const { container } = render(<SettlementSummary summary={null} tripId="trip-1" />)

      expect(container).toBeEmptyDOMElement()
    })

    it('should render nothing when there are no settlements', () => {
      const emptySummary: SettlementSummaryType = {
        ...mockSummaryWithPending,
        pending_settlements: [],
        settled_settlements: [],
      }

      const { container } = render(<SettlementSummary summary={emptySummary} tripId="trip-1" />)

      expect(container).toBeEmptyDOMElement()
    })

    it('should render card when there are pending settlements', () => {
      render(<SettlementSummary summary={mockSummaryWithPending} tripId="trip-1" />)

      expect(screen.getByText('Settlements')).toBeInTheDocument()
      expect(screen.getByText('1 pending transfer')).toBeInTheDocument()
    })

    it('should render card when there are settled settlements', () => {
      render(<SettlementSummary summary={mockSummaryWithSettled} tripId="trip-1" />)

      expect(screen.getByText('Settlements')).toBeInTheDocument()
      expect(screen.getByText('1 settled')).toBeInTheDocument()
    })

    it('should show correct count for multiple pending settlements', () => {
      const multiPending = {
        ...mockSummaryWithPending,
        pending_settlements: [
          mockSummaryWithPending.pending_settlements[0],
          { ...mockSummaryWithPending.pending_settlements[0], id: 'settlement-3' },
        ],
      }

      render(<SettlementSummary summary={multiPending} tripId="trip-1" />)

      expect(screen.getByText('2 pending transfers')).toBeInTheDocument()
    })

    it('should show correct count for multiple settled settlements', () => {
      const multiSettled = {
        ...mockSummaryWithSettled,
        settled_settlements: [
          mockSummaryWithSettled.settled_settlements[0],
          { ...mockSummaryWithSettled.settled_settlements[0], id: 'settlement-4' },
        ],
      }

      render(<SettlementSummary summary={multiSettled} tripId="trip-1" />)

      expect(screen.getByText('2 settled')).toBeInTheDocument()
    })

    it('should show both pending and settled counts when both exist', () => {
      render(<SettlementSummary summary={mockSummaryWithBoth} tripId="trip-1" />)

      expect(screen.getByText(/1 pending transfer.*•.*1 settled/)).toBeInTheDocument()
    })
  })

  describe('Collapsible State', () => {
    it('should show content by default', () => {
      render(<SettlementSummary summary={mockSummaryWithPending} tripId="trip-1" />)

      expect(screen.getByText('Pending Transfers')).toBeInTheDocument()
    })

    it('should hide content when collapsed', async () => {
      const user = userEvent.setup()

      render(<SettlementSummary summary={mockSummaryWithPending} tripId="trip-1" />)

      // Find and click the collapse button (ChevronUp icon in header)
      const collapseButton = screen.getAllByRole('button')[0]
      await user.click(collapseButton)

      expect(screen.queryByText('Pending Transfers')).not.toBeInTheDocument()
    })

    it('should persist collapse state to localStorage', async () => {
      const user = userEvent.setup()

      render(<SettlementSummary summary={mockSummaryWithPending} tripId="trip-1" />)

      const collapseButton = screen.getAllByRole('button')[0]
      await user.click(collapseButton)

      expect(localStorage.getItem('settlement-summary-collapsed-trip-1')).toBe('true')
    })

    it('should restore collapse state from localStorage', () => {
      localStorage.setItem('settlement-summary-collapsed-trip-1', 'true')

      render(<SettlementSummary summary={mockSummaryWithPending} tripId="trip-1" />)

      expect(screen.queryByText('Pending Transfers')).not.toBeInTheDocument()
    })
  })

  describe('Pending Settlements Section', () => {
    it('should render pending settlements section', () => {
      render(<SettlementSummary summary={mockSummaryWithPending} tripId="trip-1" />)

      expect(screen.getByText('Pending Transfers')).toBeInTheDocument()
    })

    it('should render all pending settlements', () => {
      const multiPending = {
        ...mockSummaryWithPending,
        pending_settlements: [
          mockSummaryWithPending.pending_settlements[0],
          {
            ...mockSummaryWithPending.pending_settlements[0],
            id: 'settlement-3',
            from_user_id: 'alice-id',
            to_user_id: 'benji-id',
            from_user: { id: 'alice-id', full_name: 'Alice Johnson', avatar_url: null },
            to_user: { id: 'benji-id', full_name: 'Benji Rodriguez', avatar_url: null },
          },
        ],
      }

      render(<SettlementSummary summary={multiPending} tripId="trip-1" />)

      const formattedAmount = formatCurrencyFromMinorUnits(
        mockSummaryWithPending.pending_settlements[0].amount,
        mockSummaryWithPending.pending_settlements[0].currency
      )
      const settlements = screen.getAllByText(formattedAmount)
      expect(settlements).toHaveLength(2)
    })

    it('should show "Mark as Paid" button for pending settlements', () => {
      render(
        <SettlementSummary
          summary={mockSummaryWithPending}
          tripId="trip-1"
          currentUserId="benji-id"
        />
      )

      expect(screen.getByRole('button', { name: /mark as paid/i })).toBeInTheDocument()
    })
  })

  describe('Settled History Section', () => {
    it('should render settlement history toggle button', () => {
      render(<SettlementSummary summary={mockSummaryWithSettled} tripId="trip-1" />)

      expect(screen.getByText(/settlement history \(1\)/i)).toBeInTheDocument()
    })

    it('should hide settled settlements by default', () => {
      render(<SettlementSummary summary={mockSummaryWithSettled} tripId="trip-1" />)

      // Should not show the "Settled" badge initially
      expect(screen.queryByText('Settled')).not.toBeInTheDocument()
    })

    it('should show settled settlements when toggled', async () => {
      const user = userEvent.setup()

      render(<SettlementSummary summary={mockSummaryWithSettled} tripId="trip-1" />)

      const toggleButton = screen.getByText(/settlement history/i)
      await user.click(toggleButton)

      expect(screen.getByText('Settled')).toBeInTheDocument()
    })

    it('should persist history toggle state to localStorage', async () => {
      const user = userEvent.setup()

      render(<SettlementSummary summary={mockSummaryWithSettled} tripId="trip-1" />)

      const toggleButton = screen.getByText(/settlement history/i)
      await user.click(toggleButton)

      expect(localStorage.getItem('settlement-history-expanded-trip-1')).toBe('true')
    })

    it('should restore history toggle state from localStorage', () => {
      localStorage.setItem('settlement-history-expanded-trip-1', 'true')

      render(<SettlementSummary summary={mockSummaryWithSettled} tripId="trip-1" />)

      // Should show settled settlements on mount
      expect(screen.getByText('Settled')).toBeInTheDocument()
    })
  })

  describe('Individual Balances Section', () => {
    it('should render individual balances toggle button', () => {
      render(<SettlementSummary summary={mockSummaryWithPending} tripId="trip-1" />)

      expect(screen.getByText('Individual Balances')).toBeInTheDocument()
    })

    it('should hide individual balances by default', () => {
      render(<SettlementSummary summary={mockSummaryWithPending} tripId="trip-1" />)

      // UserBalanceCard should not be rendered initially
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument()
    })

    it('should show individual balances when toggled', async () => {
      const user = userEvent.setup()

      render(<SettlementSummary summary={mockSummaryWithPending} tripId="trip-1" />)

      const toggleButton = screen.getByText('Individual Balances')
      await user.click(toggleButton)

      // Should show user names from balances
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('Benji Rodriguez')).toBeInTheDocument()
    })

    it('should persist balances toggle state to localStorage', async () => {
      const user = userEvent.setup()

      render(<SettlementSummary summary={mockSummaryWithPending} tripId="trip-1" />)

      const toggleButton = screen.getByText('Individual Balances')
      await user.click(toggleButton)

      expect(localStorage.getItem('settlement-balances-expanded-trip-1')).toBe('true')
    })

    it('should restore balances toggle state from localStorage', () => {
      localStorage.setItem('settlement-balances-expanded-trip-1', 'true')

      render(<SettlementSummary summary={mockSummaryWithPending} tripId="trip-1" />)

      // Should show balances on mount
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })
  })

  describe('Mark as Paid Dialog Integration', () => {
    it('should open dialog when "Mark as Paid" is clicked', async () => {
      const user = userEvent.setup()

      render(
        <SettlementSummary
          summary={mockSummaryWithPending}
          tripId="trip-1"
          currentUserId="benji-id"
        />
      )

      const markAsPaidButton = screen.getByRole('button', { name: /mark as paid/i })
      await user.click(markAsPaidButton)

      // Dialog should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Mark as Paid')).toBeInTheDocument()
    })

    it('should show settlement details in dialog', async () => {
      const user = userEvent.setup()

      render(
        <SettlementSummary
          summary={mockSummaryWithPending}
          tripId="trip-1"
          currentUserId="benji-id"
        />
      )

      const markAsPaidButton = screen.getByRole('button', { name: /mark as paid/i })
      await user.click(markAsPaidButton)

      // Should show settlement amount in dialog
      const formattedAmount = formatCurrencyFromMinorUnits(
        mockSummaryWithPending.pending_settlements[0].amount,
        mockSummaryWithPending.pending_settlements[0].currency
      )
      const amounts = screen.getAllByText(formattedAmount)
      expect(amounts.length).toBeGreaterThan(0)
    })

    it('should close dialog when cancelled', async () => {
      const user = userEvent.setup()

      render(
        <SettlementSummary
          summary={mockSummaryWithPending}
          tripId="trip-1"
          currentUserId="benji-id"
        />
      )

      const markAsPaidButton = screen.getByRole('button', { name: /mark as paid/i })
      await user.click(markAsPaidButton)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('should show success toast after marking as paid', async () => {
      const user = userEvent.setup()

      render(
        <SettlementSummary
          summary={mockSummaryWithPending}
          tripId="trip-1"
          currentUserId="benji-id"
        />
      )

      const markAsPaidButton = screen.getByRole('button', { name: /mark as paid/i })
      await user.click(markAsPaidButton)

      const confirmButton = screen.getByRole('button', { name: /confirm payment/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Settlement marked as paid',
          description: 'The settlement has been marked as paid and excluded from your balance.',
        })
      })
    })
  })

  describe('LocalStorage Isolation', () => {
    it('should use trip-specific keys for localStorage', async () => {
      const user = userEvent.setup()

      render(<SettlementSummary summary={mockSummaryWithPending} tripId="trip-123" />)

      const collapseButton = screen.getAllByRole('button')[0]
      await user.click(collapseButton)

      expect(localStorage.getItem('settlement-summary-collapsed-trip-123')).toBe('true')
      expect(localStorage.getItem('settlement-summary-collapsed-trip-1')).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing currentUserId gracefully', () => {
      render(<SettlementSummary summary={mockSummaryWithPending} tripId="trip-1" />)

      // Should still render, just without "You" labels
      expect(screen.getByText('Benji Rodriguez')).toBeInTheDocument()
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    it('should render when only balances exist (no settlements)', () => {
      const balancesOnly: SettlementSummaryType = {
        balances: mockSummaryWithPending.balances,
        pending_settlements: [],
        settled_settlements: [],
        total_expenses: 5,
        base_currency: 'EUR',
        excluded_expenses: [],
      }

      const { container } = render(<SettlementSummary summary={balancesOnly} tripId="trip-1" />)

      // Should not render card when there are no settlements
      expect(container).toBeEmptyDOMElement()
    })
  })
})
