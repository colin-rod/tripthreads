/**
 * Component Tests: PermissionDeniedModal
 *
 * Tests for the permission denied modal that appears when viewers
 * attempt restricted actions.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PermissionDeniedModal } from '@/components/features/permissions/PermissionDeniedModal'
import { requestEditAccess } from '@/app/actions/permissions'

// Mock the server action
jest.mock('@/app/actions/permissions', () => ({
  requestEditAccess: jest.fn(),
}))

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

const mockRequestEditAccess = requestEditAccess as jest.MockedFunction<typeof requestEditAccess>

describe('PermissionDeniedModal', () => {
  const mockOnOpenChange = jest.fn()
  const tripId = 'test-trip-123'
  const actionAttempted = 'add itinerary items'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders modal when open', () => {
    render(
      <PermissionDeniedModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tripId={tripId}
        actionAttempted={actionAttempted}
      />
    )

    expect(screen.getByText('Permission Required')).toBeInTheDocument()
    expect(
      screen.getByText(/You don't have permission to add itinerary items/i)
    ).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <PermissionDeniedModal
        open={false}
        onOpenChange={mockOnOpenChange}
        tripId={tripId}
        actionAttempted={actionAttempted}
      />
    )

    expect(screen.queryByText('Permission Required')).not.toBeInTheDocument()
  })

  it('displays lock icon', () => {
    render(
      <PermissionDeniedModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tripId={tripId}
        actionAttempted={actionAttempted}
      />
    )

    // Check for SVG icon (Lock icon)
    const lockIcon = document.querySelector('svg')
    expect(lockIcon).toBeInTheDocument()
  })

  it('shows viewer status explanation', () => {
    render(
      <PermissionDeniedModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tripId={tripId}
        actionAttempted={actionAttempted}
      />
    )

    expect(screen.getByText(/currently a/i)).toBeInTheDocument()
    expect(screen.getByText(/You're currently a/i)).toBeInTheDocument()
    expect(screen.getByText(/cannot make changes/i)).toBeInTheDocument()
  })

  it('displays Request Edit Access button', () => {
    render(
      <PermissionDeniedModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tripId={tripId}
        actionAttempted={actionAttempted}
      />
    )

    expect(screen.getByRole('button', { name: /Request Edit Access/i })).toBeInTheDocument()
  })

  it('displays Cancel button', () => {
    render(
      <PermissionDeniedModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tripId={tripId}
        actionAttempted={actionAttempted}
      />
    )

    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
  })

  it('calls onOpenChange when Cancel is clicked', () => {
    render(
      <PermissionDeniedModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tripId={tripId}
        actionAttempted={actionAttempted}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('sends access request when Request Edit Access is clicked', async () => {
    mockRequestEditAccess.mockResolvedValueOnce(undefined)

    render(
      <PermissionDeniedModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tripId={tripId}
        actionAttempted={actionAttempted}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Request Edit Access/i }))

    await waitFor(() => {
      expect(mockRequestEditAccess).toHaveBeenCalledWith(tripId)
    })
  })

  it('changes button text to "Request Sent" after successful request', async () => {
    mockRequestEditAccess.mockResolvedValueOnce(undefined)

    render(
      <PermissionDeniedModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tripId={tripId}
        actionAttempted={actionAttempted}
      />
    )

    const button = screen.getByRole('button', { name: /Request Edit Access/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Request Sent/i })).toBeInTheDocument()
    })
  })

  it('disables button after request is sent', async () => {
    mockRequestEditAccess.mockResolvedValueOnce(undefined)

    render(
      <PermissionDeniedModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tripId={tripId}
        actionAttempted={actionAttempted}
      />
    )

    const button = screen.getByRole('button', { name: /Request Edit Access/i })
    fireEvent.click(button)

    await waitFor(() => {
      const sentButton = screen.getByRole('button', { name: /Request Sent/i })
      expect(sentButton).toBeDisabled()
    })
  })

  it('shows sending state while request is in progress', async () => {
    // Simulate slow request
    mockRequestEditAccess.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(undefined), 100))
    )

    render(
      <PermissionDeniedModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tripId={tripId}
        actionAttempted={actionAttempted}
      />
    )

    const button = screen.getByRole('button', { name: /Request Edit Access/i })
    fireEvent.click(button)

    // Check for "Sending..." state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sending/i })).toBeInTheDocument()
    })
  })

  it('handles request errors gracefully', async () => {
    mockRequestEditAccess.mockRejectedValueOnce(new Error('Network error'))

    render(
      <PermissionDeniedModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tripId={tripId}
        actionAttempted={actionAttempted}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Request Edit Access/i }))

    await waitFor(() => {
      // Button should return to normal state
      expect(screen.getByRole('button', { name: /Request Edit Access/i })).toBeInTheDocument()
    })
  })
})
