import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type Trip,
  type GroupedItineraryItems,
  type ExpenseWithDetails,
  type OptimizedSettlement,
  getTripItineraryItems,
  groupItineraryItemsByDate,
  getUserExpensesForTrip,
  calculateUserBalances,
  optimizeSettlements,
} from '@tripthreads/core'
import { getChatMessages, type ChatMessage } from './chat'

export interface TripData {
  trip: Trip | null
  itinerary: GroupedItineraryItems[]
  expenses: ExpenseWithDetails[]
  settlements: OptimizedSettlement[]
  chatMessages: ChatMessage[]
  isOwner: boolean
  errors: {
    trip?: string
    itinerary?: string
    expenses?: string
    chat?: string
  }
}

/**
 * Load all trip data in parallel for optimal performance.
 * Loads trip metadata, itinerary items, and expenses concurrently.
 *
 * @param supabase - Supabase client instance
 * @param tripId - Trip ID to load data for
 * @returns Promise resolving to TripData with all trip information
 */
export async function loadTripData(supabase: SupabaseClient, tripId: string): Promise<TripData> {
  const result: TripData = {
    trip: null,
    itinerary: [],
    expenses: [],
    settlements: [],
    chatMessages: [],
    isOwner: false,
    errors: {},
  }

  try {
    // Load all data in parallel using Promise.allSettled
    // This allows partial success - if one fails, others can still succeed
    const [tripResult, itineraryResult, expensesResult, chatResult, ownerResult] =
      await Promise.allSettled([
        // Load trip metadata
        supabase.from('trips').select('*').eq('id', tripId).single(),

        // Load itinerary items
        getTripItineraryItems(supabase, tripId),

        // Load expenses
        getUserExpensesForTrip(supabase, tripId),

        // Load chat messages (last 10 for preview)
        getChatMessages(supabase, tripId, 10),

        // Check if current user is owner
        checkIsOwner(supabase, tripId),
      ])

    // Process trip result
    if (tripResult.status === 'fulfilled') {
      const { data, error } = tripResult.value
      if (error) {
        console.error('Error loading trip:', error)
        result.errors.trip = 'Failed to load trip details'
      } else {
        result.trip = data as Trip
      }
    } else {
      console.error('Trip fetch rejected:', tripResult.reason)
      result.errors.trip = 'Failed to load trip details'
    }

    // Process itinerary result
    if (itineraryResult.status === 'fulfilled') {
      try {
        const items = itineraryResult.value
        result.itinerary = groupItineraryItemsByDate(items)
      } catch (err) {
        console.error('Error processing itinerary:', err)
        result.errors.itinerary = 'Failed to load itinerary'
      }
    } else {
      console.error('Itinerary fetch rejected:', itineraryResult.reason)
      result.errors.itinerary = 'Failed to load itinerary'
    }

    // Process expenses result
    if (expensesResult.status === 'fulfilled') {
      try {
        const expensesData = expensesResult.value
        result.expenses = expensesData

        // Calculate settlements if we have expenses and trip data
        if (expensesData.length > 0 && result.trip) {
          const baseCurrency = result.trip.base_currency || 'USD'
          const balances = calculateUserBalances(expensesData, baseCurrency)
          result.settlements = optimizeSettlements(balances)
        }
      } catch (err) {
        console.error('Error processing expenses:', err)
        result.errors.expenses = 'Failed to load expenses'
      }
    } else {
      console.error('Expenses fetch rejected:', expensesResult.reason)
      result.errors.expenses = 'Failed to load expenses'
    }

    // Process chat result
    if (chatResult.status === 'fulfilled') {
      try {
        result.chatMessages = chatResult.value
      } catch (err) {
        console.error('Error processing chat messages:', err)
        result.errors.chat = 'Failed to load chat messages'
      }
    } else {
      console.error('Chat fetch rejected:', chatResult.reason)
      result.errors.chat = 'Failed to load chat messages'
    }

    // Process owner check result
    if (ownerResult.status === 'fulfilled') {
      result.isOwner = ownerResult.value
    }
  } catch (err) {
    console.error('Unexpected error loading trip data:', err)
    result.errors.trip = 'An unexpected error occurred'
  }

  return result
}

/**
 * Check if the current user is the owner of the trip
 */
async function checkIsOwner(supabase: SupabaseClient, tripId: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('trip_participants')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single()

    if (error || !data) return false
    return data.role === 'owner'
  } catch (err) {
    console.error('Error checking trip ownership:', err)
    return false
  }
}
