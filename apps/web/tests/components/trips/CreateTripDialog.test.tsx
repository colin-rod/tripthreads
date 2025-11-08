/**
 * Component Tests: CreateTripDialog
 *
 * Validates the trip creation dialog by covering success, error, calendar constraints,
 * and loading state behaviour.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type React from 'react'

import type { CreateTripDialog as CreateTripDialogType } from '@/components/features/trips/CreateTripDialog'

const createTripMock = jest.fn()
const createClientMock = jest.fn()

const calendarMocks: Array<{
  disabled?: (date: Date) => boolean
  onSelect?: (date: Date | undefined) => void
}> = []

jest.mock('@/components/ui/calendar', () => {
  return {
    Calendar: (props: {
      disabled?: (date: Date) => boolean
      onSelect?: (date: Date | undefined) => void
    }) => {
      calendarMocks.push({ disabled: props.disabled, onSelect: props.onSelect })
      return <div data-testid={`calendar-mock-${calendarMocks.length}`} />
    },
  }
})

jest.mock('@/components/ui/popover', () => {
  const passthrough = ({
    children,
    ...rest
  }: {
    children?: React.ReactNode
    [key: string]: unknown
  }) => (
    <div data-testid="popover-mock" {...rest}>
      {children}
    </div>
  )
  return {
    Popover: passthrough,
    PopoverTrigger: passthrough,
    PopoverContent: passthrough,
  }
})

const mockRouterPush = jest.fn()

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

const mockToast = jest.fn()

jest.mock('@/components/ui/use-toast', () => ({
  __esModule: true,
  useToast: () => ({
    toast: mockToast,
  }),
}))

jest.mock('@tripthreads/core', () => {
  const actual = jest.requireActual('@tripthreads/core')
  const { z } = jest.requireActual('zod')
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
          date => {
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
      owner_id: z.union([z.string().uuid('Invalid owner ID'), z.literal('')]).optional(),
      cover_image_url: z.string().url('Invalid image URL').optional().nullable(),
    })
    .refine(
      data => {
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
    calendarMocks.length = 0
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

    await waitFor(() => expect(calendarMocks.length).toBe(2))

    const nameInput = screen.getByLabelText(/trip name/i)
    await user.type(nameInput, 'Alpine Adventure')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 1)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 5)

    act(() => {
      calendarMocks[0].onSelect?.(startDate)
      calendarMocks[1].onSelect?.(endDate)
    })

    const submitButton = screen.getByRole('button', { name: /create trip/i })
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

  it('shows a destructive toast and keeps the dialog open when authentication fails', async () => {
    const user = userEvent.setup()
    const onOpenChange = jest.fn()

    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Auth error'),
    })

    render(<CreateTripDialog open={true} onOpenChange={onOpenChange} />)

    await waitFor(() => expect(calendarMocks.length).toBe(2))

    const nameInput = screen.getByLabelText(/trip name/i)
    await user.type(nameInput, 'Weekend Escape')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 1)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 2)

    act(() => {
      calendarMocks[0].onSelect?.(startDate)
      calendarMocks[1].onSelect?.(endDate)
    })

    const submitButton = screen.getByRole('button', { name: /create trip/i })
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    const form = submitButton.closest('form')
    expect(form).not.toBeNull()

    await act(async () => {
      fireEvent.submit(form!)
    })

    await waitFor(() => expect(createClientMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mockGetUser).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mockToast).toHaveBeenCalled())

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error creating trip',
        variant: 'destructive',
      })
    )

    expect(createTripMock).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
      expect(cancelButton).not.toBeDisabled()
      expect(nameInput).not.toBeDisabled()
    })
  })

  it('prevents selecting dates in the past for both calendars', async () => {
    const onOpenChange = jest.fn()

    render(<CreateTripDialog open={true} onOpenChange={onOpenChange} />)

    await waitFor(() => expect(calendarMocks.length).toBe(2))

    const [startCalendar, endCalendar] = calendarMocks

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    expect(startCalendar.disabled?.(yesterday)).toBe(true)
    expect(startCalendar.disabled?.(today)).toBe(false)

    expect(endCalendar.disabled?.(yesterday)).toBe(true)
    expect(endCalendar.disabled?.(today)).toBe(false)

    const futureStart = new Date(today)
    futureStart.setDate(futureStart.getDate() + 3)
    act(() => {
      startCalendar.onSelect?.(futureStart)
    })

    const beforeStart = new Date(futureStart)
    beforeStart.setDate(beforeStart.getDate() - 1)
    const afterStart = new Date(futureStart)
    afterStart.setDate(afterStart.getDate() + 2)

    expect(endCalendar.disabled?.(beforeStart)).toBe(true)
    expect(endCalendar.disabled?.(afterStart)).toBe(false)
  })
})
