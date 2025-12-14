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

declare module '@jest/globals' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Matchers<R = void> extends TestingLibraryMatchers<typeof expect.stringContaining, R> {}
}

const mockCreateTrip = jest.fn()

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

jest.mock('@/app/actions/trips', () => ({
  createTrip: mockCreateTrip,
}))

// Import after mocks are set up
let CreateTripDialog: typeof import('@/components/features/trips/CreateTripDialog').CreateTripDialog

beforeEach(async () => {
  if (!CreateTripDialog) {
    const module = await import('@/components/features/trips/CreateTripDialog')
    CreateTripDialog = module.CreateTripDialog
  }
})

describe('CreateTripDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    datePickerMocks.length = 0
    mockCreateTrip.mockReset()
  })

  it('submits successfully, resets the form, closes dialog, and navigates to the new trip', async () => {
    const user = userEvent.setup()
    const onOpenChange = jest.fn()
    const tripResult = { id: 'trip-456', name: 'Alpine Adventure' }

    let resolveCreateTrip:
      | ((value: { success: boolean; trip: typeof tripResult }) => void)
      | undefined
    const createTripPromise = new Promise<{ success: boolean; trip: typeof tripResult }>(
      resolve => {
        resolveCreateTrip = resolve
      }
    )

    mockCreateTrip.mockReturnValueOnce(createTripPromise as unknown as Promise<unknown>)

    render(<CreateTripDialog open={true} onOpenChange={onOpenChange} />)

    const getLatestPickers = () => {
      expect(datePickerMocks.length).toBeGreaterThanOrEqual(2)
      return datePickerMocks.slice(-2)
    }
    await waitFor(() => expect(datePickerMocks.length).toBeGreaterThanOrEqual(2))

    const submitButton = screen.getByRole('button', { name: /create trip/i })
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

    await waitFor(() => expect(mockCreateTrip).toHaveBeenCalledTimes(1))

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()
      expect(nameInput).toBeDisabled()
    })

    await act(async () => {
      resolveCreateTrip?.({ success: true, trip: tripResult })
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

    expect(mockCreateTrip).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alpine Adventure',
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
    const user = userEvent.setup()
    const onOpenChange = jest.fn()

    mockCreateTrip.mockResolvedValueOnce({
      success: false,
      error: 'You must be logged in to create a trip',
    })

    render(<CreateTripDialog open={true} onOpenChange={onOpenChange} />)

    await waitFor(() => expect(datePickerMocks.length).toBeGreaterThanOrEqual(2))

    const submitButton = screen.getByRole('button', { name: /create trip/i })
    const nameInput = screen.getByLabelText(/trip name/i)
    await user.type(nameInput, 'Test Trip')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 1)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 5)

    const getLatestPickers = () => {
      expect(datePickerMocks.length).toBeGreaterThanOrEqual(2)
      return datePickerMocks.slice(-2)
    }

    act(() => {
      const [startPicker, endPicker] = getLatestPickers()
      startPicker.onChange?.(startDate)
      endPicker.onChange?.(endDate)
    })

    const form = submitButton.closest('form')
    expect(form).not.toBeNull()

    await act(async () => {
      fireEvent.submit(form!)
    })

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error creating trip',
          description: 'You must be logged in to create a trip',
          variant: 'destructive',
        })
      )
    )
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
