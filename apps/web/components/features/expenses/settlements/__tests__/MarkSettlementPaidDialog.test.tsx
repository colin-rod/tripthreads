/**
 * Component tests for MarkSettlementPaidDialog
 *
 * Tests dialog rendering, form interaction, note input,
 * and confirmation/cancellation flows.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MarkSettlementPaidDialog } from '../MarkSettlementPaidDialog'
import type { SettlementWithUsers } from '@tripthreads/core'

const mockSettlement: SettlementWithUsers = {
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

describe('MarkSettlementPaidDialog', () => {
  describe('Dialog Rendering', () => {
    it('should render when open is true', () => {
      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Mark as Paid')).toBeInTheDocument()
    })

    it('should not render when open is false', () => {
      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={false}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should not render when settlement is null', () => {
      render(
        <MarkSettlementPaidDialog
          settlement={null}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should display settlement details', () => {
      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
        />
      )

      expect(screen.getByText('Benji Rodriguez')).toBeInTheDocument()
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('€30.00')).toBeInTheDocument()
    })

    it('should show description text', () => {
      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
        />
      )

      expect(screen.getByText(/confirm that this payment has been completed/i)).toBeInTheDocument()
    })
  })

  describe('User Display', () => {
    it('should show "You" for debtor when currentUserId matches from_user_id', () => {
      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
          currentUserId="benji-id"
        />
      )

      expect(screen.getByText('You')).toBeInTheDocument()
      expect(screen.queryByText('Benji Rodriguez')).not.toBeInTheDocument()
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    it('should show "You" for creditor when currentUserId matches to_user_id', () => {
      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
          currentUserId="alice-id"
        />
      )

      expect(screen.getByText('Benji Rodriguez')).toBeInTheDocument()
      expect(screen.getByText('You')).toBeInTheDocument()
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument()
    })

    it('should show both names when currentUserId does not match', () => {
      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
          currentUserId="other-user-id"
        />
      )

      expect(screen.getByText('Benji Rodriguez')).toBeInTheDocument()
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })
  })

  describe('Note Input', () => {
    it('should render note textarea', () => {
      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
        />
      )

      const textarea = screen.getByPlaceholderText(/paid via venmo/i)
      expect(textarea).toBeInTheDocument()
    })

    it('should allow typing in note field', async () => {
      const user = userEvent.setup()

      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
        />
      )

      const textarea = screen.getByPlaceholderText(/paid via venmo/i)
      await user.type(textarea, 'Paid via bank transfer')

      expect(textarea).toHaveValue('Paid via bank transfer')
    })

    it('should show helper text for note field', () => {
      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
        />
      )

      expect(screen.getByText(/add an optional note to record payment method/i)).toBeInTheDocument()
    })
  })

  describe('Dialog Actions', () => {
    it('should have Cancel and Confirm buttons', () => {
      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
        />
      )

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /confirm payment/i })).toBeInTheDocument()
    })

    it('should call onOpenChange(false) when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={onOpenChange}
          onConfirm={vi.fn()}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('should call onConfirm with settlementId and note when confirmed', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()

      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={onConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText(/paid via venmo/i)
      await user.type(textarea, 'Paid via Venmo')

      const confirmButton = screen.getByRole('button', { name: /confirm payment/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith('settlement-1', 'Paid via Venmo')
      })
    })

    it('should call onConfirm with undefined note if note is empty', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()

      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={onConfirm}
        />
      )

      const confirmButton = screen.getByRole('button', { name: /confirm payment/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith('settlement-1', undefined)
      })
    })

    it('should trim whitespace from note', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()

      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={onConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText(/paid via venmo/i)
      await user.type(textarea, '  Paid via Venmo  ')

      const confirmButton = screen.getByRole('button', { name: /confirm payment/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith('settlement-1', 'Paid via Venmo')
      })
    })

    it('should close dialog after successful confirmation', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      const onConfirm = vi.fn().mockResolvedValue(undefined)

      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={onOpenChange}
          onConfirm={onConfirm}
        />
      )

      const confirmButton = screen.getByRole('button', { name: /confirm payment/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should reset note after successful confirmation', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn().mockResolvedValue(undefined)

      const { rerender } = render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={onConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText(/paid via venmo/i)
      await user.type(textarea, 'Paid via Venmo')

      const confirmButton = screen.getByRole('button', { name: /confirm payment/i })
      await user.click(confirmButton)

      // Close and reopen dialog
      rerender(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={false}
          onOpenChange={vi.fn()}
          onConfirm={onConfirm}
        />
      )

      rerender(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={onConfirm}
        />
      )

      // Note should be cleared
      const clearedTextarea = screen.getByPlaceholderText(/paid via venmo/i)
      expect(clearedTextarea).toHaveValue('')
    })

    it('should reset note when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      const { rerender } = render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={onOpenChange}
          onConfirm={vi.fn()}
        />
      )

      const textarea = screen.getByPlaceholderText(/paid via venmo/i)
      await user.type(textarea, 'Paid via Venmo')

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Reopen dialog
      rerender(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={onOpenChange}
          onConfirm={vi.fn()}
        />
      )

      // Note should be cleared
      const clearedTextarea = screen.getByPlaceholderText(/paid via venmo/i)
      expect(clearedTextarea).toHaveValue('')
    })
  })

  describe('Loading State', () => {
    it('should show loading text when submitting', async () => {
      const user = userEvent.setup()
      let resolveConfirm: () => void
      const onConfirm = vi.fn(
        () =>
          new Promise<void>(resolve => {
            resolveConfirm = resolve
          })
      )

      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={onConfirm}
        />
      )

      const confirmButton = screen.getByRole('button', { name: /confirm payment/i })
      await user.click(confirmButton)

      // Should show loading state
      expect(screen.getByText(/marking as paid/i)).toBeInTheDocument()
      expect(confirmButton).toBeDisabled()

      // Resolve the promise
      resolveConfirm!()
    })

    it('should disable textarea when submitting', async () => {
      const user = userEvent.setup()
      let resolveConfirm: () => void
      const onConfirm = vi.fn(
        () =>
          new Promise<void>(resolve => {
            resolveConfirm = resolve
          })
      )

      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={onConfirm}
        />
      )

      const confirmButton = screen.getByRole('button', { name: /confirm payment/i })
      await user.click(confirmButton)

      const textarea = screen.getByPlaceholderText(/paid via venmo/i)
      expect(textarea).toBeDisabled()

      // Resolve the promise
      resolveConfirm!()
    })

    it('should disable Cancel button when submitting', async () => {
      const user = userEvent.setup()
      let resolveConfirm: () => void
      const onConfirm = vi.fn(
        () =>
          new Promise<void>(resolve => {
            resolveConfirm = resolve
          })
      )

      render(
        <MarkSettlementPaidDialog
          settlement={mockSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={onConfirm}
        />
      )

      const confirmButton = screen.getByRole('button', { name: /confirm payment/i })
      await user.click(confirmButton)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeDisabled()

      // Resolve the promise
      resolveConfirm!()
    })
  })

  describe('Currency Formatting', () => {
    it('should format different currencies correctly', () => {
      const usdSettlement = { ...mockSettlement, currency: 'USD', amount: 5000 }

      render(
        <MarkSettlementPaidDialog
          settlement={usdSettlement}
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
        />
      )

      expect(screen.getByText('$50.00')).toBeInTheDocument()
    })
  })
})
