/**
 * Expense utility functions
 *
 * Helper functions for expense processing (non-Server Actions)
 */

import type { CreateExpenseInput } from '@/app/actions/expenses'
import { matchSingleParticipantName } from '@tripthreads/core'
import type { TripParticipant as CoreTripParticipant } from '@tripthreads/core'

interface TripParticipant {
  user_id: string
  full_name: string
}

interface ExpenseParticipantRecord {
  expense_id: string
  user_id: string
  share_amount: number
  share_type: string
  share_value: number | null
}

/**
 * Resolve a participant identifier (name or user_id) to user_id
 * Uses fuzzy name matching for improved user experience
 * Internal helper function
 */
function resolveParticipantId(
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

  // Try to match by name using fuzzy matching
  const coreParticipants: CoreTripParticipant[] = tripParticipants.map(p => ({
    user_id: p.user_id,
    full_name: p.full_name,
  }))

  const match = matchSingleParticipantName(identifier, coreParticipants, {
    minConfidence: 0.85, // Require high confidence for auto-resolution
  })

  return match ? match.userId : null
}

/**
 * Resolve payer identifier to user ID
 * Exported for testing
 */
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

/**
 * Build expense participant records from input
 * Exported for testing
 */
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
