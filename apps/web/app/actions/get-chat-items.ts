'use server'

import { createClient } from '@/lib/supabase/server'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'

type ErrorType = 'not_found' | 'permission_denied' | 'error'

// Define ExpenseWithDetails type based on what's returned from the database
export interface ExpenseWithDetails {
  id: string
  trip_id: string
  amount: number
  currency: string
  description: string
  category: string | null
  date: string
  created_at: string
  updated_at: string
  payer_profile: {
    id: string
    full_name: string | null
    avatar_url: string | null | undefined
  } | null
  expense_participants: Array<{
    amount: number
    percentage: number | null
    participant: {
      id: string
      full_name: string | null
      avatar_url: string | null | undefined
    }
  }>
}

/**
 * Fetch an itinerary item for display in chat modals
 *
 * Verifies user permission via RLS and returns full item details
 * for rendering in read-only ChatItineraryItemModal
 */
export async function getItineraryItemForChat(
  itemId: string,
  tripId: string
): Promise<
  { success: true; item: ItineraryItemWithParticipants } | { success: false; error: ErrorType }
> {
  const supabase = await createClient()

  try {
    // Fetch item with participants (verify user permission via RLS)
    const { data: item, error } = await supabase
      .from('itinerary_items')
      .select(
        `
        *,
        created_by_user:profiles!created_by(id, full_name, avatar_url),
        itinerary_participants(
          participant:profiles(id, full_name, avatar_url)
        )
      `
      )
      .eq('id', itemId)
      .eq('trip_id', tripId)
      .single()

    if (error) {
      // PGRST116 = row not found (item deleted or doesn't exist)
      if (error.code === 'PGRST116') {
        return { success: false, error: 'not_found' }
      }
      // Any other error likely means permission denied or RLS blocking access
      console.error('Error fetching itinerary item for chat:', error)
      return { success: false, error: 'permission_denied' }
    }

    if (!item) {
      return { success: false, error: 'not_found' }
    }

    return { success: true, item: item as unknown as ItineraryItemWithParticipants }
  } catch (error) {
    console.error('Unexpected error fetching itinerary item:', error)
    return { success: false, error: 'error' }
  }
}

/**
 * Fetch an expense for display in chat modals
 *
 * Verifies user permission via RLS and returns full expense details
 * for rendering in read-only ChatExpenseModal
 */
export async function getExpenseForChat(
  itemId: string,
  tripId: string
): Promise<{ success: true; expense: ExpenseWithDetails } | { success: false; error: ErrorType }> {
  const supabase = await createClient()

  try {
    // Fetch expense with participants (verify user permission via RLS)
    const { data: expense, error } = await supabase
      .from('expenses')
      .select(
        `
        *,
        payer_profile:profiles!payer(id, full_name, avatar_url),
        expense_participants(
          participant:profiles(id, full_name, avatar_url),
          amount,
          percentage
        )
      `
      )
      .eq('id', itemId)
      .eq('trip_id', tripId)
      .single()

    if (error) {
      // PGRST116 = row not found (expense deleted or doesn't exist)
      if (error.code === 'PGRST116') {
        return { success: false, error: 'not_found' }
      }
      // Any other error likely means permission denied or RLS blocking access
      console.error('Error fetching expense for chat:', error)
      return { success: false, error: 'permission_denied' }
    }

    if (!expense) {
      return { success: false, error: 'not_found' }
    }

    return { success: true, expense: expense as unknown as ExpenseWithDetails }
  } catch (error) {
    console.error('Unexpected error fetching expense:', error)
    return { success: false, error: 'error' }
  }
}
