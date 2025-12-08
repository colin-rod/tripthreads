/**
 * Component Tests: CreateTripDialog
 *
 * Validates the trip creation dialog by covering success, error, calendar constraints,
 * and loading state behaviour.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import '@testing-library/jest-dom'
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type React from 'react'

import type { CreateTripDialog as CreateTripDialogType } from '@/components/features/trips/CreateTripDialog'

declare module '@jest/globals' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Matchers<R = void> extends TestingLibraryMatchers<typeof expect.stringContaining, R> {}
}

const createTripMock = jest.fn()
const createClientMock = jest.fn()

type DatePickerMockProps = {
  disabled?: (date: Date) => boolean
  onChange?: (date: Date | null) => void
}

const datePickerMocks: DatePickerMockProps[] = []

jest.mock('@/components/ui/date-picker', () => ({
  DatePicker: (props: DatePickerMockProps) => {
    datePickerMocks.push(props)
    return <div data-testid={`date-picker-mock-${datePickerMocks.length}`} />
  },
}))

const mockRouterPush = jest.fn()

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

const mockToast = jest.fn()

jest.mock('@/hooks/use-toast', () => ({
  __esModule: true,
  useToast: () => ({
    toast: mockToast,
  }),
}))

jest.mock('@tripthreads/core', () => {
  const actual = jest.requireActual('@tripthreads/core') as Record<string, unknown>
  const { z } = jest.requireActual('zod') as { z: typeof import('zod').z }
  const relaxedCreateTripSchema = z
    .object({
      name: z
        .string()
        .min(1, 'Trip name is required')
        .max(100, 'Trip name must be less than 100 characters')
        .trim(),
      description: z
        .string()
        .max(500, 'Description must be less than 500 characters')
        .optional()
        .nullable(),
      start_date: z
        .string()
        .datetime('Invalid start date format')
        .refine(
          (date: string) => {
            const startDate = new Date(date)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            return startDate >= today
          },
          {
            message: 'Start date cannot be in the past',
          }
        ),
      end_date: z.string().datetime('Invalid end date format'),
      owner_id: z.string().min(1).optional(),
      cover_image_url: z.string().url('Invalid image URL').optional().nullable(),
    })
    .refine(
      (data: { start_date: string; end_date: string }) => {
        const startDate = new Date(data.start_date)
        const endDate = new Date(data.end_date)
        return endDate >= startDate
      },
      {
        message: 'End date must be on or after start date',
        path: ['end_date'],
      }
    )
  return {
    __esModule: true,
    ...actual,
    createTrip: createTripMock,
    createTripSchema: relaxedCreateTripSchema,
  }
})

jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: createClientMock,
}))

// Import after mocks are set up
let CreateTripDialog: typeof CreateTripDialogType
beforeEach(async () => {
  if (!CreateTripDialog) {
    const module = await import('@/components/features/trips/CreateTripDialog')
    CreateTripDialog = module.CreateTripDialog
  }
})

type SupabaseAuthResponse = {
  data: { user: { id: string } | null }
  error: Error | null
}

describe('CreateTripDialog', () => {
  const mockGetUser = jest.fn<() => Promise<SupabaseAuthResponse>>()
  const supabase = { auth: { getUser: mockGetUser } }

  beforeEach(() => {
    jest.clearAllMocks()
    datePickerMocks.length = 0
    createTripMock.mockReset()
    createClientMock.mockReset()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    createClientMock.mockReturnValue(supabase)
  })

  it('submits successfully, resets the form, closes dialog, and navigates to the new trip', async () => {
    const user = userEvent.setup()
    const onOpenChange = jest.fn()
    const tripResult = { id: 'trip-456', name: 'Alpine Adventure' }

    let resolveCreateTrip: ((value: typeof tripResult) => void) | undefined
    const createTripPromise = new Promise<typeof tripResult>(resolve => {
      resolveCreateTrip = resolve
    })

    createTripMock.mockReturnValueOnce(createTripPromise as unknown as Promise<unknown>)

    render(<CreateTripDialog open={true} onOpenChange={onOpenChange} />)

    const getLatestPickers = () => {
      expect(datePickerMocks.length).toBeGreaterThanOrEqual(2)
      return datePickerMocks.slice(-2)
    }
    await waitFor(() => expect(datePickerMocks.length).toBeGreaterThanOrEqual(2))

    const submitButton = screen.getByRole('button', { name: /create trip/i })
    await waitFor(() => expect(mockGetUser).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(submitButton.hasAttribute('disabled')).toBe(false))

    const nameInput = screen.getByLabelText(/trip name/i)
    await user.type(nameInput, 'Alpine Adventure')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 1)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 5)

    act(() => {
      const [startPicker, endPicker] = getLatestPickers()
      expect(typeof startPicker.onChange).toBe('function')
      expect(typeof endPicker.onChange).toBe('function')
      startPicker.onChange?.(startDate)
      endPicker.onChange?.(endDate)
    })

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    const form = submitButton.closest('form')
    expect(form).not.toBeNull()

    await act(async () => {
      fireEvent.submit(form!)
    })

    await waitFor(() => expect(createClientMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mockGetUser).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(createTripMock).toHaveBeenCalledTimes(1))

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()
      expect(nameInput).toBeDisabled()
    })

    await act(async () => {
      resolveCreateTrip?.(tripResult)
      await createTripPromise
    })

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Trip created!',
          description: `${tripResult.name} has been created successfully.`,
        })
      )
    )

    expect(createTripMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        name: 'Alpine Adventure',
        owner_id: 'user-123',
        start_date: expect.any(String),
        end_date: expect.any(String),
      })
    )

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith(`/trips/${tripResult.id}`))

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
      expect(cancelButton).not.toBeDisabled()
      expect(nameInput).not.toBeDisabled()
      expect(nameInput).toHaveValue('')
    })
  })

  it('closes the dialog and shows a destructive toast when authentication fails', async () => {
    const onOpenChange = jest.fn()

    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Auth error'),
    })

    render(<CreateTripDialog open={true} onOpenChange={onOpenChange} />)

    await waitFor(() => expect(mockGetUser).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Authentication required',
          variant: 'destructive',
        })
      )
    )
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(createTripMock).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('prevents selecting dates in the past for both calendars', async () => {
    const onOpenChange = jest.fn()

    render(<CreateTripDialog open={true} onOpenChange={onOpenChange} />)

    await waitFor(() => expect(datePickerMocks.length).toBeGreaterThanOrEqual(2))

    const getDatePickers = () => {
      expect(datePickerMocks.length).toBeGreaterThanOrEqual(2)
      return datePickerMocks.slice(-2)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    let [startCalendar, endCalendar] = getDatePickers()

    expect(startCalendar.disabled?.(yesterday)).toBe(true)
    expect(startCalendar.disabled?.(today)).toBe(false)

    expect(endCalendar.disabled?.(yesterday)).toBe(true)
    expect(endCalendar.disabled?.(today)).toBe(false)

    const futureStart = new Date(today)
    futureStart.setDate(futureStart.getDate() + 3)
    act(() => {
      ;[startCalendar, endCalendar] = getDatePickers()
      startCalendar.onChange?.(futureStart)
    })

    const beforeStart = new Date(futureStart)
    beforeStart.setDate(beforeStart.getDate() - 1)
    const afterStart = new Date(futureStart)
    afterStart.setDate(afterStart.getDate() + 2)
    ;[, endCalendar] = getDatePickers()

    expect(endCalendar.disabled?.(beforeStart)).toBe(true)
    expect(endCalendar.disabled?.(afterStart)).toBe(false)
  })
})
