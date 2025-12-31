/**
 * Participant Limit Check API Endpoint
 *
 * GET /api/trips/[tripId]/participant-limit
 *
 * Purpose: Check if the trip owner can add more participants based on subscription limits
 * Returns: Limit status with current count, limit, and whether user is Pro
 *
 * Used by: InviteDialog component before sending invites
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkParticipantLimit } from '@/lib/subscription/limits'

export async function GET(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tripId } = await params

    if (!tripId) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 })
    }

    // Check participant limit
    const result = await checkParticipantLimit(tripId)

    return NextResponse.json({
      allowed: result.allowed,
      currentCount: result.currentCount,
      limit: result.limit,
      isProUser: result.isProUser,
      reason: result.reason,
    })
  } catch (error) {
    console.error('Error checking participant limit:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check participant limit',
      },
      { status: 500 }
    )
  }
}
