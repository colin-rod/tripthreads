/**
 * InviteDialog Component Tests
 *
 * Tests for the InviteDialog component including:
 * - Participant limit checking and paywall
 * - Upgrade prompt dialog
 * - Invite link generation blocking
 * - Email invite sending blocking
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { InviteDialog } from '@/components/features/trips/InviteDialog'

// Mock fetch globally
global.fetch = jest.fn()

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
})

// Mock Next.js router
const mockRouterPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockRouterPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
}))

// Mock toast
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  })),
}))

// Mock core functions
const mockCreateInviteLink = jest.fn()
const mockCreateBatchEmailInvites = jest.fn()
jest.mock('@tripthreads/core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createInviteLink: (...args: any[]) => mockCreateInviteLink(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createBatchEmailInvites: (...args: any[]) => mockCreateBatchEmailInvites(...args),
}))

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  trackInviteSent: jest.fn(),
}))

// Mock QR code component
jest.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="qr-code">QR Code</div>,
}))

describe('InviteDialog - Participant Limit Paywall', () => {
  const mockTripId = 'trip-123'
  const mockOnOpenChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockReset()
    mockRouterPush.mockReset()
    mockToast.mockReset()
  })

  describe('Upgrade Dialog on Participant Limit', () => {
    it('shows upgrade dialog when API returns not allowed for link generation', async () => {
      // Mock API response - limit reached
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          currentCount: 5,
          limit: 5,
          isProUser: false,
        }),
      })

      render(<InviteDialog open={true} onOpenChange={mockOnOpenChange} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Invite Participants')).toBeInTheDocument()
      })

      // Click "Generate Link" button
      const generateButton = screen.getByRole('button', { name: /generate invite link/i })
      fireEvent.click(generateButton)

      // Wait for API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/trips/${mockTripId}/participant-limit`)
      })

      // Upgrade dialog should appear
      await waitFor(() => {
        expect(screen.getByText('Participant Limit Reached')).toBeInTheDocument()
        expect(
          screen.getByText(
            /You've reached the free tier limit for participants. Upgrade to Pro for unlimited participants./
          )
        ).toBeInTheDocument()
      })
    })

    it('shows upgrade dialog when API returns not allowed for email sending', async () => {
      const user = userEvent.setup()

      // Mock API response - limit reached
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          currentCount: 5,
          limit: 5,
          isProUser: false,
        }),
      })

      render(<InviteDialog open={true} onOpenChange={mockOnOpenChange} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Invite Participants')).toBeInTheDocument()
      })

      // Switch to Email Invites tab
      const emailTab = screen.getByRole('tab', { name: /email invites/i })
      await user.click(emailTab)

      // Enter an email address
      const emailInput = screen.getByPlaceholderText(/enter email addresses/i)
      await user.type(emailInput, 'test@example.com')

      // Click "Send Invites" button
      const sendButton = screen.getByRole('button', { name: /send email invitations/i })
      fireEvent.click(sendButton)

      // Wait for API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/trips/${mockTripId}/participant-limit`)
      })

      // Upgrade dialog should appear
      await waitFor(() => {
        expect(screen.getByText('Participant Limit Reached')).toBeInTheDocument()
      })
    })

    it('upgrade dialog shows correct limit type (participants)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          currentCount: 5,
          limit: 5,
          isProUser: false,
        }),
      })

      render(<InviteDialog open={true} onOpenChange={mockOnOpenChange} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Invite Participants')).toBeInTheDocument()
      })

      const generateButton = screen.getByRole('button', { name: /generate invite link/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Participant Limit Reached')).toBeInTheDocument()
        // Should show participants-specific benefits
        expect(screen.getByText('Unlimited participants per trip')).toBeInTheDocument()
        expect(screen.getByText('Priority support')).toBeInTheDocument()
      })
    })

    it('upgrade dialog shows 5/5 usage for free user', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          currentCount: 5,
          limit: 5,
          isProUser: false,
        }),
      })

      render(<InviteDialog open={true} onOpenChange={mockOnOpenChange} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Invite Participants')).toBeInTheDocument()
      })

      const generateButton = screen.getByRole('button', { name: /generate invite link/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Participant Limit Reached')).toBeInTheDocument()
        // Dialog should display current usage
        expect(screen.getByText(/5 participants/)).toBeInTheDocument()
      })
    })

    it('does NOT generate invite link when limit exceeded', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          currentCount: 5,
          limit: 5,
          isProUser: false,
        }),
      })

      mockCreateInviteLink.mockResolvedValueOnce({
        id: 'invite-1',
        url: 'https://app.com/invite/xyz',
        token: 'xyz',
      })

      render(<InviteDialog open={true} onOpenChange={mockOnOpenChange} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Invite Participants')).toBeInTheDocument()
      })

      const generateButton = screen.getByRole('button', { name: /generate invite link/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Participant Limit Reached')).toBeInTheDocument()
      })

      // createInviteLink should NOT have been called
      expect(mockCreateInviteLink).not.toHaveBeenCalled()

      // No success toast
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invite link created!',
        })
      )
    })

    it('does NOT send invite emails when limit exceeded', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          currentCount: 5,
          limit: 5,
          isProUser: false,
        }),
      })

      mockCreateBatchEmailInvites.mockResolvedValueOnce([
        { id: 'invite-1', email: 'test@example.com' },
      ])

      render(<InviteDialog open={true} onOpenChange={mockOnOpenChange} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Invite Participants')).toBeInTheDocument()
      })

      // Switch to Email Invites tab
      const emailTab = screen.getByRole('tab', { name: /email invites/i })
      await user.click(emailTab)

      // Enter an email address
      const emailInput = screen.getByPlaceholderText(/enter email addresses/i)
      await user.type(emailInput, 'test@example.com')

      // Click "Send Invites" button
      const sendButton = screen.getByRole('button', { name: /send email invitations/i })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText('Participant Limit Reached')).toBeInTheDocument()
      })

      // createBatchEmailInvites should NOT have been called
      expect(mockCreateBatchEmailInvites).not.toHaveBeenCalled()

      // No success toast
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/invite.*sent/i),
        })
      )
    })

    it('navigates to /settings on upgrade click', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          currentCount: 5,
          limit: 5,
          isProUser: false,
        }),
      })

      render(<InviteDialog open={true} onOpenChange={mockOnOpenChange} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Invite Participants')).toBeInTheDocument()
      })

      const generateButton = screen.getByRole('button', { name: /generate invite link/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Participant Limit Reached')).toBeInTheDocument()
      })

      const upgradeButton = screen.getByRole('button', { name: /upgrade to pro/i })
      await user.click(upgradeButton)

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith('/settings?tab=subscription')
      })
    })
  })

  describe('Successful Invite Flow (No Limit)', () => {
    it('allows link generation when limit not exceeded', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          currentCount: 3,
          limit: 5,
          isProUser: false,
        }),
      })

      mockCreateInviteLink.mockResolvedValueOnce({
        id: 'invite-1',
        url: 'https://app.com/invite/xyz',
        token: 'xyz',
      })

      render(<InviteDialog open={true} onOpenChange={mockOnOpenChange} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Invite Participants')).toBeInTheDocument()
      })

      const generateButton = screen.getByRole('button', { name: /generate invite link/i })
      fireEvent.click(generateButton)

      // Should call limit check API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/trips/${mockTripId}/participant-limit`)
      })

      // Should proceed to create invite link
      await waitFor(() => {
        expect(mockCreateInviteLink).toHaveBeenCalled()
      })

      // Should show success toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Invite link created!',
          })
        )
      })

      // Should NOT show upgrade dialog
      expect(screen.queryByText('Participant Limit Reached')).not.toBeInTheDocument()
    })

    it('allows email sending when limit not exceeded', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          currentCount: 2,
          limit: 5,
          isProUser: false,
        }),
      })

      mockCreateBatchEmailInvites.mockResolvedValueOnce([
        { id: 'invite-1', email: 'test@example.com' },
      ])

      render(<InviteDialog open={true} onOpenChange={mockOnOpenChange} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Invite Participants')).toBeInTheDocument()
      })

      // Switch to Email Invites tab
      const emailTab = screen.getByRole('tab', { name: /email invites/i })
      await user.click(emailTab)

      // Enter an email address
      const emailInput = screen.getByPlaceholderText(/enter email addresses/i)
      await user.type(emailInput, 'test@example.com')

      // Click "Send Invites" button
      const sendButton = screen.getByRole('button', { name: /send email invitations/i })
      fireEvent.click(sendButton)

      // Should call limit check API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/trips/${mockTripId}/participant-limit`)
      })

      // Should proceed to send emails
      await waitFor(() => {
        expect(mockCreateBatchEmailInvites).toHaveBeenCalled()
      })

      // Should show success toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/1 invite sent/i),
          })
        )
      })

      // Should NOT show upgrade dialog
      expect(screen.queryByText('Participant Limit Reached')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('fails open when participant limit check API fails', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      mockCreateInviteLink.mockResolvedValueOnce({
        id: 'invite-1',
        url: 'https://app.com/invite/xyz',
        token: 'xyz',
      })

      render(<InviteDialog open={true} onOpenChange={mockOnOpenChange} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Invite Participants')).toBeInTheDocument()
      })

      const generateButton = screen.getByRole('button', { name: /generate invite link/i })
      fireEvent.click(generateButton)

      // Should still proceed with invite creation (fail open)
      await waitFor(() => {
        expect(mockCreateInviteLink).toHaveBeenCalled()
      })

      // Should NOT show upgrade dialog
      expect(screen.queryByText('Participant Limit Reached')).not.toBeInTheDocument()
    })
  })
})
