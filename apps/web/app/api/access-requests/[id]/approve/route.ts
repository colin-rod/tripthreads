/**
 * API Route: Approve Access Request
 *
 * Handles email link clicks to approve access requests.
 * Redirects to the trip page after approval.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const requestId = params.id

    // Get the access request
    const { data: accessRequest, error: requestError } = await supabase
      .from('access_requests')
      .select('*, trip_id, user_id')
      .eq('id', requestId)
      .single()

    if (requestError || !accessRequest) {
      return NextResponse.redirect(new URL('/error?message=Request not found', request.url))
    }

    // Check if user is authenticated and is the trip owner
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      // Redirect to login with return URL
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('returnTo', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Verify user is the trip owner
    const { data: participant, error: participantError } = await supabase
      .from('trip_participants')
      .select('role')
      .eq('trip_id', accessRequest.trip_id)
      .eq('user_id', user.id)
      .single()

    if (participantError || !participant || participant.role !== 'owner') {
      return NextResponse.redirect(
        new URL('/error?message=Only trip organizers can approve requests', request.url)
      )
    }

    // Update the access request status
    const { error: updateRequestError } = await supabase
      .from('access_requests')
      .update({
        status: 'approved',
        responded_at: new Date().toISOString(),
        responded_by: user.id,
      })
      .eq('id', requestId)

    if (updateRequestError) {
      console.error('Error updating access request:', updateRequestError)
      return NextResponse.redirect(new URL('/error?message=Failed to approve request', request.url))
    }

    // Upgrade user role to participant
    const { error: upgradeError } = await supabase
      .from('trip_participants')
      .update({ role: 'participant' })
      .eq('trip_id', accessRequest.trip_id)
      .eq('user_id', accessRequest.user_id)

    if (upgradeError) {
      console.error('Error upgrading user role:', upgradeError)
      return NextResponse.redirect(
        new URL('/error?message=Failed to upgrade user role', request.url)
      )
    }

    // Redirect to trip page with success message
    const tripUrl = new URL(`/trips/${accessRequest.trip_id}`, request.url)
    tripUrl.searchParams.set('message', 'Access request approved')
    return NextResponse.redirect(tripUrl)
  } catch (error) {
    console.error('Error in approve route:', error)
    return NextResponse.redirect(
      new URL('/error?message=An unexpected error occurred', request.url)
    )
  }
}
