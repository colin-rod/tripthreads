/**
 * Unit Tests: Notification Utilities
 *
 * Tests for notification preference logic, recipient filtering, and helper functions.
 *
 * CRO-767: Edge Functions to send push on trip events
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts'
import {
  getEffectivePreference,
  checkUserPreference,
  type TripParticipant,
  type NotificationEventType,
  type NotificationChannel,
} from '../notifications.ts'

// ============================================================================
// Test: getEffectivePreference
// ============================================================================

Deno.test('getEffectivePreference - trip-specific override (true)', () => {
  const result = getEffectivePreference(
    'expenses',
    { expenses: true }, // trip-specific: enabled
    { email_expense_updates: false }, // global: disabled
    'email'
  )
  assertEquals(result, true, 'Trip-specific preference should override global')
})

Deno.test('getEffectivePreference - trip-specific override (false)', () => {
  const result = getEffectivePreference(
    'expenses',
    { expenses: false }, // trip-specific: disabled
    { email_expense_updates: true }, // global: enabled
    'email'
  )
  assertEquals(result, false, 'Trip-specific preference should override global')
})

Deno.test('getEffectivePreference - trip-specific null inherits from global', () => {
  const result = getEffectivePreference(
    'expenses',
    { expenses: null }, // trip-specific: inherit
    { email_expense_updates: true }, // global: enabled
    'email'
  )
  assertEquals(result, true, 'Null trip preference should inherit from global')
})

Deno.test('getEffectivePreference - no trip preference inherits from global', () => {
  const result = getEffectivePreference(
    'expenses',
    null, // no trip preferences
    { email_expense_updates: true }, // global: enabled
    'email'
  )
  assertEquals(result, true, 'Missing trip preference should inherit from global')
})

Deno.test('getEffectivePreference - no preferences defaults to false', () => {
  const result = getEffectivePreference(
    'expenses',
    null, // no trip preferences
    null, // no global preferences
    'email'
  )
  assertEquals(result, false, 'No preferences should default to false')
})

Deno.test('getEffectivePreference - email channel mapping', () => {
  const testCases: Array<{
    eventType: NotificationEventType
    globalKey: string
  }> = [
    { eventType: 'invites', globalKey: 'email_trip_invites' },
    { eventType: 'itinerary', globalKey: 'email_trip_updates' },
    { eventType: 'expenses', globalKey: 'email_expense_updates' },
    { eventType: 'photos', globalKey: 'email_trip_updates' },
    { eventType: 'chat', globalKey: 'email_trip_updates' },
    { eventType: 'settlements', globalKey: 'email_expense_updates' },
  ]

  for (const { eventType, globalKey } of testCases) {
    const result = getEffectivePreference(eventType, null, { [globalKey]: true }, 'email')
    assertEquals(result, true, `Event type '${eventType}' should map to global key '${globalKey}'`)
  }
})

Deno.test('getEffectivePreference - push channel mapping', () => {
  const testCases: Array<{
    eventType: NotificationEventType
    globalKey: string
  }> = [
    { eventType: 'invites', globalKey: 'push_trip_invites' },
    { eventType: 'itinerary', globalKey: 'push_trip_updates' },
    { eventType: 'expenses', globalKey: 'push_expense_updates' },
    { eventType: 'photos', globalKey: 'push_trip_updates' },
    { eventType: 'chat', globalKey: 'push_trip_updates' },
    { eventType: 'settlements', globalKey: 'push_expense_updates' },
  ]

  for (const { eventType, globalKey } of testCases) {
    const result = getEffectivePreference(eventType, null, { [globalKey]: true }, 'push')
    assertEquals(
      result,
      true,
      `Event type '${eventType}' should map to global key '${globalKey}' for push`
    )
  }
})

// ============================================================================
// Test: checkUserPreference
// ============================================================================

Deno.test('checkUserPreference - user wants notifications', () => {
  const participant: TripParticipant = {
    id: 'tp-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    role: 'participant',
    notification_preferences: null,
    user: {
      id: 'user-1',
      email: 'test@example.com',
      full_name: 'Test User',
      notification_preferences: { email_expense_updates: true },
    },
  }

  const result = checkUserPreference(participant, 'expenses', 'email')

  assertEquals(result.shouldNotify, true)
  assertEquals(result.skipReason, undefined)
})

Deno.test('checkUserPreference - user disabled notifications', () => {
  const participant: TripParticipant = {
    id: 'tp-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    role: 'participant',
    notification_preferences: null,
    user: {
      id: 'user-1',
      email: 'test@example.com',
      full_name: 'Test User',
      notification_preferences: { email_expense_updates: false },
    },
  }

  const result = checkUserPreference(participant, 'expenses', 'email')

  assertEquals(result.shouldNotify, false)
  assertEquals(result.skipReason, 'preferences_disabled')
})

Deno.test('checkUserPreference - trip-specific override', () => {
  const participant: TripParticipant = {
    id: 'tp-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    role: 'participant',
    notification_preferences: { expenses: false }, // disabled for this trip
    user: {
      id: 'user-1',
      email: 'test@example.com',
      full_name: 'Test User',
      notification_preferences: { email_expense_updates: true }, // enabled globally
    },
  }

  const result = checkUserPreference(participant, 'expenses', 'email')

  assertEquals(result.shouldNotify, false)
  assertEquals(result.skipReason, 'preferences_disabled')
})

// ============================================================================
// Test: Event Type Coverage
// ============================================================================

Deno.test('All event types are handled', () => {
  const eventTypes: NotificationEventType[] = [
    'invites',
    'itinerary',
    'expenses',
    'photos',
    'chat',
    'settlements',
  ]

  const channels: NotificationChannel[] = ['email', 'push']

  for (const eventType of eventTypes) {
    for (const channel of channels) {
      // Should not throw error
      const result = getEffectivePreference(
        eventType,
        null,
        { [`${channel}_trip_updates`]: true },
        channel
      )
      assertExists(result, `Should handle ${eventType} on ${channel}`)
    }
  }
})

// ============================================================================
// Test: Edge Cases
// ============================================================================

Deno.test('getEffectivePreference - empty objects', () => {
  const result = getEffectivePreference('expenses', {}, {}, 'email')
  assertEquals(result, false, 'Empty preference objects should default to false')
})

Deno.test('getEffectivePreference - undefined vs null', () => {
  const resultWithNull = getEffectivePreference(
    'expenses',
    { expenses: null },
    { email_expense_updates: true },
    'email'
  )
  assertEquals(resultWithNull, true, 'Null should inherit from global')

  const resultWithUndefined = getEffectivePreference(
    'expenses',
    { expenses: undefined as unknown as boolean | null },
    { email_expense_updates: true },
    'email'
  )
  assertEquals(resultWithUndefined, true, 'Undefined should inherit from global')
})

Deno.test('checkUserPreference - missing user object', () => {
  const participant: TripParticipant = {
    id: 'tp-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    role: 'participant',
    notification_preferences: null,
    user: {
      id: 'user-1',
      email: 'test@example.com',
      full_name: 'Test User',
      notification_preferences: null,
    },
  }

  const result = checkUserPreference(participant, 'expenses', 'email')

  assertEquals(result.shouldNotify, false)
  assertEquals(result.skipReason, 'preferences_disabled')
})

// ============================================================================
// Test: Real-world Scenarios
// ============================================================================

Deno.test('Scenario: New user with default preferences', () => {
  // New users have null preferences → should default to false (opt-in model)
  const participant: TripParticipant = {
    id: 'tp-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    role: 'participant',
    notification_preferences: null,
    user: {
      id: 'user-1',
      email: 'newuser@example.com',
      full_name: 'New User',
      notification_preferences: null,
    },
  }

  const result = checkUserPreference(participant, 'expenses', 'email')

  assertEquals(
    result.shouldNotify,
    false,
    'New users should not receive notifications by default (opt-in model)'
  )
})

Deno.test('Scenario: User opts out of trip updates but wants expense updates', () => {
  const participant: TripParticipant = {
    id: 'tp-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    role: 'participant',
    notification_preferences: null,
    user: {
      id: 'user-1',
      email: 'selective@example.com',
      full_name: 'Selective User',
      notification_preferences: {
        email_trip_updates: false, // no itinerary/chat notifications
        email_expense_updates: true, // yes to expense notifications
      },
    },
  }

  const chatResult = checkUserPreference(participant, 'chat', 'email')
  assertEquals(chatResult.shouldNotify, false, 'Should not notify for chat')

  const expenseResult = checkUserPreference(participant, 'expenses', 'email')
  assertEquals(expenseResult.shouldNotify, true, 'Should notify for expenses')
})

Deno.test('Scenario: User disables notifications for specific trip', () => {
  const participant: TripParticipant = {
    id: 'tp-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    role: 'participant',
    notification_preferences: {
      expenses: false, // disabled for this trip only
    },
    user: {
      id: 'user-1',
      email: 'user@example.com',
      full_name: 'User',
      notification_preferences: {
        email_expense_updates: true, // enabled globally
        email_trip_updates: true,
      },
    },
  }

  const expenseResult = checkUserPreference(participant, 'expenses', 'email')
  assertEquals(
    expenseResult.shouldNotify,
    false,
    'Trip-specific override should disable notifications'
  )

  const chatResult = checkUserPreference(participant, 'chat', 'email')
  assertEquals(
    chatResult.shouldNotify,
    true,
    'Other notifications should still work via global preferences'
  )
})
