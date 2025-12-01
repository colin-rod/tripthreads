/**
 * Itinerary Item CRUD operations
 *
 * Supabase queries for managing itinerary items.
 * All operations respect Row-Level Security (RLS) policies including date-scoped visibility.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@tripthreads/core'
import type {
  ItineraryItemFilters,
  ItineraryItemWithParticipants,
  GroupedItineraryItems,
} from '../../../types/itinerary'

/**
 * Get all itinerary items for a trip
 *
 * Returns itinerary items with participants, respecting RLS date-scoped visibility.
 * Items are sorted by start_time (ascending).
 *
 * @param supabase - Authenticated Supabase client
 * @param tripId - UUID of the trip
 * @param filters - Optional filters for type, date range, etc.
 * @returns Array of itinerary items with participants
 * @throws Error if query fails
 */
export async function getTripItineraryItems(
  supabase: SupabaseClient<Database>,
  tripId: string,
  filters?: ItineraryItemFilters
): Promise<ItineraryItemWithParticipants[]> {
  let query = supabase
    .from('itinerary_items')
    .select(
      `
      *,
      participants:itinerary_item_participants (
        id,
        user_id,
        user:profiles!user_id (
          id,
          full_name,
          avatar_url
        )
      )
    `
    )
    .eq('trip_id', tripId)
    .order('start_time', { ascending: true })

  // Apply filters
  if (filters) {
    if (filters.type) {
      if (Array.isArray(filters.type)) {
        query = query.in('type', filters.type)
      } else {
        query = query.eq('type', filters.type)
      }
    }

    if (filters.start_date) {
      query = query.gte('start_time', filters.start_date)
    }

    if (filters.end_date) {
      query = query.lte('start_time', filters.end_date)
    }

    if (filters.is_all_day !== undefined) {
      query = query.eq('is_all_day', filters.is_all_day)
    }

    if (filters.participant_id) {
      // Filter items where user is involved
      // Note: RLS handles visibility, this is additional filtering
      query = query.or(`participants.user_id.eq.${filters.participant_id}`)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching itinerary items:', error)
    throw new Error(`Failed to fetch itinerary items: ${error.message}`)
  }

  return data as unknown as ItineraryItemWithParticipants[]
}

/**
 * Get a single itinerary item by ID
 *
 * Returns full item details including participants.
 * RLS ensures user can only access items they're allowed to see.
 *
 * @param supabase - Authenticated Supabase client
 * @param itemId - UUID of the itinerary item
 * @returns Itinerary item with participants
 * @throws Error if item not found or user lacks access
 */
export async function getItineraryItem(
  supabase: SupabaseClient<Database>,
  itemId: string
): Promise<ItineraryItemWithParticipants> {
  const { data, error } = await supabase
    .from('itinerary_items')
    .select(
      `
      *,
      participants:itinerary_item_participants (
        id,
        user_id,
        user:profiles!user_id (
          id,
          full_name,
          avatar_url
        )
      )
    `
    )
    .eq('id', itemId)
    .single()

  if (error) {
    console.error('Error fetching itinerary item:', error)
    throw new Error(`Failed to fetch itinerary item: ${error.message}`)
  }

  if (!data) {
    throw new Error('Itinerary item not found')
  }

  return data as unknown as ItineraryItemWithParticipants
}

/**
 * Get participants for an itinerary item
 *
 * Returns list of users involved in this itinerary item.
 * If no participants are explicitly assigned, item is considered for all trip participants.
 *
 * @param supabase - Authenticated Supabase client
 * @param itemId - UUID of the itinerary item
 * @returns Array of participants with user details
 * @throws Error if query fails
 */
export async function getItineraryItemParticipants(
  supabase: SupabaseClient<Database>,
  itemId: string
) {
  const { data, error } = await supabase
    .from('itinerary_item_participants')
    .select(
      `
      id,
      user_id,
      user:profiles!user_id (
        id,
        full_name,
        avatar_url,
        email
      )
    `
    )
    .eq('itinerary_item_id', itemId)

  if (error) {
    console.error('Error fetching itinerary item participants:', error)
    throw new Error(`Failed to fetch participants: ${error.message}`)
  }

  return data
}

/**
 * Group itinerary items by date for list view
 *
 * Groups items by calendar date and sorts by start_time within each day.
 * Useful for displaying items in a day-by-day list format.
 *
 * @param items - Array of itinerary items
 * @returns Array of grouped items by date
 */
export function groupItineraryItemsByDate(
  items: ItineraryItemWithParticipants[]
): GroupedItineraryItems[] {
  const grouped = new Map<string, ItineraryItemWithParticipants[]>()

  items.forEach(item => {
    // Extract date part (YYYY-MM-DD) from ISO timestamp
    const date = item.start_time.split('T')[0]

    if (!grouped.has(date)) {
      grouped.set(date, [])
    }

    grouped.get(date)!.push(item)
  })

  // Convert to array and sort by date
  return Array.from(grouped.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, items]) => ({
      date,
      items: items.sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ),
    }))
}

/**
 * Separate all-day events from timed events
 *
 * Useful for calendar view where all-day events are displayed separately at the top.
 *
 * @param items - Array of itinerary items
 * @returns Object with allDay and timed arrays
 */
export function separateAllDayEvents(items: ItineraryItemWithParticipants[]) {
  return {
    allDay: items.filter(item => item.is_all_day),
    timed: items.filter(item => !item.is_all_day),
  }
}

/**
 * Get items for a specific date range (for week view)
 *
 * Filters items to those starting within the specified date range.
 *
 * @param items - Array of itinerary items
 * @param startDate - Start of range (ISO date string)
 * @param endDate - End of range (ISO date string)
 * @returns Filtered items
 */
export function getItemsInDateRange(
  items: ItineraryItemWithParticipants[],
  startDate: string,
  endDate: string
): ItineraryItemWithParticipants[] {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()

  return items.filter(item => {
    const itemStart = new Date(item.start_time).getTime()
    return itemStart >= start && itemStart <= end
  })
}

/**
 * Check if user is involved in an itinerary item
 *
 * If item has no explicit participants, assumes all trip participants are involved.
 *
 * @param item - Itinerary item with participants
 * @param userId - UUID of user to check
 * @returns true if user is involved
 */
export function isUserInvolvedInItem(item: ItineraryItemWithParticipants, userId: string): boolean {
  // If no participants explicitly set, all trip participants are involved
  if (!item.participants || item.participants.length === 0) {
    return true
  }

  // Check if user is in participants list
  return item.participants.some(p => p.user_id === userId)
}
