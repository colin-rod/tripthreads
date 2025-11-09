'use server'

/**
 * Server Actions for Expense Management
 *
 * Handles expense creation, updates, and deletion with proper RLS enforcement.
 * Includes participant resolution (name → user_id) and split calculation.
 */

import * as Sentry from '@sentry/nextjs'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getFxRate, formatDateForFx, getSettlementSummary } from '@tripthreads/core'
import type { SettlementSummary } from '@tripthreads/core'

export interface CreateExpenseInput {
  tripId: string
  amount: number // in minor units (cents)
  currency: string // ISO 4217 code
  description: string
  category: string | null
  payer: string | null // Name or user_id of payer
  splitType: 'equal' | 'custom' | 'percentage' | 'none'
  splitCount: number | null
  participants: string[] | null // Names or user_ids of participants
  customSplits: { name: string; amount: number }[] | null
  percentageSplits?: { name: string; percentage: number }[] | null
  date?: string // ISO 8601, defaults to now
}

interface TripParticipant {
  user_id: string
  full_name: string
}

/**
 * Resolve a participant identifier (name or user_id) to user_id
 */
export function resolveParticipantId(
  identifier: string,
  tripParticipants: TripParticipant[]
): string | null {
  // Check if it's already a valid UUID (user_id)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(identifier)) {
    // Verify this user is a trip participant
    const participant = tripParticipants.find(p => p.user_id === identifier)
    return participant ? identifier : null
  }

  // Try to match by name (case-insensitive)
  const matchedParticipant = tripParticipants.find(
    p => p.full_name.toLowerCase() === identifier.toLowerCase()
  )

  return matchedParticipant ? matchedParticipant.user_id : null
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

interface AssertTripParticipantSuccess {
  user: { id: string }
  participant: { role: string }
}

type AssertTripParticipantResult =
  | { error: string }
  | (AssertTripParticipantSuccess & { error?: undefined })

export async function assertTripParticipant(
  supabase: SupabaseClient,
  tripId: string
): Promise<AssertTripParticipantResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'Authentication required',
    }
  }

  const { data: participant, error: participantError } = await supabase
    .from('trip_participants')
    .select('id, role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .single()

  if (participantError || !participant) {
    return {
      error: 'You must be a participant of this trip to add expenses',
    }
  }

  if (participant.role === 'viewer') {
    return {
      error: 'Viewers cannot add expenses',
    }
  }

  return {
    user: { id: user.id },
    participant,
  }
}

export function resolvePayer(
  payer: string | null,
  {
    defaultPayerId,
    tripParticipants,
  }: { defaultPayerId: string; tripParticipants: TripParticipant[] }
): { payerId: string; error?: string } {
  if (!payer) {
    return { payerId: defaultPayerId }
  }

  const resolved = resolveParticipantId(payer, tripParticipants)

  if (!resolved) {
    return {
      payerId: defaultPayerId,
      error: `Payer "${payer}" is not a participant in this trip`,
    }
  }

  return { payerId: resolved }
}

export async function lookupFxRate(
  supabase: SupabaseClient,
  input: Pick<CreateExpenseInput, 'tripId' | 'currency' | 'date' | 'amount'>
): Promise<{ fxRate: number | null; baseCurrency: string; error?: string }> {
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('base_currency')
    .eq('id', input.tripId)
    .single()

  if (tripError) {
    console.error('Error fetching trip:', tripError)
    return {
      fxRate: null,
      baseCurrency: 'EUR',
      error: 'Failed to fetch trip details',
    }
  }

  const baseCurrency = trip.base_currency || 'EUR'

  if (input.currency === baseCurrency) {
    return { fxRate: null, baseCurrency }
  }

  const expenseDate = formatDateForFx(input.date || new Date().toISOString())

  try {
    const fxRate = await getFxRate(supabase, baseCurrency, input.currency, expenseDate, {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    })

    if (fxRate === null) {
      console.warn(`FX rate unavailable for ${baseCurrency}→${input.currency} on ${expenseDate}`)

      Sentry.captureMessage(
        `FX rate unavailable: ${baseCurrency}→${input.currency} on ${expenseDate}`,
        {
          level: 'warning',
          tags: {
            feature: 'fx_rates',
            baseCurrency,
            targetCurrency: input.currency,
            date: expenseDate,
          },
          contexts: {
            expense: {
              tripId: input.tripId,
              amount: input.amount,
              currency: input.currency,
            },
          },
        }
      )
    }

    return { fxRate, baseCurrency }
  } catch (error) {
    console.error('FX rate lookup failed:', error)

    Sentry.captureException(error, {
      tags: {
        feature: 'fx_rates',
        baseCurrency,
        targetCurrency: input.currency,
        operation: 'lookup',
      },
      contexts: {
        expense: {
          tripId: input.tripId,
          amount: input.amount,
          currency: input.currency,
          date: expenseDate,
        },
      },
    })

    return { fxRate: null, baseCurrency }
  }
}

