'use server'

/**
 * Server Actions for Settlement Management
 *
 * Handles marking settlements as paid/settled.
 * Uses Supabase RLS to enforce permissions (only from_user or to_user can mark as paid).
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { markSettlementAsPaid } from '@tripthreads/core'
import type { MarkSettlementPaidInput } from '@tripthreads/core'
import { trackSettlementMarkedPaid } from '@/lib/analytics'

interface MarkSettlementPaidResult {
  success: boolean
  error?: string
}

/**
 * Mark a settlement as paid/settled
 *
 * @param input - Settlement ID and optional note
 * @returns Success status or error message
 */
export async function markSettlementAsPaidAction(
  input: MarkSettlementPaidInput
): Promise<MarkSettlementPaidResult> {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Get the settlement details BEFORE marking as paid (for analytics)
    const { data: settlement, error: fetchError } = await supabase
      .from('settlements')
      .select('trip_id, amount, currency')
      .eq('id', input.settlementId)
      .single()

    if (fetchError || !settlement) {
      throw new Error(
        `Failed to fetch settlement: ${fetchError?.message || 'Settlement not found'}`
      )
    }

    // Mark settlement as paid (RLS will enforce that user is from_user or to_user)
    await markSettlementAsPaid(supabase, input)

    // Track analytics event
    trackSettlementMarkedPaid({
      tripId: settlement.trip_id,
      settlementId: input.settlementId,
      amountCents: settlement.amount,
      currency: settlement.currency,
      userId: user?.id,
    })

    // Revalidate trip page to refresh settlement summary
    revalidatePath(`/trips/${settlement.trip_id}`)
    revalidatePath(`/trips/${settlement.trip_id}/expenses`)

    return { success: true }
  } catch (error) {
    console.error('Failed to mark settlement as paid:', error)

    // Return user-friendly error message
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to mark settlement as paid'

    return {
      success: false,
      error: errorMessage,
    }
  }
}
