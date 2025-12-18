'use server'

/**
 * Server Actions for Trip Management
 *
 * These actions run on the server and use the server-side Supabase client
 * to ensure proper authentication context for RLS policies.
 */

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createTrip as createTripQuery, type CreateTripInput } from '@tripthreads/core'

/**
 * Create a new trip
 *
 * Server action that creates a trip with the current user as owner.
 * Automatically adds the owner as a participant via database trigger.
 *
 * Uses service role client to bypass RLS since user validation happens
 * in application code. This is safe because we verify the user before
 * setting owner_id.
 *
 * @param input - Trip data (owner_id will be set from auth context)
 * @returns Created trip with ID
 * @throws Error if creation fails or user is not authenticated
 */
export async function createTrip(input: Omit<CreateTripInput, 'owner_id'>) {
  const supabase = await createClient()

  // Validate user with regular client
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error('Auth error in createTrip:', authError)
    throw new Error('You must be logged in to create a trip')
  }

  console.log('Creating trip for user:', user.id)

  // Create trip with current user as owner
  const tripData: CreateTripInput = {
    ...input,
    owner_id: user.id,
  }

  try {
    // Use service client for the insert (bypasses RLS)
    // This is safe because we've already validated the user above
    const serviceClient = createServiceClient()
    const trip = await createTripQuery(serviceClient, tripData)

    // Revalidate trips list
    revalidatePath('/trips')

    return { success: true, trip }
  } catch (error) {
    console.error('Error creating trip:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create trip',
    }
  }
}

/**
 * Remove a participant from a trip
 *
 * Only trip owners can remove participants.
 * Prevents removing the sole owner to avoid orphaning the trip.
 *
 * @param tripId - UUID of the trip
 * @param participantId - UUID of the participant to remove
 * @returns Success/error response
 */
export async function removeParticipant(tripId: string, participantId: string) {
  const supabase = await createClient()

  // Validate user authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be logged in to manage participants',
    }
  }

  try {
    // Check if current user is a trip owner
    const { data: currentParticipant, error: participantError } = await supabase
      .from('trip_participants')
      .select('user_id, role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single()

    if (participantError || !currentParticipant || currentParticipant.role !== 'owner') {
      return {
        success: false,
        error: 'Only trip owners can remove participants',
      }
    }

    // Get all owners for the trip
    const { data: owners, error: ownersError } = await supabase
      .from('trip_participants')
      .select('user_id, role')
      .eq('trip_id', tripId)
      .eq('role', 'owner')

    if (ownersError) {
      return {
        success: false,
        error: ownersError.message,
      }
    }

    // Check if we're trying to remove the sole owner
    const isTargetAnOwner = owners?.some(owner => owner.user_id === participantId)
    if (isTargetAnOwner && owners?.length === 1) {
      return {
        success: false,
        error: 'Cannot remove the sole owner of the trip',
      }
    }

    // Remove the participant
    const { error: deleteError } = await supabase
      .from('trip_participants')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', participantId)
      .maybeSingle()

    if (deleteError) {
      return {
        success: false,
        error: deleteError.message,
      }
    }

    // Revalidate trip page to reflect changes
    revalidatePath(`/trips/${tripId}`)
    revalidatePath('/trips')

    return { success: true }
  } catch (error) {
    console.error('Error removing participant:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove participant',
    }
  }
}

/**
 * Update a participant's role
 *
 * Only trip owners can change participant roles.
 * Prevents demoting the sole owner to avoid orphaning the trip.
 *
 * @param tripId - UUID of the trip
 * @param participantId - UUID of the participant to update
 * @param newRole - New role (owner, participant, or viewer)
 * @returns Success/error response
 */
export async function updateParticipantRole(
  tripId: string,
  participantId: string,
  newRole: 'owner' | 'participant' | 'viewer'
) {
  const supabase = await createClient()

  // Validate user authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be logged in to manage participants',
    }
  }

  // Validate role
  if (!['owner', 'participant', 'viewer'].includes(newRole)) {
    return {
      success: false,
      error: 'Invalid role. Must be owner, participant, or viewer',
    }
  }

  try {
    // Check if current user is a trip owner
    const { data: currentParticipant, error: participantError } = await supabase
      .from('trip_participants')
      .select('user_id, role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single()

    if (participantError || !currentParticipant || currentParticipant.role !== 'owner') {
      return {
        success: false,
        error: 'Only trip owners can change participant roles',
      }
    }

    // Get all owners for the trip
    const { data: owners, error: ownersError } = await supabase
      .from('trip_participants')
      .select('user_id, role')
      .eq('trip_id', tripId)
      .eq('role', 'owner')

    if (ownersError) {
      return {
        success: false,
        error: ownersError.message,
      }
    }

    // Check if we're demoting the sole owner
    const isTargetTheOnlyOwner = owners?.length === 1 && owners[0].user_id === participantId
    if (isTargetTheOnlyOwner && newRole !== 'owner') {
      return {
        success: false,
        error: 'Cannot demote the sole owner of the trip',
      }
    }

    // Update the participant's role
    const { error: updateError } = await supabase
      .from('trip_participants')
      .update({ role: newRole })
      .eq('trip_id', tripId)
      .eq('user_id', participantId)
      .maybeSingle()

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
      }
    }

    // Revalidate trip page to reflect changes
    revalidatePath(`/trips/${tripId}`)
    revalidatePath('/trips')

    return { success: true }
  } catch (error) {
    console.error('Error updating participant role:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update participant role',
    }
  }
}

/**
 * Leave a trip (self-remove)
 *
 * Allows non-owner participants to remove themselves from a trip.
 * Owners can only leave if there are other owners (to prevent orphaning the trip).
 *
 * @param tripId - UUID of the trip to leave
 * @returns Success/error response
 */
export async function leaveTrip(tripId: string) {
  const supabase = await createClient()

  // Validate user authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be logged in to leave a trip',
    }
  }

  try {
    // Get current user's participant record
    const { data: currentParticipant, error: participantError } = await supabase
      .from('trip_participants')
      .select('user_id, role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single()

    if (participantError || !currentParticipant) {
      return {
        success: false,
        error: 'You are not a participant in this trip',
      }
    }

    // If user is an owner, check if they're the sole owner
    if (currentParticipant.role === 'owner') {
      const { data: owners, error: ownersError } = await supabase
        .from('trip_participants')
        .select('user_id, role')
        .eq('trip_id', tripId)
        .eq('role', 'owner')

      if (ownersError) {
        return {
          success: false,
          error: ownersError.message,
        }
      }

      if (owners?.length === 1) {
        return {
          success: false,
          error: 'Cannot leave trip as sole owner. Transfer ownership or delete the trip',
        }
      }
    }

    // Remove participant record
    const { error: deleteError } = await supabase
      .from('trip_participants')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (deleteError) {
      return {
        success: false,
        error: deleteError.message,
      }
    }

    // Revalidate trips list
    revalidatePath('/trips')

    return { success: true }
  } catch (error) {
    console.error('Error leaving trip:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to leave trip',
    }
  }
}
