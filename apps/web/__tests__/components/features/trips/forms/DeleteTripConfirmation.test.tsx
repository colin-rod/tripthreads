/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteTripConfirmation } from '@/components/features/trips/forms/DeleteTripConfirmation'
import { deleteTrip } from '@tripthreads/core'

// Mock next/navigation
const mockRefresh = jest.fn()
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
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
  createClient: jest.fn(() => ({})),
}))

// Mock deleteTrip from @tripthreads/core
jest.mock('@tripthreads/core', () => ({
  deleteTrip: jest.fn(),
}))

describe('DeleteTripConfirmation', () => {
  const mockProps = {
    tripId: 'trip-1',
    tripName: 'Paris Adventure',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with trip name displayed', () => {
    render(<DeleteTripConfirmation {...mockProps} />)

    expect(screen.getAllByText(/delete trip/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/paris adventure/i)).toBeInTheDocument()
  })

  it('shows cascading delete warnings', () => {
    render(<DeleteTripConfirmation {...mockProps} />)

    expect(screen.getByText(/all itinerary items/i)).toBeInTheDocument()
    expect(screen.getByText(/all expenses and split records/i)).toBeInTheDocument()
    expect(screen.getByText(/all media files/i)).toBeInTheDocument()
    expect(screen.getByText(/all participant records/i)).toBeInTheDocument()
  })

  it('delete button is disabled when confirm text is empty', () => {
    render(<DeleteTripConfirmation {...mockProps} />)

    const deleteButton = screen.getByRole('button', { name: /delete trip/i })
    expect(deleteButton).toBeDisabled()
  })

  it('delete button is disabled when confirm text does not match', async () => {
    const user = userEvent.setup()
    render(<DeleteTripConfirmation {...mockProps} />)

    const input = screen.getByPlaceholderText(/enter trip name/i)
    await user.type(input, 'Wrong Name')

    const deleteButton = screen.getByRole('button', { name: /delete trip/i })
    expect(deleteButton).toBeDisabled()
  })

  it('delete button is enabled when confirm text matches exactly', async () => {
    const user = userEvent.setup()
    render(<DeleteTripConfirmation {...mockProps} />)

    const input = screen.getByPlaceholderText(/enter trip name/i)
    await user.type(input, 'Paris Adventure')

    const deleteButton = screen.getByRole('button', { name: /delete trip/i })
    expect(deleteButton).not.toBeDisabled()
  })

  it('calls deleteTrip with correct trip ID', async () => {
    const user = userEvent.setup()
    ;(deleteTrip as jest.Mock).mockResolvedValueOnce({})

    render(<DeleteTripConfirmation {...mockProps} />)

    // Type correct trip name
    const input = screen.getByPlaceholderText(/enter trip name/i)
    await user.type(input, 'Paris Adventure')

    // Click delete
    const deleteButton = screen.getByRole('button', { name: /delete trip/i })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(deleteTrip).toHaveBeenCalledWith(expect.anything(), 'trip-1')
    })
  })

  it('navigates to /trips after successful deletion', async () => {
    const user = userEvent.setup()
    ;(deleteTrip as jest.Mock).mockResolvedValueOnce({})

    render(<DeleteTripConfirmation {...mockProps} />)

    // Type correct trip name
    const input = screen.getByPlaceholderText(/enter trip name/i)
    await user.type(input, 'Paris Adventure')

    // Click delete
    const deleteButton = screen.getByRole('button', { name: /delete trip/i })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/trips')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('calls onSuccess callback after successful deletion', async () => {
    const user = userEvent.setup()
    const onSuccess = jest.fn()
    ;(deleteTrip as jest.Mock).mockResolvedValueOnce({})

    render(<DeleteTripConfirmation {...mockProps} onSuccess={onSuccess} />)

    // Type correct trip name
    const input = screen.getByPlaceholderText(/enter trip name/i)
    await user.type(input, 'Paris Adventure')

    // Click delete
    const deleteButton = screen.getByRole('button', { name: /delete trip/i })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('displays success toast on successful deletion', async () => {
    const user = userEvent.setup()
    ;(deleteTrip as jest.Mock).mockResolvedValueOnce({})

    render(<DeleteTripConfirmation {...mockProps} />)

    // Type correct trip name
    const input = screen.getByPlaceholderText(/enter trip name/i)
    await user.type(input, 'Paris Adventure')

    // Click delete
    const deleteButton = screen.getByRole('button', { name: /delete trip/i })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Trip deleted',
          description: 'Paris Adventure has been permanently deleted.',
        })
      )
    })
  })

  it('displays error toast on deletion failure', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Failed to delete trip'
    ;(deleteTrip as jest.Mock).mockRejectedValueOnce(new Error(errorMessage))

    render(<DeleteTripConfirmation {...mockProps} />)

    // Type correct trip name
    const input = screen.getByPlaceholderText(/enter trip name/i)
    await user.type(input, 'Paris Adventure')

    // Click delete
    const deleteButton = screen.getByRole('button', { name: /delete trip/i })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error deleting trip',
          description: errorMessage,
          variant: 'destructive',
        })
      )
    })
  })

  it('shows loading state during deletion', async () => {
    const user = userEvent.setup()
    let resolveDelete: (value?: unknown) => void
    ;(deleteTrip as jest.Mock).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveDelete = resolve
        })
    )

    render(<DeleteTripConfirmation {...mockProps} />)

    // Type correct trip name
    const input = screen.getByPlaceholderText(/enter trip name/i)
    await user.type(input, 'Paris Adventure')

    // Click delete
    const deleteButton = screen.getByRole('button', { name: /delete trip/i })
    await user.click(deleteButton)

    // Should show loading spinner and disable button
    await waitFor(() => {
      expect(deleteButton).toBeDisabled()
    })

    // Resolve the promise
    resolveDelete!()

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled()
    })
  })

  it('disables input during deletion', async () => {
    const user = userEvent.setup()
    let resolveDelete: (value?: unknown) => void
    ;(deleteTrip as jest.Mock).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveDelete = resolve
        })
    )

    render(<DeleteTripConfirmation {...mockProps} onCancel={jest.fn()} />)

    // Type correct trip name
    const input = screen.getByPlaceholderText(/enter trip name/i)
    await user.type(input, 'Paris Adventure')

    // Click delete
    const deleteButton = screen.getByRole('button', { name: /delete trip/i })
    await user.click(deleteButton)

    // Should disable input and buttons
    await waitFor(() => {
      expect(input).toBeDisabled()
      expect(deleteButton).toBeDisabled()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    })

    // Resolve the promise
    resolveDelete!()

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled()
    })
  })

  it('calls onCancel and clears input when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = jest.fn()

    render(<DeleteTripConfirmation {...mockProps} onCancel={onCancel} />)

    // Type some text
    const input = screen.getByPlaceholderText(/enter trip name/i)
    await user.type(input, 'Paris')

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(onCancel).toHaveBeenCalled()
    expect(input).toHaveValue('')
  })

  it('renders without cancel button when onCancel is not provided', () => {
    render(<DeleteTripConfirmation {...mockProps} />)

    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete trip/i })).toBeInTheDocument()
  })

  it('renders warning icon', () => {
    render(<DeleteTripConfirmation {...mockProps} />)

    // The AlertTriangle icon should be in the document (heading with role)
    const heading = screen.getByRole('heading', { name: /delete trip/i })
    expect(heading).toBeInTheDocument()
  })

  it('shows "This action cannot be undone" warning', () => {
    render(<DeleteTripConfirmation {...mockProps} />)

    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument()
    expect(screen.getByText(/this will permanently delete/i)).toBeInTheDocument()
  })

  it('is case-sensitive for trip name confirmation', async () => {
    const user = userEvent.setup()
    render(<DeleteTripConfirmation {...mockProps} />)

    // Type with wrong case
    const input = screen.getByPlaceholderText(/enter trip name/i)
    await user.type(input, 'paris adventure') // lowercase

    const deleteButton = screen.getByRole('button', { name: /delete trip/i })
    expect(deleteButton).toBeDisabled()

    // Type with correct case
    await user.clear(input)
    await user.type(input, 'Paris Adventure')
    expect(deleteButton).not.toBeDisabled()
  })
})
