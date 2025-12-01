/**
 * Trip notification preferences server actions
 *
 * Handles updating per-trip notification preferences for participants.
 * Follows TDD principles with comprehensive error handling and logging.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  validateTripNotificationPreferences,
  type TripNotificationPreferences,
} from '@tripthreads/core/validation/trip'
import * as Sentry from '@sentry/nextjs'

/**
 * Update notification preferences for a specific trip
 *
 * Allows participants to control their notification preferences per trip.
 * Preferences are stored in the trip_participants table.
 *
 * Inheritance logic:
 * - null (or missing key) = inherit from global profiles.notification_preferences
 * - true = enable for this trip (overrides global)
 * - false = disable for this trip (overrides global)
 *
 * @param tripId - UUID of the trip
 * @param preferences - Notification preferences object
 * @returns Updated trip participant record
 * @throws Error if user not authenticated, not a participant, or update fails
 */
export async function updateTripNotificationPreferences(
  tripId: string,
  preferences: TripNotificationPreferences
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient()

    // Validate input
    const validation = validateTripNotificationPreferences(preferences)
    if (!validation.success) {
      Sentry.captureMessage('Invalid trip notification preferences', {
        level: 'warning',
        extra: {
          tripId,
          preferences,
          errors: validation.error.errors,
        },
      })
      throw new Error('Invalid notification preferences format')
    }

    // Get authenticated user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      Sentry.captureException(authError, {
        extra: { context: 'updateTripNotificationPreferences - auth check' },
      })
      throw new Error('Not authenticated')
    }

    // Verify user is a participant of this trip
    const { data: participant, error: participantError } = await supabase
      .from('trip_participants')
      .select('id, role')
      .eq('trip_id', tripId)
      .eq('user_id', authUser.id)
      .single()

    if (participantError || !participant) {
      Sentry.captureException(participantError, {
        extra: {
          tripId,
          userId: authUser.id,
          context: 'updateTripNotificationPreferences - participant check',
        },
      })
      throw new Error('You are not a participant of this trip')
    }

    // Update notification preferences
    // RLS policies ensure user can only update their own preferences
    const { error: updateError } = await supabase
      .from('trip_participants')
      .update({
        notification_preferences: preferences as never,
      })
      .eq('trip_id', tripId)
      .eq('user_id', authUser.id)

    if (updateError) {
      Sentry.captureException(updateError, {
        extra: {
          tripId,
          userId: authUser.id,
          preferences,
          context: 'updateTripNotificationPreferences - update',
        },
      })
      throw new Error('Failed to update notification preferences')
    }

    // Revalidate trip settings page
    revalidatePath(`/trips/${tripId}/settings`)
    revalidatePath(`/trips/${tripId}`)

    return { success: true }
  } catch (error) {
    // Log error to Sentry
    Sentry.captureException(error, {
      extra: {
        tripId,
        preferences,
        context: 'updateTripNotificationPreferences',
      },
    })

    // Return user-friendly error message
    if (error instanceof Error) {
      return { success: false, message: error.message }
    }

    return { success: false, message: 'Failed to update notification preferences' }
  }
}

/**
 * Get notification preferences for a specific trip
 *
 * Returns the user's notification preferences for the trip, or null if not set.
 * If null, preferences should inherit from global settings.
 *
 * @param tripId - UUID of the trip
 * @returns Trip notification preferences or null
 * @throws Error if user not authenticated or not a participant
 */
export async function getTripNotificationPreferences(
  tripId: string
): Promise<TripNotificationPreferences | null> {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      throw new Error('Not authenticated')
    }

    // Get participant record with notification preferences
    const { data: participant, error: participantError } = await supabase
      .from('trip_participants')
      .select('notification_preferences')
      .eq('trip_id', tripId)
      .eq('user_id', authUser.id)
      .single()

    if (participantError || !participant) {
      throw new Error('You are not a participant of this trip')
    }

    // Parse and return preferences (null if not set)
    return participant.notification_preferences
      ? (participant.notification_preferences as TripNotificationPreferences)
      : null
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        tripId,
        context: 'getTripNotificationPreferences',
      },
    })
    throw error
  }
}
