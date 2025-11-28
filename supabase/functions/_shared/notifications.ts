/**
 * Shared Notification Utilities
 *
 * Helper functions for edge functions to:
 * - Check notification preferences with inheritance logic
 * - Fetch notification recipients
 * - Send email notifications via Resend
 * - Log notification delivery attempts
 *
 * CRO-767: Edge Functions to send push on trip events
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Event types that can trigger notifications
 */
export type NotificationEventType =
  | 'invites'
  | 'itinerary'
  | 'expenses'
  | 'photos'
  | 'chat'
  | 'settlements'

/**
 * Notification delivery channels
 */
export type NotificationChannel = 'email' | 'push'

/**
 * Notification delivery status
 */
export type NotificationStatus = 'sent' | 'skipped' | 'failed'

/**
 * Trip participant with preferences
 */
export interface TripParticipant {
  id: string
  user_id: string
  trip_id: string
  role: string
  notification_preferences: Record<string, boolean | null> | null
  user: {
    id: string
    email: string
    full_name: string | null
    notification_preferences: Record<string, boolean> | null
  }
}

/**
 * Notification log entry
 */
export interface NotificationLog {
  trip_id: string
  user_id: string
  event_type: NotificationEventType
  notification_type: NotificationChannel
  status: NotificationStatus
  skip_reason?: string
  error_message?: string
  metadata?: Record<string, unknown>
}

/**
 * Get effective preference for a user on a specific trip
 *
 * Implements inheritance logic:
 * 1. Check trip-specific preference (trip_participants.notification_preferences)
 * 2. If null/undefined, inherit from global (profiles.notification_preferences)
 * 3. If not found, default to false
 *
 * @param eventType - Type of event (invites, itinerary, expenses, etc.)
 * @param tripPreferences - Trip-specific preferences (JSONB from trip_participants)
 * @param globalPreferences - User's global preferences (JSONB from profiles)
 * @param channel - Notification channel (email or push)
 * @returns true if user should be notified, false otherwise
 */
export function getEffectivePreference(
  eventType: NotificationEventType,
  tripPreferences: Record<string, boolean | null> | null,
  globalPreferences: Record<string, boolean> | null,
  channel: NotificationChannel
): boolean {
  // Step 1: Check trip-specific preference
  if (tripPreferences && eventType in tripPreferences) {
    const tripPref = tripPreferences[eventType]
    if (tripPref !== null && tripPref !== undefined) {
      return tripPref
    }
  }

  // Step 2: Inherit from global preferences
  // Map event type to global preference key based on channel
  const eventToGlobalEmail: Record<NotificationEventType, string> = {
    invites: 'email_trip_invites',
    itinerary: 'email_trip_updates',
    expenses: 'email_expense_updates',
    photos: 'email_trip_updates',
    chat: 'email_trip_updates',
    settlements: 'email_expense_updates',
  }

  const eventToGlobalPush: Record<NotificationEventType, string> = {
    invites: 'push_trip_invites',
    itinerary: 'push_trip_updates',
    expenses: 'push_expense_updates',
    photos: 'push_trip_updates',
    chat: 'push_trip_updates',
    settlements: 'push_expense_updates',
  }

  const mapping = channel === 'email' ? eventToGlobalEmail : eventToGlobalPush
  const globalKey = mapping[eventType]

  if (globalPreferences && globalKey in globalPreferences) {
    return globalPreferences[globalKey] ?? false
  }

  // Step 3: Default to false if no preference found
  return false
}

/**
 * Fetch notification recipients for a trip event
 *
 * Returns all trip participants with their preferences, excluding specified user IDs
 *
 * @param supabase - Supabase client (service role)
 * @param tripId - Trip ID
 * @param excludeUserIds - User IDs to exclude (e.g., event creator)
 * @returns Array of trip participants with user data and preferences
 */
