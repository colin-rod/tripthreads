'use server'

/**
 * Server Actions for Expense Management
 *
 * Handles expense creation, updates, and deletion with proper RLS enforcement.
 * Includes participant resolution (name → user_id) and split calculation.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
async function resolveParticipantId(
  _supabase: unknown,
  _tripId: string,
  identifier: string,
  tripParticipants: TripParticipant[]
): Promise<string | null> {
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

/**
 * Get all trip participants with user details
 */
async function getTripParticipants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string
): Promise<TripParticipant[]> {
  const { data, error } = await supabase
    .from('trip_participants')
    .select('user_id, users!inner(full_name)')
    .eq('trip_id', tripId)

  if (error) {
    throw new Error(`Failed to fetch trip participants: ${error.message}`)
  }

  return data.map(p => ({
    user_id: p.user_id,
    full_name: (p.users as { full_name: string }).full_name,
  }))
}

export async function createExpense(input: CreateExpenseInput) {
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
      .eq('trip_id', input.tripId)
      .eq('user_id', user.id)
      .single()

    if (participantError || !participant) {
      return {
        success: false,
        error: 'You must be a participant of this trip to add expenses',
      }
    }

    // Viewers cannot add expenses
    if (participant.role === 'viewer') {
      return {
        success: false,
        error: 'Viewers cannot add expenses',
      }
    }

    // Get all trip participants for resolution
    const tripParticipants = await getTripParticipants(supabase, input.tripId)

    // Resolve payer
    let payerId = user.id // Default to current user
    if (input.payer) {
      const resolved = await resolveParticipantId(
        supabase,
        input.tripId,
        input.payer,
        tripParticipants
      )
      if (!resolved) {
        return {
          success: false,
          error: `Payer "${input.payer}" is not a participant in this trip`,
        }
      }
      payerId = resolved
    }

    // Create expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        trip_id: input.tripId,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        category: input.category || 'other',
        payer_id: payerId,
        date: input.date || new Date().toISOString(),
        created_by: user.id,
      })
      .select()
      .single()

    if (expenseError) {
      console.error('Error creating expense:', expenseError)
      return {
        success: false,
        error: 'Failed to create expense',
      }
    }

    // Create expense participants based on split logic
    const expenseParticipants: Array<{
      expense_id: string
      user_id: string
      share_amount: number
      share_type: string
      share_value: number | null
    }> = []

    if (input.splitType === 'equal') {
      // Equal split among specified participants or split count
      let participantIds: string[] = []

      if (input.participants && input.participants.length > 0) {
        // Resolve participant names/ids
        for (const p of input.participants) {
          const resolved = await resolveParticipantId(supabase, input.tripId, p, tripParticipants)
          if (!resolved) {
            // Rollback expense
            await supabase.from('expenses').delete().eq('id', expense.id)
            return {
              success: false,
              error: `Participant "${p}" is not in this trip`,
            }
          }
          participantIds.push(resolved)
        }
      } else if (input.splitCount) {
        // Use first N trip participants
        participantIds = tripParticipants.slice(0, input.splitCount).map(p => p.user_id)
      } else {
        // Default to all trip participants
        participantIds = tripParticipants.map(p => p.user_id)
      }

      const shareAmount = Math.floor(input.amount / participantIds.length)
      const remainder = input.amount - shareAmount * participantIds.length

      participantIds.forEach((userId, index) => {
        expenseParticipants.push({
          expense_id: expense.id,
          user_id: userId,
          share_amount: shareAmount + (index === 0 ? remainder : 0), // Give remainder to first
          share_type: 'equal',
          share_value: null,
        })
      })
    } else if (input.splitType === 'percentage' && input.percentageSplits) {
      // Percentage split
      let totalAssigned = 0

      for (let i = 0; i < input.percentageSplits.length; i++) {
        const split = input.percentageSplits[i]
        const userId = await resolveParticipantId(
          supabase,
          input.tripId,
          split.name,
          tripParticipants
        )

        if (!userId) {
          await supabase.from('expenses').delete().eq('id', expense.id)
          return {
            success: false,
            error: `Participant "${split.name}" is not in this trip`,
          }
        }

        // For last participant, assign remaining to avoid rounding errors
        let shareAmount: number
        if (i === input.percentageSplits.length - 1) {
          shareAmount = input.amount - totalAssigned
        } else {
          shareAmount = Math.floor((input.amount * split.percentage) / 100)
          totalAssigned += shareAmount
        }

        expenseParticipants.push({
          expense_id: expense.id,
          user_id: userId,
          share_amount: shareAmount,
          share_type: 'percentage',
          share_value: split.percentage,
        })
      }
    } else if (input.splitType === 'custom' && input.customSplits) {
      // Custom amount split
      const totalCustom = input.customSplits.reduce((sum, s) => sum + s.amount, 0)

      if (totalCustom !== input.amount) {
        await supabase.from('expenses').delete().eq('id', expense.id)
        return {
          success: false,
          error: `Custom splits (${totalCustom}) do not sum to expense total (${input.amount})`,
        }
      }

      for (const split of input.customSplits) {
        const userId = await resolveParticipantId(
          supabase,
          input.tripId,
          split.name,
          tripParticipants
        )

        if (!userId) {
          await supabase.from('expenses').delete().eq('id', expense.id)
          return {
            success: false,
            error: `Participant "${split.name}" is not in this trip`,
          }
        }

        expenseParticipants.push({
          expense_id: expense.id,
          user_id: userId,
          share_amount: split.amount,
          share_type: 'amount',
          share_value: split.amount,
        })
      }
    }

    // Insert expense participants
    if (expenseParticipants.length > 0) {
      const { error: participantsError } = await supabase
        .from('expense_participants')
        .insert(expenseParticipants)

      if (participantsError) {
        console.error('Error creating participants:', participantsError)
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}
