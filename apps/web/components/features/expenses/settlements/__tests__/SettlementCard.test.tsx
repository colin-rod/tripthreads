/**
 * Component tests for SettlementCard
 *
 * Tests rendering of pending and settled settlements,
 * user role-based display, and mark as paid action.
 */

import { describe, it, expect, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettlementCard } from '../SettlementCard'
import type { SettlementWithUsers } from '@tripthreads/core'

const mockPendingSettlement: SettlementWithUsers = {
  id: 'settlement-1',
  trip_id: 'trip-1',
  from_user_id: 'benji-id',
  to_user_id: 'alice-id',
  amount: 3000, // €30
  currency: 'EUR',
  status: 'pending',
  settled_at: null,
  settled_by: null,
  note: null,
  created_at: '2025-01-25T10:00:00Z',
  updated_at: '2025-01-25T10:00:00Z',
  from_user: {
    id: 'benji-id',
    full_name: 'Benji Rodriguez',
    avatar_url: null,
  },
  to_user: {
    id: 'alice-id',
    full_name: 'Alice Johnson',
    avatar_url: null,
  },
  settled_by_user: null,
}

const mockSettledSettlement: SettlementWithUsers = {
  ...mockPendingSettlement,
  id: 'settlement-2',
  status: 'settled',
  settled_at: '2025-01-26T14:30:00Z',
  settled_by: 'benji-id',
  note: 'Paid via Venmo',
  settled_by_user: {
    id: 'benji-id',
    full_name: 'Benji Rodriguez',
    avatar_url: null,
  },
}

