'use server'

/**
 * Server Actions for Itinerary Management
 *
 * Handles itinerary item creation, updates, and deletion with proper RLS enforcement.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface CreateItineraryItemInput {
  tripId: string
  type: 'flight' | 'stay' | 'activity'
  title: string
  description?: string
  startTime: string // ISO 8601
  endTime?: string // ISO 8601
  location?: string
}

export async function createItineraryItem(input: CreateItineraryItemInput) {
  const supabase = await createClient()

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
      }
    }

    // Verify user is a participant of the trip
    const { data: participant, error: participantError } = await supabase
      .from('trip_participants')
      .select('id, role')
      .eq('trip_id', input.tripId)
      .eq('user_id', user.id)
      .single()

    if (participantError || !participant) {
      return {
        success: false,
        error: 'You must be a participant of this trip to add itinerary items',
      }
    }

    // Viewers cannot add itinerary items
    if (participant.role === 'viewer') {
      return {
        success: false,
        error: 'Viewers cannot add itinerary items',
      }
    }

    // Create itinerary item
    const { data: item, error: itemError } = await supabase
      .from('itinerary_items')
      .insert({
        trip_id: input.tripId,
        type: input.type,
        title: input.title,
        description: input.description,
        start_time: input.startTime,
        end_time: input.endTime,
        location: input.location,
        created_by: user.id,
      })
      .select()
      .single()

    if (itemError) {
      console.error('Error creating itinerary item:', itemError)
      return {
        success: false,
        error: 'Failed to create itinerary item',
      }
    }

    // Revalidate trip page
    revalidatePath(`/trips/${input.tripId}`)

    return {
      success: true,
      item,
    }
  } catch (error) {
    console.error('Unexpected error creating itinerary item:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}
