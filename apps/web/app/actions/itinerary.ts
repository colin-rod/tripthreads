'use server'

/**
 * Server Actions for Itinerary Management
 *
 * Handles itinerary item creation, updates, and deletion with proper RLS enforcement.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type {
  ItineraryItemType,
  ItineraryItemLink,
  ItineraryItemMetadata,
  Database,
} from '@tripthreads/core'
import {
  trackItemAddedNl,
  trackItemAddedManual,
  trackItemEdited,
  trackItemDeleted,
} from '@/lib/analytics'

export interface CreateItineraryItemInput {
  tripId: string
  type: ItineraryItemType
  title: string
  description?: string
  notes?: string
  links?: ItineraryItemLink[]
  startTime: string // ISO 8601
  endTime?: string // ISO 8601
  isAllDay?: boolean
  location?: string
  metadata?: ItineraryItemMetadata
  participantIds?: string[] // If empty/null, defaults to all trip participants
  source?: 'nl' | 'manual' // Tracking: natural language vs manual form
}

export interface UpdateItineraryItemInput {
  id: string
  type?: ItineraryItemType
  title?: string
  description?: string | null
  notes?: string | null
  links?: ItineraryItemLink[]
  startTime?: string // ISO 8601
  endTime?: string | null // ISO 8601
  isAllDay?: boolean
  location?: string | null
  metadata?: ItineraryItemMetadata
  participantIds?: string[] // If provided, updates participants
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
    const insertData: Database['public']['Tables']['itinerary_items']['Insert'] = {
      trip_id: input.tripId,
      type: input.type,
      title: input.title,
      description: input.description,
      notes: input.notes ?? null,
      links: (input.links ||
        []) as unknown as Database['public']['Tables']['itinerary_items']['Insert']['links'],
      start_time: input.startTime,
      end_time: input.endTime ?? null,
      is_all_day: input.isAllDay ?? false,
      location: input.location ?? null,
      metadata: (input.metadata ||
        {}) as Database['public']['Tables']['itinerary_items']['Insert']['metadata'],
      created_by: user.id,
    }

    const { data: item, error: itemError } = await supabase
      .from('itinerary_items')
      .insert(insertData)
      .select()
      .single()

    if (itemError) {
      console.error('Error creating itinerary item:', itemError)
      return {
        success: false,
        error: 'Failed to create itinerary item',
      }
    }

    // Add participants if specified
    if (input.participantIds && input.participantIds.length > 0) {
      const participantInserts: Database['public']['Tables']['itinerary_item_participants']['Insert'][] =
        input.participantIds.map(userId => ({
          itinerary_item_id: item.id,
          user_id: userId,
        }))

      const { error: participantError } = await supabase
        .from('itinerary_item_participants')
        .insert(participantInserts)

      if (participantError) {
        console.error('Error adding participants:', participantError)
        // Don't fail the whole operation, just log the error
      }
    }
    // If no participant_ids provided, item is for all trip participants (default behavior)

    // Track analytics event
    if (input.source === 'nl') {
      trackItemAddedNl({
        tripId: input.tripId,
        itemType: input.type,
        parseSuccess: true,
        hasTime: !input.isAllDay,
        hasLocation: !!input.location,
        userId: user.id,
      })
    } else {
      trackItemAddedManual({
        tripId: input.tripId,
        itemType: input.type,
        userId: user.id,
      })
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

/**
 * Update an existing itinerary item
 *
 * Users can update items they created, are involved in, or if they're the trip owner.
 * RLS policy enforces these permissions.
 */
export async function updateItineraryItem(input: UpdateItineraryItemInput) {
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

    // Get the item to find the trip_id and type for revalidation and tracking
    const { data: existingItem, error: fetchError } = await supabase
      .from('itinerary_items')
      .select('trip_id, type')
      .eq('id', input.id)
      .single()

    if (fetchError || !existingItem) {
      return {
        success: false,
        error: 'Itinerary item not found',
      }
    }

    // Build update object (only include fields that are provided)
    const updateData: Record<string, unknown> = {}
    if (input.type !== undefined) updateData.type = input.type
    if (input.title !== undefined) updateData.title = input.title
    if (input.description !== undefined) updateData.description = input.description
    if (input.notes !== undefined) updateData.notes = input.notes
    if (input.links !== undefined) updateData.links = input.links
    if (input.startTime !== undefined) updateData.start_time = input.startTime
    if (input.endTime !== undefined) updateData.end_time = input.endTime
    if (input.isAllDay !== undefined) updateData.is_all_day = input.isAllDay
    if (input.location !== undefined) updateData.location = input.location
    if (input.metadata !== undefined) updateData.metadata = input.metadata

    // Update itinerary item
    // RLS policy will enforce permissions (creator, involved participant, or trip owner)
    const { data: item, error: itemError } = await supabase
      .from('itinerary_items')
      .update(updateData)
      .eq('id', input.id)
      .select()
      .single()

    if (itemError) {
      console.error('Error updating itinerary item:', itemError)
      return {
        success: false,
        error:
          itemError.code === 'PGRST116'
            ? 'You do not have permission to update this item'
            : 'Failed to update itinerary item',
      }
    }

    // Update participants if provided
    if (input.participantIds !== undefined) {
      // First, remove all existing participants
      await supabase.from('itinerary_item_participants').delete().eq('itinerary_item_id', input.id)

      // Then add new participants if any
      if (input.participantIds.length > 0) {
        const participantInserts = input.participantIds.map(userId => ({
          itinerary_item_id: input.id,
          user_id: userId,
        }))

        const { error: participantError } = await supabase
          .from('itinerary_item_participants')
          .insert(participantInserts)

        if (participantError) {
          console.error('Error updating participants:', participantError)
          // Don't fail the whole operation
        }
      }
    }

    // Track analytics event
    const itemType = (input.type || existingItem.type) as ItineraryItemType
    trackItemEdited({
      tripId: existingItem.trip_id,
      itemId: input.id,
      itemType,
      userId: user.id,
    })

    // Revalidate trip page
    revalidatePath(`/trips/${existingItem.trip_id}`)

    return {
      success: true,
      item,
    }
  } catch (error) {
    console.error('Unexpected error updating itinerary item:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Delete an itinerary item
 *
 * Users can delete items they created or if they're the trip owner.
 * RLS policy enforces these permissions.
 */
export async function deleteItineraryItem(itemId: string) {
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

    // Get the item to find the trip_id and type for revalidation and tracking
    const { data: existingItem, error: fetchError } = await supabase
      .from('itinerary_items')
      .select('trip_id, type, created_by')
      .eq('id', itemId)
      .single()

    if (fetchError || !existingItem) {
      return {
        success: false,
        error: 'Itinerary item not found',
      }
    }

    // Delete the item
    // RLS policy will enforce permissions (creator or trip owner)
    // CASCADE will automatically delete related participants
    const { error: deleteError } = await supabase.from('itinerary_items').delete().eq('id', itemId)

    if (deleteError) {
      console.error('Error deleting itinerary item:', deleteError)
      return {
        success: false,
        error:
          deleteError.code === 'PGRST116'
            ? 'You do not have permission to delete this item'
            : 'Failed to delete itinerary item',
      }
    }

    // Track analytics event
    trackItemDeleted({
      tripId: existingItem.trip_id,
      itemId,
      itemType: existingItem.type as ItineraryItemType,
      userId: user.id,
    })

    // Revalidate trip page
    revalidatePath(`/trips/${existingItem.trip_id}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Unexpected error deleting itinerary item:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}