describe('SettlementCard', () => {
  describe('Pending Settlement', () => {
    it('should render settlement details correctly', () => {
      render(<SettlementCard settlement={mockPendingSettlement} />)

      expect(screen.getByText('Benji Rodriguez')).toBeInTheDocument()
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('€30.00')).toBeInTheDocument()
    })

    it('should show "You" for debtor when currentUserId matches from_user_id', () => {
      render(<SettlementCard settlement={mockPendingSettlement} currentUserId="benji-id" />)

      expect(screen.getByText('You')).toBeInTheDocument()
      expect(screen.queryByText('Benji Rodriguez')).not.toBeInTheDocument()
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    it('should show "You" for creditor when currentUserId matches to_user_id', () => {
      render(<SettlementCard settlement={mockPendingSettlement} currentUserId="alice-id" />)

      expect(screen.getByText('Benji Rodriguez')).toBeInTheDocument()
      expect(screen.getByText('You')).toBeInTheDocument()
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument()
    })

    it('should show "Mark as Paid" button for debtor', () => {
      const onMarkAsPaid = jest.fn()
      render(
        <SettlementCard
          settlement={mockPendingSettlement}
          currentUserId="benji-id"
          onMarkAsPaid={onMarkAsPaid}
        />
      )

      const button = screen.getByRole('button', { name: /mark as paid/i })
      expect(button).toBeInTheDocument()
    })

    it('should show "Mark as Paid" button for creditor', () => {
      const onMarkAsPaid = jest.fn()
      render(
        <SettlementCard
          settlement={mockPendingSettlement}
          currentUserId="alice-id"
          onMarkAsPaid={onMarkAsPaid}
        />
      )

      const button = screen.getByRole('button', { name: /mark as paid/i })
      expect(button).toBeInTheDocument()
    })

    it('should not show "Mark as Paid" button for uninvolved users', () => {
      const onMarkAsPaid = jest.fn()
      render(
        <SettlementCard
          settlement={mockPendingSettlement}
          currentUserId="other-user-id"
          onMarkAsPaid={onMarkAsPaid}
        />
      )

      expect(screen.queryByRole('button', { name: /mark as paid/i })).not.toBeInTheDocument()
    })

    it('should call onMarkAsPaid when button is clicked', async () => {
      const user = userEvent.setup()
      const onMarkAsPaid = jest.fn()

      render(
        <SettlementCard
          settlement={mockPendingSettlement}
          currentUserId="benji-id"
          onMarkAsPaid={onMarkAsPaid}
        />
      )

      const button = screen.getByRole('button', { name: /mark as paid/i })
      await user.click(button)

      expect(onMarkAsPaid).toHaveBeenCalledWith('settlement-1')
      expect(onMarkAsPaid).toHaveBeenCalledTimes(1)
    })

    it('should not show "Mark as Paid" button if onMarkAsPaid is not provided', () => {
      render(<SettlementCard settlement={mockPendingSettlement} currentUserId="benji-id" />)

      expect(screen.queryByRole('button', { name: /mark as paid/i })).not.toBeInTheDocument()
    })

    it('should have hover effect for pending settlements', () => {
      const { container } = render(<SettlementCard settlement={mockPendingSettlement} />)

      const card = container.querySelector('[class*="hover:shadow"]')
      expect(card).toBeInTheDocument()
    })
  })

  describe('Settled Settlement', () => {
    it('should render settled settlement with badge', () => {
      render(<SettlementCard settlement={mockSettledSettlement} />)

      expect(screen.getByText('Settled')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /mark as paid/i })).not.toBeInTheDocument()
    })

    it('should show relative timestamp when settled_at is present', () => {
      render(<SettlementCard settlement={mockSettledSettlement} />)

      // formatDistanceToNow should show something like "2 days ago"
      const timestamp = screen.getByText(/ago/)
      expect(timestamp).toBeInTheDocument()
    })

    it('should display settlement note when present', () => {
      render(<SettlementCard settlement={mockSettledSettlement} />)

      expect(screen.getByText('Paid via Venmo')).toBeInTheDocument()
    })

    it('should not display note when note is null', () => {
      const settlementWithoutNote = { ...mockSettledSettlement, note: null }
      render(<SettlementCard settlement={settlementWithoutNote} />)

      expect(screen.queryByText('Paid via Venmo')).not.toBeInTheDocument()
    })

    it('should have reduced opacity for settled settlements', () => {
      const { container } = render(<SettlementCard settlement={mockSettledSettlement} />)

      const card = container.querySelector('[class*="opacity-75"]')
      expect(card).toBeInTheDocument()
    })

    it('should not show "Mark as Paid" button for settled settlements', () => {
      const onMarkAsPaid = jest.fn()
      render(
        <SettlementCard
          settlement={mockSettledSettlement}
          currentUserId="benji-id"
          onMarkAsPaid={onMarkAsPaid}
        />
      )

      expect(screen.queryByRole('button', { name: /mark as paid/i })).not.toBeInTheDocument()
    })
  })

  describe('User Initials', () => {
    it('should show correct initials for single-word names', () => {
      const settlement = {
        ...mockPendingSettlement,
        from_user: { ...mockPendingSettlement.from_user, full_name: 'Alice' },
        to_user: { ...mockPendingSettlement.to_user, full_name: 'Bob' },
      }

      render(<SettlementCard settlement={settlement} />)

      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('B')).toBeInTheDocument()
    })

    it('should show correct initials for multi-word names', () => {
      render(<SettlementCard settlement={mockPendingSettlement} />)

      // Benji Rodriguez -> BR
      expect(screen.getByText('BR')).toBeInTheDocument()
      // Alice Johnson -> AJ
      expect(screen.getByText('AJ')).toBeInTheDocument()
    })

    it('should limit initials to 2 characters', () => {
      const settlement = {
        ...mockPendingSettlement,
        from_user: {
          ...mockPendingSettlement.from_user,
          full_name: 'Alice Bob Charlie',
        },
      }

      const { container } = render(<SettlementCard settlement={settlement} />)

      // Should only show "AB" not "ABC"
      const initials = container.querySelector('[class*="text-xs"]')
      expect(initials?.textContent).toHaveLength(2)
    })
  })

  describe('Currency Formatting', () => {
    it('should format EUR correctly', () => {
      render(<SettlementCard settlement={mockPendingSettlement} />)

      expect(screen.getByText('€30.00')).toBeInTheDocument()
    })

    it('should format USD correctly', () => {
      const usdSettlement = { ...mockPendingSettlement, currency: 'USD', amount: 5000 }
      render(<SettlementCard settlement={usdSettlement} />)

      expect(screen.getByText('$50.00')).toBeInTheDocument()
    })

    it('should format GBP correctly', () => {
      const gbpSettlement = { ...mockPendingSettlement, currency: 'GBP', amount: 7500 }
      render(<SettlementCard settlement={gbpSettlement} />)

      expect(screen.getByText('£75.00')).toBeInTheDocument()
    })

    it('should handle fractional amounts correctly', () => {
      const settlement = { ...mockPendingSettlement, amount: 1234 } // €12.34
      render(<SettlementCard settlement={settlement} />)

      expect(screen.getByText('€12.34')).toBeInTheDocument()
    })
  })
})
