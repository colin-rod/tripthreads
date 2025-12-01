/**
 * Trip CRUD operations
 *
 * Supabase queries for managing trips.
 * All operations respect Row-Level Security (RLS) policies.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

import { logSupabaseError } from '../../../shared/lib/supabase/queries/logging'

type TripInsert = Database['public']['Tables']['trips']['Insert']
type TripUpdate = Database['public']['Tables']['trips']['Update']

// Return types for trip queries
type UserProfile = {
  id: string
  full_name: string
  avatar_url: string | null
  email?: string
}

type TripParticipant = {
  id: string
  role: string
  joined_at?: string
  join_start_date?: string | null
  join_end_date?: string | null
  user: UserProfile
}

export type TripWithParticipants = Database['public']['Tables']['trips']['Row'] & {
  owner: UserProfile
  trip_participants: TripParticipant[]
}

const TRIP_LIST_SELECT = `
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

const TRIP_DETAIL_SELECT = `
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
export async function getUserTrips(
  supabase: SupabaseClient<Database>
): Promise<TripWithParticipants[]> {
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_LIST_SELECT)
    .order('start_date', { ascending: false })

  if (error) {
    logSupabaseError(error, { operation: 'getUserTrips', select: TRIP_LIST_SELECT })
    throw new Error(`Failed to fetch trips: ${error.message}`)
  }

  return data as unknown as TripWithParticipants[]
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
export async function getTripById(
  supabase: SupabaseClient<Database>,
  tripId: string
): Promise<TripWithParticipants> {
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_DETAIL_SELECT)
    .eq('id', tripId)
    .single()

  if (error) {
    logSupabaseError(error, {
      operation: 'getTripById',
      tripId,
      select: TRIP_DETAIL_SELECT,
    })
    if (error.code === 'PGRST116') {
      throw new Error('Trip not found or you do not have access')
    }
    throw new Error(`Failed to fetch trip: ${error.message}`)
  }

  return data as unknown as TripWithParticipants
}

/**
 * Create a new trip
 *
 * Automatically adds the owner as a participant with 'owner' role via database trigger.
 * The on_trip_created trigger calls create_trip_owner_participant() to handle this.
 *
 * @param supabase - Authenticated Supabase client
 * @param trip - Trip data (owner_id must match auth.uid())
 * @returns Created trip with ID
 * @throws Error if creation fails or RLS blocks operation
 */
export async function createTrip(supabase: SupabaseClient<Database>, trip: TripInsert) {
  const { data: tripData, error: tripError } = await supabase
    .from('trips')
    .insert(trip)
    .select()
    .single()

  if (tripError) {
    logSupabaseError(tripError, {
      operation: 'createTrip',
      ownerId: trip.owner_id || undefined,
      select: 'insert into trips returning *',
    })
    if (tripError.code === '23514') {
      // Check constraint violation
      throw new Error('Invalid date range: end date must be on or after start date')
    }
    throw new Error(`Failed to create trip: ${tripError.message}`)
  }

  // Owner is automatically added as participant by database trigger
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
    logSupabaseError(error, {
      operation: 'updateTrip',
      tripId,
      select: 'update trips returning *',
    })
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
    logSupabaseError(error, {
      operation: 'deleteTrip',
      tripId,
      select: 'delete from trips',
    })
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