export async function fetchNotificationRecipients(
  supabase: SupabaseClient,
  tripId: string,
  excludeUserIds: string[] = []
): Promise<TripParticipant[]> {
  const { data, error } = await supabase
    .from('trip_participants')
    .select(
      `
      id,
      user_id,
      trip_id,
      role,
      notification_preferences,
      user:profiles!trip_participants_user_id_fkey (
        id,
        email,
        full_name,
        notification_preferences
      )
    `
    )
    .eq('trip_id', tripId)
    .not('user_id', 'in', `(${excludeUserIds.join(',')})`)

  if (error) {
    console.error('Error fetching notification recipients:', error)
    throw new Error(`Failed to fetch recipients: ${error.message}`)
  }

  return (data || []) as TripParticipant[]
}

/**
 * Check if a user should be notified for an event
 *
 * @param participant - Trip participant with preferences
 * @param eventType - Type of event
 * @param channel - Notification channel
 * @returns Object with shouldNotify boolean and optional skip reason
 */
export function checkUserPreference(
  participant: TripParticipant,
  eventType: NotificationEventType,
  channel: NotificationChannel
): { shouldNotify: boolean; skipReason?: string } {
  const shouldNotify = getEffectivePreference(
    eventType,
    participant.notification_preferences,
    participant.user.notification_preferences,
    channel
  )

  if (!shouldNotify) {
    return {
      shouldNotify: false,
      skipReason: 'preferences_disabled',
    }
  }

  return { shouldNotify: true }
}

/**
 * Send email notification via Resend API
 *
 * @param resendApiKey - Resend API key
 * @param from - Sender email address
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - Email HTML content
 * @returns Resend API response
 */
export async function sendEmailNotification(
  resendApiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Resend API error:', errorText)
      return {
        success: false,
        error: `Resend API error: ${response.status} ${response.statusText}`,
      }
    }

    const result = await response.json()
    return {
      success: true,
      emailId: result.id,
    }
  } catch (error) {
    console.error('Failed to send email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Log notification delivery attempt
 *
 * @param supabase - Supabase client (service role)
 * @param log - Notification log entry
 */
export async function logNotification(
  supabase: SupabaseClient,
  log: NotificationLog
): Promise<void> {
  const { error } = await supabase.from('notification_logs').insert({
    trip_id: log.trip_id,
    user_id: log.user_id,
    event_type: log.event_type,
    notification_type: log.notification_type,
    status: log.status,
    skip_reason: log.skip_reason,
    error_message: log.error_message,
    metadata: log.metadata,
  })

  if (error) {
    console.error('Failed to log notification:', error)
    // Don't throw - logging failure shouldn't block notification delivery
  }
}

/**
 * Filter recipients by preference and log results
 *
 * Returns only recipients who should be notified, and logs all decisions
 *
 * @param supabase - Supabase client (service role)
 * @param tripId - Trip ID
 * @param participants - Trip participants with preferences
 * @param eventType - Type of event
 * @param channel - Notification channel
 * @param metadata - Event-specific metadata to log
 * @returns Array of participants who should be notified
 */
export async function filterRecipientsAndLog(
  supabase: SupabaseClient,
  tripId: string,
  participants: TripParticipant[],
  eventType: NotificationEventType,
  channel: NotificationChannel,
  metadata?: Record<string, unknown>
): Promise<TripParticipant[]> {
  const toNotify: TripParticipant[] = []

  for (const participant of participants) {
    const { shouldNotify, skipReason } = checkUserPreference(participant, eventType, channel)

    if (shouldNotify) {
      toNotify.push(participant)
      // Log as 'sent' will be updated after successful delivery
    } else {
      // Log skipped notification
      await logNotification(supabase, {
        trip_id: tripId,
        user_id: participant.user_id,
        event_type: eventType,
        notification_type: channel,
        status: 'skipped',
        skip_reason: skipReason,
        metadata,
      })
    }
  }

  return toNotify
}
