/**
 * Trip CRUD operations
 *
 * Supabase queries for managing trips.
 * All operations respect Row-Level Security (RLS) policies.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@tripthreads/core'

type TripInsert = Database['public']['Tables']['trips']['Insert']
type TripUpdate = Database['public']['Tables']['trips']['Update']

/**
 * Get all trips the current user is a participant in
 *
 * Returns trips sorted by start_date (descending - upcoming trips first).
 * Includes participant count and owner information.
 *
 * @param supabase - Authenticated Supabase client
 * @returns Array of trips with participants
 * @throws Error if query fails
 */
export async function getUserTrips(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('trips')
    .select(
      `
      *,
      owner:profiles!owner_id (
        id,
        full_name,
        avatar_url
      ),
      trip_participants (
        id,
        role,
        user:profiles!user_id (
          id,
          full_name,
          avatar_url
        )
      )
    `
    )
    .order('start_date', { ascending: false })

  if (error) {
    console.error('Error fetching user trips:', error)
    throw new Error(`Failed to fetch trips: ${error.message}`)
  }

  return data
}

/**
 * Get a single trip by ID
 *
 * Returns full trip details including owner and all participants.
 * RLS ensures user can only access trips they're a participant in.
 *
 * @param supabase - Authenticated Supabase client
 * @param tripId - UUID of the trip
 * @returns Trip with owner and participants
 * @throws Error if trip not found or user lacks access
 */
export async function getTripById(supabase: SupabaseClient<Database>, tripId: string) {
  const { data, error } = await supabase
    .from('trips')
    .select(
      `
      *,
      owner:profiles!owner_id (
        id,
        full_name,
        avatar_url,
        email
      ),
      trip_participants (
        id,
        role,
        joined_at,
        join_start_date,
        join_end_date,
        user:profiles!user_id (
          id,
          full_name,
          avatar_url,
          email
        )
      )
    `
    )
    .eq('id', tripId)
    .single()

  if (error) {
    console.error('Error fetching trip:', error)
    if (error.code === 'PGRST116') {
      throw new Error('Trip not found or you do not have access')
    }
    throw new Error(`Failed to fetch trip: ${error.message}`)
  }

  return data
}

/**
 * Create a new trip
 *
 * Automatically adds the owner as a participant with 'owner' role.
 * This is a two-step operation:
 * 1. Insert trip
 * 2. Insert trip_participant record for owner
 *
 * @param supabase - Authenticated Supabase client
 * @param trip - Trip data (owner_id must match auth.uid())
 * @returns Created trip with ID
 * @throws Error if creation fails or RLS blocks operation
 */
export async function createTrip(supabase: SupabaseClient<Database>, trip: TripInsert) {
  // Step 1: Insert trip
  const { data: tripData, error: tripError } = await supabase
    .from('trips')
    .insert(trip)
    .select()
    .single()

  if (tripError) {
    console.error('Error creating trip:', tripError)
    if (tripError.code === '23514') {
      // Check constraint violation
      throw new Error('Invalid date range: end date must be on or after start date')
    }
    throw new Error(`Failed to create trip: ${tripError.message}`)
  }

  // Step 2: Add owner as participant
  const { error: participantError } = await supabase.from('trip_participants').insert({
    trip_id: tripData.id,
    user_id: trip.owner_id,
    role: 'owner',
    invited_by: trip.owner_id,
    joined_at: new Date().toISOString(),
  })

  if (participantError) {
    console.error('Error adding owner as participant:', participantError)
    // Try to clean up the trip if participant insert fails
    await supabase.from('trips').delete().eq('id', tripData.id)
    throw new Error(`Failed to create trip: ${participantError.message}`)
  }

  return tripData
}

/**
 * Update an existing trip
 *
 * Only the trip owner can update trip details (enforced by RLS).
 * Automatically updates the updated_at timestamp.
 *
 * @param supabase - Authenticated Supabase client
 * @param tripId - UUID of the trip to update
 * @param updates - Partial trip data to update
 * @returns Updated trip
 * @throws Error if update fails or user is not the owner
 */
export async function updateTrip(
  supabase: SupabaseClient<Database>,
  tripId: string,
  updates: TripUpdate
) {
  const { data, error } = await supabase
    .from('trips')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tripId)
    .select()
    .single()

  if (error) {
    console.error('Error updating trip:', error)
    if (error.code === 'PGRST116') {
      throw new Error('Trip not found or you are not the owner')
    }
    if (error.code === '23514') {
      throw new Error('Invalid date range: end date must be on or after start date')
    }
    throw new Error(`Failed to update trip: ${error.message}`)
  }

  return data
}

/**
 * Delete a trip
 *
 * Only the trip owner can delete trips (enforced by RLS).
 * Cascades to all related data:
 * - trip_participants
 * - itinerary_items
 * - expenses (and expense_participants)
 * - media_files
 *
 * @param supabase - Authenticated Supabase client
 * @param tripId - UUID of the trip to delete
 * @throws Error if deletion fails or user is not the owner
 */
export async function deleteTrip(supabase: SupabaseClient<Database>, tripId: string) {
  const { error } = await supabase.from('trips').delete().eq('id', tripId)

  if (error) {
    console.error('Error deleting trip:', error)
    if (error.code === 'PGRST116') {
      throw new Error('Trip not found or you are not the owner')
    }
    throw new Error(`Failed to delete trip: ${error.message}`)
  }
}

/**
 * Check if current user is the owner of a trip
 *
 * @param supabase - Authenticated Supabase client
 * @param tripId - UUID of the trip
 * @returns True if user is the owner, false otherwise
 */
export async function isTripOwner(
  supabase: SupabaseClient<Database>,
  tripId: string
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return false

  const { data, error } = await supabase.from('trips').select('owner_id').eq('id', tripId).single()

  if (error || !data) return false

  return data.owner_id === user.id
}
