/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditTripForm } from '@/components/features/trips/forms/EditTripForm'
import { updateTrip } from '@tripthreads/core'

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

// Mock updateTrip from @tripthreads/core
jest.mock('@tripthreads/core', () => {
  const { z } = jest.requireActual<typeof import('zod')>('zod')
  return {
    updateTrip: jest.fn(),
    updateTripSchema: z.object({
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      start_date: z.string(),
      end_date: z.string(),
      cover_image_url: z.string().nullable().optional(),
    }),
    cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  }
})

describe('EditTripForm', () => {
  const mockTrip = {
    id: 'trip-1',
    name: 'Paris Adventure',
    description: 'A wonderful trip to Paris',
    start_date: '2024-06-01T12:00:00.000Z',
    end_date: '2024-06-10T12:00:00.000Z',
    cover_image_url: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with pre-populated trip data', () => {
    render(<EditTripForm trip={mockTrip} />)

    expect(screen.getByLabelText(/trip name/i)).toHaveValue('Paris Adventure')
    expect(screen.getByLabelText(/description/i)).toHaveValue('A wonderful trip to Paris')
  })

  it('updates form fields correctly', async () => {
    const user = userEvent.setup()
    render(<EditTripForm trip={mockTrip} />)

    const nameInput = screen.getByLabelText(/trip name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Tokyo Trip')

    expect(nameInput).toHaveValue('Tokyo Trip')
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<EditTripForm trip={mockTrip} />)

    // Clear the trip name (required field)
    const nameInput = screen.getByLabelText(/trip name/i)
    await user.clear(nameInput)

    // Try to submit
    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    // Should show validation error (Zod message for empty string)
    await waitFor(() => {
      expect(screen.getByText(/too small/i)).toBeInTheDocument()
    })

    // Should not call updateTrip
    expect(updateTrip).not.toHaveBeenCalled()
  })

  it('submits form with correct data', async () => {
    const user = userEvent.setup()
    ;(updateTrip as jest.Mock).mockResolvedValueOnce({})

    render(<EditTripForm trip={mockTrip} />)

    // Update trip name
    const nameInput = screen.getByLabelText(/trip name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Trip Name')

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(updateTrip).toHaveBeenCalledWith(
        expect.anything(),
        'trip-1',
        expect.objectContaining({
          name: 'Updated Trip Name',
          description: 'A wonderful trip to Paris',
          start_date: '2024-06-01T12:00:00.000Z',
          end_date: '2024-06-10T12:00:00.000Z',
        })
      )
    })
  })

  it('calls onSuccess callback after successful update', async () => {
    const user = userEvent.setup()
    const onSuccess = jest.fn()
    ;(updateTrip as jest.Mock).mockResolvedValueOnce({})

    render(<EditTripForm trip={mockTrip} onSuccess={onSuccess} />)

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('calls router.refresh after successful update', async () => {
    const user = userEvent.setup()
    ;(updateTrip as jest.Mock).mockResolvedValueOnce({})

    render(<EditTripForm trip={mockTrip} />)

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('calls onCancel callback when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = jest.fn()

    render(<EditTripForm trip={mockTrip} onCancel={onCancel} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(onCancel).toHaveBeenCalled()
  })

  it('displays success toast on successful submission', async () => {
    const user = userEvent.setup()
    ;(updateTrip as jest.Mock).mockResolvedValueOnce({})

    render(<EditTripForm trip={mockTrip} />)

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Trip updated!',
          description: 'Your changes have been saved successfully.',
        })
      )
    })
  })

  it('displays error toast on submission failure', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Failed to update trip'
    ;(updateTrip as jest.Mock).mockRejectedValueOnce(new Error(errorMessage))

    render(<EditTripForm trip={mockTrip} />)

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error updating trip',
          description: errorMessage,
          variant: 'destructive',
        })
      )
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    let resolveUpdate: (value?: unknown) => void
    ;(updateTrip as jest.Mock).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveUpdate = resolve
        })
    )

    render(<EditTripForm trip={mockTrip} />)

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    // Should show loading spinner
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
    })

    // Resolve the promise
    resolveUpdate!()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled()
    })
  })

  it('disables form inputs during submission', async () => {
    const user = userEvent.setup()
    let resolveUpdate: (value?: unknown) => void
    ;(updateTrip as jest.Mock).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveUpdate = resolve
        })
    )

    render(<EditTripForm trip={mockTrip} onCancel={jest.fn()} />)

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    // Should disable all inputs
    await waitFor(() => {
      expect(screen.getByLabelText(/trip name/i)).toBeDisabled()
      expect(screen.getByLabelText(/description/i)).toBeDisabled()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    })

    // Resolve the promise
    resolveUpdate!()

    await waitFor(() => {
      expect(screen.getByLabelText(/trip name/i)).not.toBeDisabled()
    })
  })

  it('renders without cancel button when onCancel is not provided', () => {
    render(<EditTripForm trip={mockTrip} />)

    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })
})
