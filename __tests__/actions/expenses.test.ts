jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}))

jest.mock('@tripthreads/core', () => {
  const actual = jest.requireActual('@tripthreads/core')
  return {
    ...actual,
    getFxRate: jest.fn(),
  }
})

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import {
  assertTripParticipant,
  resolvePayer,
  lookupFxRate,
  buildExpenseParticipants,
  createExpense,
  type CreateExpenseInput,
} from '../../apps/web/app/actions/expenses'
import { captureException, captureMessage } from '@sentry/nextjs'
import { getFxRate } from '@tripthreads/core'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type SupabaseMock = Record<string, unknown>

const mockedGetFxRate = getFxRate as jest.MockedFunction<typeof getFxRate>
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockedCaptureException = captureException as jest.MockedFunction<typeof captureException>
const mockedCaptureMessage = captureMessage as jest.MockedFunction<typeof captureMessage>

function createParticipantSupabaseMock(
  overrides: Partial<{
    user: { id: string } | null
    authError: unknown
    participant: { id: string; role: string } | null
    participantError: unknown
  }> = {}
): SupabaseMock {
  const {
    user = { id: 'user-1' },
    authError = null,
    participant = { id: 'participant-1', role: 'editor' },
    participantError = null,
  } = overrides

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: participant,
        error: participantError,
      }),
    }),
  }
}

function createFxSupabaseMock(response: {
  data: { base_currency?: string } | null
  error: unknown
}): SupabaseMock {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(response),
    }),
  }
}

describe('assertTripParticipant', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns the authenticated user when they are an editor', async () => {
    const supabase = createParticipantSupabaseMock()

    const result = await assertTripParticipant(supabase as any, 'trip-1')

    expect(result).toEqual({
      user: { id: 'user-1' },
      participant: { id: 'participant-1', role: 'editor' },
    })
  })

  it('rejects viewer participants', async () => {
    const supabase = createParticipantSupabaseMock({
      participant: { id: 'participant-1', role: 'viewer' },
    })

    const result = await assertTripParticipant(supabase as any, 'trip-1')

    expect(result).toEqual({ error: 'Viewers cannot add expenses' })
  })

  it('rejects unauthenticated requests', async () => {
    const supabase = createParticipantSupabaseMock({
      user: null,
      authError: new Error('no session'),
    })

    const result = await assertTripParticipant(supabase as any, 'trip-1')

    expect(result).toEqual({ error: 'Authentication required' })
  })

  it('rejects users not on the trip', async () => {
    const supabase = createParticipantSupabaseMock({
      participant: null,
      participantError: new Error('not found'),
    })

    const result = await assertTripParticipant(supabase as any, 'trip-1')

    expect(result).toEqual({
      error: 'You must be a participant of this trip to add expenses',
    })
  })
})

describe('resolvePayer', () => {
  const tripParticipants = [
    { user_id: 'user-1', full_name: 'Alice Example' },
    { user_id: 'user-2', full_name: 'Bob Example' },
  ]

  it('falls back to the default payer when none is provided', () => {
    const result = resolvePayer(null, {
      defaultPayerId: 'user-1',
      tripParticipants,
    })

    expect(result).toEqual({ payerId: 'user-1' })
  })

  it('resolves a payer by display name', () => {
    const result = resolvePayer('Bob Example', {
      defaultPayerId: 'user-1',
      tripParticipants,
    })

    expect(result).toEqual({ payerId: 'user-2' })
  })

  it('returns an error when the payer is unknown', () => {
    const result = resolvePayer('Unknown Person', {
      defaultPayerId: 'user-1',
      tripParticipants,
    })

    expect(result).toEqual({
      payerId: 'user-1',
      error: 'Payer "Unknown Person" is not a participant in this trip',
    })
  })
})