interface ExpenseParticipantRecord {
  expense_id: string
  user_id: string
  share_amount: number
  share_type: string
  share_value: number | null
}

export function buildExpenseParticipants({
  expenseId,
  input,
  tripParticipants,
}: {
  expenseId: string
  input: CreateExpenseInput
  tripParticipants: TripParticipant[]
}): { participants: ExpenseParticipantRecord[]; error?: string } {
  const expenseParticipants: ExpenseParticipantRecord[] = []

  if (input.splitType === 'equal') {
    let participantIds: string[] = []

    if (input.participants && input.participants.length > 0) {
      for (const participant of input.participants) {
        const resolved = resolveParticipantId(participant, tripParticipants)
        if (!resolved) {
          return {
            participants: expenseParticipants,
            error: `Participant "${participant}" is not in this trip`,
          }
        }
        participantIds.push(resolved)
      }
    } else if (input.splitCount) {
      participantIds = tripParticipants
        .slice(0, input.splitCount)
        .map(participant => participant.user_id)
    } else {
      participantIds = tripParticipants.map(participant => participant.user_id)
    }

    if (participantIds.length === 0) {
      return {
        participants: expenseParticipants,
        error: 'No participants available for equal split',
      }
    }

    const shareAmount = Math.floor(input.amount / participantIds.length)
    const remainder = input.amount - shareAmount * participantIds.length

    participantIds.forEach((userId, index) => {
      expenseParticipants.push({
        expense_id: expenseId,
        user_id: userId,
        share_amount: shareAmount + (index === 0 ? remainder : 0),
        share_type: 'equal',
        share_value: null,
      })
    })
  } else if (input.splitType === 'percentage' && input.percentageSplits) {
    let totalAssigned = 0

    for (let i = 0; i < input.percentageSplits.length; i++) {
      const split = input.percentageSplits[i]
      const userId = resolveParticipantId(split.name, tripParticipants)

      if (!userId) {
        return {
          participants: expenseParticipants,
          error: `Participant "${split.name}" is not in this trip`,
        }
      }

      let shareAmount: number
      if (i === input.percentageSplits.length - 1) {
        shareAmount = input.amount - totalAssigned
      } else {
        shareAmount = Math.floor((input.amount * split.percentage) / 100)
        totalAssigned += shareAmount
      }

      expenseParticipants.push({
        expense_id: expenseId,
        user_id: userId,
        share_amount: shareAmount,
        share_type: 'percentage',
        share_value: split.percentage,
      })
    }
  } else if (input.splitType === 'custom' && input.customSplits) {
    const totalCustom = input.customSplits.reduce((sum, split) => sum + split.amount, 0)

    if (totalCustom !== input.amount) {
      return {
        participants: expenseParticipants,
        error: `Custom splits (${totalCustom}) do not sum to expense total (${input.amount})`,
      }
    }

    for (const split of input.customSplits) {
      const userId = resolveParticipantId(split.name, tripParticipants)

      if (!userId) {
        return {
          participants: expenseParticipants,
          error: `Participant "${split.name}" is not in this trip`,
        }
      }

      expenseParticipants.push({
        expense_id: expenseId,
        user_id: userId,
        share_amount: split.amount,
        share_type: 'amount',
        share_value: split.amount,
      })
    }
  }

  return { participants: expenseParticipants }
}

/**
 * Get all trip participants with user details
 */
async function getTripParticipants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string
): Promise<TripParticipant[]> {
  const { data, error } = await supabase
    .from('trip_participants')
    .select('user_id, users!user_id(full_name)')
    .eq('trip_id', tripId)

  if (error) {
    throw new Error(`Failed to fetch trip participants: ${error.message}`)
  }

  if (!data) {
    return []
  }

  return data.map(p => ({
    user_id: p.user_id,
    full_name: p.users?.full_name ?? '',
  }))
}

