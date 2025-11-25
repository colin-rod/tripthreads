/**
 * Notification preference utilities
 *
 * Helper functions for managing notification preferences with inheritance logic.
 * Supports per-trip preferences that inherit from global settings.
 */

import type { TripNotificationPreferences } from '@tripthreads/core/validation/trip'

/**
 * Event types that can have notification preferences
 */
export type NotificationEventType =
  | 'invites'
  | 'itinerary'
  | 'expenses'
  | 'photos'
  | 'chat'
  | 'settlements'

/**
 * Global notification preference keys from profiles table
 */
type GlobalNotificationKey =
  | 'email_trip_invites'
  | 'email_expense_updates'
  | 'email_trip_updates'
  | 'push_trip_invites'
  | 'push_expense_updates'
  | 'push_trip_updates'

/**
 * Global notification preferences from profiles.notification_preferences
 */
export interface GlobalNotificationPreferences {
  email_trip_invites?: boolean
  email_expense_updates?: boolean
  email_trip_updates?: boolean
  push_trip_invites?: boolean
  push_expense_updates?: boolean
  push_trip_updates?: boolean
}

/**
 * Map event types to global preference keys for email notifications
 */
const EVENT_TO_GLOBAL_EMAIL_KEY: Record<NotificationEventType, GlobalNotificationKey | null> = {
  invites: 'email_trip_invites',
  itinerary: 'email_trip_updates',
  expenses: 'email_expense_updates',
  photos: 'email_trip_updates', // Photos fall under general trip updates
  chat: 'email_trip_updates', // Chat falls under general trip updates
  settlements: 'email_expense_updates', // Settlements fall under expense updates
}

/**
 * Map event types to global preference keys for push notifications
 */
const EVENT_TO_GLOBAL_PUSH_KEY: Record<NotificationEventType, GlobalNotificationKey | null> = {
  invites: 'push_trip_invites',
  itinerary: 'push_trip_updates',
  expenses: 'push_expense_updates',
  photos: 'push_trip_updates', // Photos fall under general trip updates
  chat: 'push_trip_updates', // Chat falls under general trip updates
  settlements: 'push_expense_updates', // Settlements fall under expense updates
}

/**
 * Get effective notification preference for a specific event type
 *
 * Implements inheritance logic:
 * 1. If trip preference is explicitly set (true/false), use it
 * 2. If trip preference is null/undefined, inherit from global
 * 3. If global preference not found, default to false
 *
 * @param eventType - The event type to check
 * @param tripPreferences - Per-trip notification preferences (can be null)
 * @param globalPreferences - Global notification preferences from profile
 * @param channel - Notification channel (email or push)
 * @returns Whether notifications should be sent for this event type
 */
export function getEffectivePreference(
  eventType: NotificationEventType,
  tripPreferences: TripNotificationPreferences | null | undefined,
  globalPreferences: GlobalNotificationPreferences,
  channel: 'email' | 'push' = 'email'
): boolean {
  // Check if trip preference is explicitly set
  const tripPref = tripPreferences?.[eventType]
  if (tripPref !== null && tripPref !== undefined) {
    return tripPref
  }

  // Fall back to global preference
  const globalKeyMap = channel === 'email' ? EVENT_TO_GLOBAL_EMAIL_KEY : EVENT_TO_GLOBAL_PUSH_KEY
  const globalKey = globalKeyMap[eventType]

  if (globalKey) {
    return globalPreferences[globalKey] ?? false
  }

  // Default to false if no preference found
  return false
}

/**
 * Check if user should be notified for a specific event
 *
 * Convenience function that checks both trip and global preferences.
 *
 * @param eventType - The event type to check
 * @param tripPreferences - Per-trip notification preferences
 * @param globalPreferences - Global notification preferences
 * @param channel - Notification channel (email or push)
 * @returns Whether to send notification
 */
export function shouldNotifyUser(
  eventType: NotificationEventType,
  tripPreferences: TripNotificationPreferences | null | undefined,
  globalPreferences: GlobalNotificationPreferences,
  channel: 'email' | 'push' = 'email'
): boolean {
  return getEffectivePreference(eventType, tripPreferences, globalPreferences, channel)
}

/**
 * Get all effective preferences for a trip
 *
 * Returns a map of event types to their effective preference values,
 * respecting inheritance from global settings.
 *
 * @param tripPreferences - Per-trip notification preferences
 * @param globalPreferences - Global notification preferences
 * @param channel - Notification channel (email or push)
 * @returns Map of event types to effective preference values
 */
export function getAllEffectivePreferences(
  tripPreferences: TripNotificationPreferences | null | undefined,
  globalPreferences: GlobalNotificationPreferences,
  channel: 'email' | 'push' = 'email'
): Record<NotificationEventType, boolean> {
  const eventTypes: NotificationEventType[] = [
    'invites',
    'itinerary',
    'expenses',
    'photos',
    'chat',
    'settlements',
  ]

  return eventTypes.reduce(
    (acc, eventType) => {
      acc[eventType] = getEffectivePreference(
        eventType,
        tripPreferences,
        globalPreferences,
        channel
      )
      return acc
    },
    {} as Record<NotificationEventType, boolean>
  )
}

/**
 * Check if a preference value is inherited from global settings
 *
 * Returns true if the trip preference is null/undefined (inheriting),
 * false if it's explicitly set (true or false).
 *
 * @param eventType - The event type to check
 * @param tripPreferences - Per-trip notification preferences
 * @returns Whether the preference is inherited
 */
export function isPreferenceInherited(
  eventType: NotificationEventType,
  tripPreferences: TripNotificationPreferences | null | undefined
): boolean {
  if (!tripPreferences) return true
  const pref = tripPreferences[eventType]
  return pref === null || pref === undefined
}

/**
 * Get user-friendly label for event type
 *
 * @param eventType - The event type
 * @returns Human-readable label
 */
export function getEventTypeLabel(eventType: NotificationEventType): string {
  const labels: Record<NotificationEventType, string> = {
    invites: 'Trip invitations',
    itinerary: 'Itinerary changes',
    expenses: 'Expense updates',
    photos: 'Photo uploads',
    chat: 'Chat messages',
    settlements: 'Settlement updates',
  }
  return labels[eventType]
}

/**
 * Get user-friendly description for event type
 *
 * @param eventType - The event type
 * @returns Description of what notifications this includes
 */
export function getEventTypeDescription(eventType: NotificationEventType): string {
  const descriptions: Record<NotificationEventType, string> = {
    invites: 'When someone invites you to this trip',
    itinerary: 'When flights, accommodations, or activities are added or changed',
    expenses: 'When expenses are added or updated',
    photos: 'When photos are uploaded to the trip',
    chat: 'When someone sends a message in the trip chat',
    settlements: 'When settlement payments are marked as paid',
  }
  return descriptions[eventType]
}
