'use server'

/**
 * Server Actions for Trip Management
 *
 * These actions run on the server and use the server-side Supabase client
 * to ensure proper authentication context for RLS policies.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createTrip as createTripQuery, type CreateTripInput } from '@tripthreads/core'

/**
 * Create a new trip
 *
 * Server action that creates a trip with the current user as owner.
 * Automatically adds the owner as a participant via database trigger.
 *
 * @param input - Trip data (owner_id will be set from auth context)
 * @returns Created trip with ID
 * @throws Error if creation fails or user is not authenticated
 */
export async function createTrip(input: Omit<CreateTripInput, 'owner_id'>) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('You must be logged in to create a trip')
  }

  // Create trip with current user as owner
  const tripData: CreateTripInput = {
    ...input,
    owner_id: user.id,
  }

  try {
    const trip = await createTripQuery(supabase, tripData)

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