export async function createExpense(input: CreateExpenseInput) {
  const supabase = await createClient()

  try {
    const participantResult = await assertTripParticipant(supabase, input.tripId)

    if ('error' in participantResult && participantResult.error) {
      return { success: false, error: participantResult.error }
    }

    const { user } = participantResult as AssertTripParticipantSuccess

    const tripParticipants = await getTripParticipants(supabase, input.tripId)

    const payerResult = resolvePayer(input.payer, {
      defaultPayerId: user.id,
      tripParticipants,
    })

    if (payerResult.error) {
      return {
        success: false,
        error: payerResult.error,
      }
    }

    const fxRateResult = await lookupFxRate(supabase, {
      tripId: input.tripId,
      currency: input.currency,
      date: input.date,
      amount: input.amount,
    })

    if (fxRateResult.error) {
      return {
        success: false,
        error: fxRateResult.error,
      }
    }

    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        trip_id: input.tripId,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        category: input.category || 'other',
        payer_id: payerResult.payerId,
        date: input.date || new Date().toISOString(),
        fx_rate: fxRateResult.fxRate,
        created_by: user.id,
      })
      .select()
      .single()

    if (expenseError) {
      console.error('Error creating expense:', expenseError)

      // Log to Sentry with context
      Sentry.captureException(expenseError, {
        tags: {
          feature: 'expenses',
          operation: 'create',
        },
        contexts: {
          expense: {
            tripId: input.tripId,
            amount: input.amount,
            currency: input.currency,
            description: input.description,
          },
          supabase: {
            code: expenseError.code,
            details: expenseError.details,
            hint: expenseError.hint,
          },
        },
      })

      return {
        success: false,
        error: 'Failed to create expense',
      }
    }

    const expenseParticipantsResult = buildExpenseParticipants({
      expenseId: expense.id,
      input,
      tripParticipants,
    })

    if (expenseParticipantsResult.error) {
      await supabase.from('expenses').delete().eq('id', expense.id)
      return {
        success: false,
        error: expenseParticipantsResult.error,
      }
    }

    if (expenseParticipantsResult.participants.length > 0) {
      const { error: participantsError } = await supabase
        .from('expense_participants')
        .insert(expenseParticipantsResult.participants)

      if (participantsError) {
        console.error('Error creating participants:', participantsError)

        // Log to Sentry
        Sentry.captureException(participantsError, {
          tags: {
            feature: 'expenses',
            operation: 'create_participants',
          },
          contexts: {
            expense: {
              id: expense.id,
              tripId: input.tripId,
            },
            supabase: {
              code: participantsError.code,
              details: participantsError.details,
              hint: participantsError.hint,
            },
          },
        })

        // Rollback expense
        await supabase.from('expenses').delete().eq('id', expense.id)
        return {
          success: false,
          error: 'Failed to create expense participants',
        }
      }
    }

    // Revalidate trip page
    revalidatePath(`/trips/${input.tripId}`)
    revalidatePath(`/trips/${input.tripId}/expenses`)

    return {
      success: true,
      expense,
    }
  } catch (error) {
    console.error('Unexpected error creating expense:', error)

    // Log to Sentry
    Sentry.captureException(error, {
      tags: {
        feature: 'expenses',
        operation: 'create',
        errorType: 'unexpected',
      },
      contexts: {
        expense: {
          tripId: input.tripId,
          amount: input.amount,
          currency: input.currency,
        },
      },
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Get settlement summary for a trip
 *
 * Calculates net balances and optimized settlement suggestions.
 * Respects RLS policies - only includes expenses visible to current user.
 */
export async function fetchSettlementSummary(
  tripId: string
): Promise<{ success: boolean; summary?: SettlementSummary; error?: string }> {
  const supabase = await createClient()

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
      }
    }

    // Verify user is a participant of the trip
    const { data: participant, error: participantError } = await supabase
      .from('trip_participants')
      .select('id, role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single()

    if (participantError || !participant) {
      return {
        success: false,
        error: 'You must be a participant of this trip to view settlements',
      }
    }

    // Fetch settlement summary (respects RLS and date scoping)
    const summary = await getSettlementSummary(supabase, tripId)

    return {
      success: true,
      summary,
    }
  } catch (error) {
    console.error('Error fetching settlement summary:', error)

    // Log to Sentry
    Sentry.captureException(error, {
      tags: {
        feature: 'settlements',
        operation: 'fetch_summary',
      },
      contexts: {
        trip: {
          tripId,
        },
      },
    })

    return {
      success: false,
      error: 'Failed to fetch settlement summary',
    }
  }
}
