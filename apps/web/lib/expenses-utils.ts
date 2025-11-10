/**
 * Expense utility functions
 *
 * Helper functions for expense processing (non-Server Actions)
 */

import {
  calculateExpenseShares,
  type NormalizedSplitConfig,
  type NormalizedSplitParticipant,
} from '@tripthreads/core'

import type { CreateExpenseInput } from '@/app/actions/expenses'

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

  // Try to match by name (case-insensitive)
  const matchedParticipant = tripParticipants.find(
    p => p.full_name.toLowerCase() === identifier.toLowerCase()
  )

  return matchedParticipant ? matchedParticipant.user_id : null
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
  let splitConfig: NormalizedSplitConfig | null = null

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

    splitConfig = {
      totalAmount: input.amount,
      splitType: 'equal',
      participants: participantIds.map(userId => ({ userId })),
    }
  } else if (input.splitType === 'percentage' && input.percentageSplits) {
    const resolvedParticipants: NormalizedSplitParticipant[] = []

    for (const split of input.percentageSplits) {
      const userId = resolveParticipantId(split.name, tripParticipants)

      if (!userId) {
        return {
          participants: expenseParticipants,
          error: `Participant "${split.name}" is not in this trip`,
        }
      }

      resolvedParticipants.push({ userId, shareValue: split.percentage })
    }

    splitConfig = {
      totalAmount: input.amount,
      splitType: 'percentage',
      participants: resolvedParticipants,
    }
  } else if (input.splitType === 'custom' && input.customSplits) {
    const resolvedParticipants: NormalizedSplitParticipant[] = []

    for (const split of input.customSplits) {
      const userId = resolveParticipantId(split.name, tripParticipants)

      if (!userId) {
        return {
          participants: expenseParticipants,
          error: `Participant "${split.name}" is not in this trip`,
        }
      }

      resolvedParticipants.push({ userId, shareValue: split.amount })
    }

    splitConfig = {
      totalAmount: input.amount,
      splitType: 'amount',
      participants: resolvedParticipants,
    }
  }

  if (!splitConfig) {
    return { participants: expenseParticipants }
  }

  try {
    const shares = calculateExpenseShares(splitConfig)

    shares.forEach(share => {
      expenseParticipants.push({
        expense_id: expenseId,
        user_id: share.userId,
        share_amount: share.shareAmount,
        share_type: share.shareType,
        share_value: share.shareValue ?? null,
      })
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to calculate expense shares'
    return { participants: [], error: message }
  }

  return { participants: expenseParticipants }
}