describe('lookupFxRate', () => {
  const baseInput = {
    tripId: 'trip-1',
    currency: 'USD',
    date: '2023-01-01T00:00:00.000Z',
    amount: 1234,
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('propagates trip lookup failures', async () => {
    const supabase = createFxSupabaseMock({ data: null, error: new Error('missing trip') })

    const result = await lookupFxRate(supabase as any, baseInput)

    expect(result).toEqual({
      fxRate: null,
      baseCurrency: 'EUR',
      error: 'Failed to fetch trip details',
    })
  })

  it('skips FX lookup when currencies match', async () => {
    const supabase = createFxSupabaseMock({ data: { base_currency: 'USD' }, error: null })

    const result = await lookupFxRate(supabase as any, baseInput)

    expect(result).toEqual({ fxRate: null, baseCurrency: 'USD' })
    expect(mockedGetFxRate).not.toHaveBeenCalled()
  })

  it('returns the fetched FX rate when available', async () => {
    mockedGetFxRate.mockResolvedValueOnce(1.23)
    const supabase = createFxSupabaseMock({ data: { base_currency: 'EUR' }, error: null })

    const result = await lookupFxRate(supabase as any, baseInput)

    expect(result).toEqual({ fxRate: 1.23, baseCurrency: 'EUR' })
    expect(mockedGetFxRate).toHaveBeenCalled()
  })

  it('logs a warning when the FX rate is missing', async () => {
    mockedGetFxRate.mockResolvedValueOnce(null)
    const supabase = createFxSupabaseMock({ data: { base_currency: 'EUR' }, error: null })

    const result = await lookupFxRate(supabase as any, baseInput)

    expect(result).toEqual({ fxRate: null, baseCurrency: 'EUR' })
    expect(mockedCaptureMessage).toHaveBeenCalled()
  })

  it('captures exceptions raised by the FX lookup', async () => {
    const failure = new Error('network down')
    mockedGetFxRate.mockRejectedValueOnce(failure)
    const supabase = createFxSupabaseMock({ data: { base_currency: 'EUR' }, error: null })

    const result = await lookupFxRate(supabase as any, baseInput)

    expect(result).toEqual({ fxRate: null, baseCurrency: 'EUR' })
    expect(mockedCaptureException).toHaveBeenCalledWith(failure, expect.any(Object))
  })
})

describe('buildExpenseParticipants', () => {
  const tripParticipants = [
    { user_id: 'user-1', full_name: 'Alice Example' },
    { user_id: 'user-2', full_name: 'Bob Example' },
    { user_id: 'user-3', full_name: 'Charlie Example' },
  ]

  const baseInput: CreateExpenseInput = {
    tripId: 'trip-1',
    amount: 301,
    currency: 'USD',
    description: 'Dinner',
    category: 'food',
    payer: null,
    splitType: 'equal',
    splitCount: null,
    participants: null,
    customSplits: null,
    percentageSplits: null,
    date: '2023-01-01T00:00:00.000Z',
  }

  it('builds equal split participants with remainders applied to the first entry', () => {
    const input: CreateExpenseInput = {
      ...baseInput,
      participants: ['Alice Example', 'Bob Example'],
    }

    const result = buildExpenseParticipants({
      expenseId: 'expense-1',
      input,
      tripParticipants,
    })

    expect(result.error).toBeUndefined()
    expect(result.participants).toEqual([
      {
        expense_id: 'expense-1',
        user_id: 'user-1',
        share_amount: 151,
        share_type: 'equal',
        share_value: null,
      },
      {
        expense_id: 'expense-1',
        user_id: 'user-2',
        share_amount: 150,
        share_type: 'equal',
        share_value: null,
      },
    ])
  })

  it('supports percentage based splits', () => {
    const input: CreateExpenseInput = {
      ...baseInput,
      splitType: 'percentage',
      percentageSplits: [
        { name: 'Alice Example', percentage: 30 },
        { name: 'Bob Example', percentage: 70 },
      ],
    }

    const result = buildExpenseParticipants({
      expenseId: 'expense-1',
      input,
      tripParticipants,
    })

    expect(result.error).toBeUndefined()
    expect(result.participants).toEqual([
      {
        expense_id: 'expense-1',
        user_id: 'user-1',
        share_amount: 90,
        share_type: 'percentage',
        share_value: 30,
      },
      {
        expense_id: 'expense-1',
        user_id: 'user-2',
        share_amount: 211,
        share_type: 'percentage',
        share_value: 70,
      },
    ])
  })

  it('validates custom split totals', () => {
    const input: CreateExpenseInput = {
      ...baseInput,
      splitType: 'custom',
      customSplits: [{ name: 'Alice Example', amount: 200 }],
    }

    const result = buildExpenseParticipants({
      expenseId: 'expense-1',
      input,
      tripParticipants,
    })

    expect(result).toEqual({
      participants: [],
      error: 'Participant shares (200) do not sum to expense total (301)',
    })
  })

  it('returns an error when a participant cannot be resolved', () => {
    const input: CreateExpenseInput = {
      ...baseInput,
      participants: ['Unknown'],
    }

    const result = buildExpenseParticipants({
      expenseId: 'expense-1',
      input,
      tripParticipants,
    })

    expect(result).toEqual({
      participants: [],
      error: 'Participant "Unknown" is not in this trip',
    })
  })
})

describe('createExpense integration', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  function createExpenseSupabaseMock() {
    const insertedExpenses: any[] = []
    const insertedParticipants: any[] = []
    const tripParticipantsRows = [
      { user_id: 'user-1', users: { full_name: 'Alice Example' } },
      { user_id: 'user-2', users: { full_name: 'Bob Example' } },
    ]

    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === 'trip_participants') {
          return {
            select: jest.fn((columns: string) => {
              if (columns === 'id, role') {
                const builder = {
                  eq: jest.fn().mockReturnThis(),
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'participant-1', role: 'editor' },
                    error: null,
                  }),
                }
                return builder
              }

              if (columns === 'user_id, users!user_id(full_name)') {
                return {
                  eq: jest.fn().mockResolvedValue({
                    data: tripParticipantsRows,
                    error: null,
                  }),
                }
              }

              throw new Error(`Unexpected select: ${columns}`)
            }),
          }
        }

        if (table === 'trips') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { base_currency: 'EUR' },
              error: null,
            }),
          }
        }

        if (table === 'expenses') {
          return {
            insert: jest.fn((data: any) => {
              insertedExpenses.push(data)
              const expense = { id: 'expense-1', ...data }
              return {
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: expense, error: null }),
              }
            }),
            delete: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ error: null }),
            })),
          }
        }

        if (table === 'expense_participants') {
          return {
            insert: jest.fn((rows: any[]) => {
              insertedParticipants.push(...rows)
              return Promise.resolve({ error: null })
            }),
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }),
    }

    return { supabase, insertedExpenses, insertedParticipants }
  }

  it('creates an expense and associated participants', async () => {
    const { supabase, insertedExpenses, insertedParticipants } = createExpenseSupabaseMock()
    mockedCreateClient.mockResolvedValueOnce(supabase as any)
    mockedGetFxRate.mockResolvedValueOnce(1.35)

    const input: CreateExpenseInput = {
      tripId: 'trip-1',
      amount: 301,
      currency: 'USD',
      description: 'Dinner',
      category: 'food',
      payer: null,
      splitType: 'equal',
      splitCount: null,
      participants: ['Alice Example', 'Bob Example'],
      customSplits: null,
      percentageSplits: null,
      date: '2023-01-01T00:00:00.000Z',
    }

    const result = await createExpense(input)

    expect(result.success).toBe(true)
    expect(insertedExpenses).toHaveLength(1)
    expect(insertedExpenses[0]).toMatchObject({
      payer_id: 'user-1',
      fx_rate: 1.35,
    })
    expect(insertedParticipants).toEqual([
      {
        expense_id: 'expense-1',
        user_id: 'user-1',
        share_amount: 151,
        share_type: 'equal',
        share_value: null,
      },
      {
        expense_id: 'expense-1',
        user_id: 'user-2',
        share_amount: 150,
        share_type: 'equal',
        share_value: null,
      },
    ])
    expect(revalidatePath).toHaveBeenCalledWith('/trips/trip-1')
    expect(revalidatePath).toHaveBeenCalledWith('/trips/trip-1/expenses')
  })
})
