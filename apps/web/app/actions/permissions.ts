'use server'

/**
 * Permissions Server Actions
 *
 * Server actions for handling permission-related operations:
 * - Requesting edit access (viewer → participant)
 * - Approving/rejecting access requests
 * - Upgrading user roles
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Request edit access for a trip (viewer requests to become participant)
 */
export async function requestEditAccess(tripId: string) {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('You must be logged in to request access')
  }

  // Check if user is a viewer on this trip
  const { data: participant, error: participantError } = await supabase
    .from('trip_participants')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .single()

  if (participantError || !participant) {
    throw new Error('You are not a participant of this trip')
  }

  if (participant.role !== 'viewer') {
    throw new Error('You already have edit access to this trip')
  }

  // Check if there's already a pending request
  const { data: existingRequest, error: existingError } = await supabase
    .from('access_requests')
    .select('id, status')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingError) {
    console.error('Error checking existing requests:', existingError)
    throw new Error('Failed to check existing requests')
  }

  if (existingRequest) {
    throw new Error('You already have a pending access request for this trip')
  }

  // Create access request
  const { error: insertError } = await supabase.from('access_requests').insert({
    trip_id: tripId,
    user_id: user.id,
    status: 'pending',
  })

  if (insertError) {
    console.error('Error creating access request:', insertError)
    throw new Error('Failed to create access request')
  }

  // Revalidate trip page
  revalidatePath(`/trips/${tripId}`)

  return { success: true }
}

/**
 * Approve an access request and upgrade user to participant
 */
export async function approveAccessRequest(requestId: string) {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('You must be logged in to approve requests')
  }

  // Get the access request
  const { data: request, error: requestError } = await supabase
    .from('access_requests')
    .select('*, trip_id, user_id')
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    throw new Error('Access request not found')
  }

  // Check if current user is the trip owner
  const { data: participant, error: participantError } = await supabase
    .from('trip_participants')
    .select('role')
    .eq('trip_id', request.trip_id)
    .eq('user_id', user.id)
    .single()

  if (participantError || !participant || participant.role !== 'owner') {
    throw new Error('Only trip owners can approve access requests')
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
    throw new Error('Failed to update access request')
  }

  // Upgrade user role to participant
  const { error: upgradeError } = await supabase
    .from('trip_participants')
    .update({ role: 'participant' })
    .eq('trip_id', request.trip_id)
    .eq('user_id', request.user_id)

  if (upgradeError) {
    console.error('Error upgrading user role:', upgradeError)
    throw new Error('Failed to upgrade user role')
  }

  // Revalidate trip page
  revalidatePath(`/trips/${request.trip_id}`)

  return { success: true }
}

/**
 * Reject an access request
 */
export async function rejectAccessRequest(requestId: string) {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('You must be logged in to reject requests')
  }

  // Get the access request
  const { data: request, error: requestError } = await supabase
    .from('access_requests')
    .select('*, trip_id')
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    throw new Error('Access request not found')
  }

  // Check if current user is the trip owner
  const { data: participant, error: participantError } = await supabase
    .from('trip_participants')
    .select('role')
    .eq('trip_id', request.trip_id)
    .eq('user_id', user.id)
    .single()

  if (participantError || !participant || participant.role !== 'owner') {
    throw new Error('Only trip owners can reject access requests')
  }

  // Update the access request status
  const { error: updateError } = await supabase
    .from('access_requests')
    .update({
      status: 'rejected',
      responded_at: new Date().toISOString(),
      responded_by: user.id,
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('Error updating access request:', updateError)
    throw new Error('Failed to update access request')
  }

  // Revalidate trip page
  revalidatePath(`/trips/${request.trip_id}`)

  return { success: true }
}
