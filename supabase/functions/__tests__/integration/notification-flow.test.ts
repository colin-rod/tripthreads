/**
 * Integration Tests: Notification Flow
 *
 * Tests for end-to-end notification delivery including:
 * - Preference checking
 * - Recipient filtering
 * - Email delivery (mocked)
 * - Notification logging
 *
 * CRO-767: Edge Functions to send push on trip events
 *
 * Note: These tests use mocked Supabase and Resend API calls.
 * For actual delivery testing, use the notification_logs table in a test environment.
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts'
import { type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  fetchNotificationRecipients,
  filterRecipientsAndLog,
  sendEmailNotification,
  logNotification,
  type TripParticipant,
} from '../../_shared/notifications.ts'

// ============================================================================
// Mock Supabase Client
// ============================================================================

class MockSupabaseClient {
  private mockData: Record<string, unknown> = {}

  setMockData(key: string, data: unknown) {
    this.mockData[key] = data
  }

  from(table: string) {
    return {
      select: (_query: string) => ({
        eq: (column: string, value: string) => ({
          not: (column: string, operator: string) => ({
            data: this.mockData[`${table}_${column}_not_${operator}`] || [],
            error: null,
          }),
          single: async () => ({
            data: this.mockData[`${table}_${column}_${value}`] || null,
            error: null,
          }),
        }),
        eq: (column: string, value: string) => ({
          eq: (column2: string, value2: string) => ({
            single: async () => ({
              data: this.mockData[`${table}_${column}_${value}_${column2}_${value2}`] || null,
              error: null,
            }),
          }),
        }),
      }),
      insert: (_data: unknown) => ({
        data: null,
        error: null,
      }),
    }
  }
}

// ============================================================================
// Test: fetchNotificationRecipients
// ============================================================================

Deno.test('fetchNotificationRecipients - filters out excluded users', async () => {
  const mockClient = new MockSupabaseClient() as unknown as SupabaseClient

  const mockParticipants: TripParticipant[] = [
    {
      id: 'tp-1',
      user_id: 'user-1',
      trip_id: 'trip-1',
      role: 'participant',
      notification_preferences: null,
      user: {
        id: 'user-1',
        email: 'user1@example.com',
        full_name: 'User One',
        notification_preferences: { email_expense_updates: true },
      },
    },
    {
      id: 'tp-2',
      user_id: 'user-2',
      trip_id: 'trip-1',
      role: 'participant',
      notification_preferences: null,
      user: {
        id: 'user-2',
        email: 'user2@example.com',
        full_name: 'User Two',
        notification_preferences: { email_expense_updates: true },
      },
    },
  ]

  mockClient.setMockData('trip_participants_user_id_not_in', mockParticipants)

  const recipients = await fetchNotificationRecipients(
    mockClient,
    'trip-1',
    ['user-3'] // exclude user-3 (not in list anyway)
  )

  assertEquals(recipients.length, 2)
  assertEquals(recipients[0].user_id, 'user-1')
  assertEquals(recipients[1].user_id, 'user-2')
})

// ============================================================================
// Test: filterRecipientsAndLog
// ============================================================================

Deno.test('filterRecipientsAndLog - filters by preferences', async () => {
  const mockClient = new MockSupabaseClient() as unknown as SupabaseClient

  const participants: TripParticipant[] = [
    {
      id: 'tp-1',
      user_id: 'user-1',
      trip_id: 'trip-1',
      role: 'participant',
      notification_preferences: null,
      user: {
        id: 'user-1',
        email: 'enabled@example.com',
        full_name: 'Enabled User',
        notification_preferences: { email_expense_updates: true },
      },
    },
    {
      id: 'tp-2',
      user_id: 'user-2',
      trip_id: 'trip-1',
      role: 'participant',
      notification_preferences: null,
      user: {
        id: 'user-2',
        email: 'disabled@example.com',
        full_name: 'Disabled User',
        notification_preferences: { email_expense_updates: false },
      },
    },
  ]

  const toNotify = await filterRecipientsAndLog(
    mockClient,
    'trip-1',
    participants,
    'expenses',
    'email',
    { expense_id: 'exp-1' }
  )

  assertEquals(toNotify.length, 1, 'Should only include users with notifications enabled')
  assertEquals(toNotify[0].user_id, 'user-1')
})

Deno.test('filterRecipientsAndLog - respects trip-specific overrides', async () => {
  const mockClient = new MockSupabaseClient() as unknown as SupabaseClient

  const participants: TripParticipant[] = [
    {
      id: 'tp-1',
      user_id: 'user-1',
      trip_id: 'trip-1',
      role: 'participant',
      notification_preferences: { expenses: false }, // disabled for this trip
      user: {
        id: 'user-1',
        email: 'user@example.com',
        full_name: 'User',
        notification_preferences: { email_expense_updates: true }, // enabled globally
      },
    },
  ]

  const toNotify = await filterRecipientsAndLog(
    mockClient,
    'trip-1',
    participants,
    'expenses',
    'email',
    { expense_id: 'exp-1' }
  )

  assertEquals(toNotify.length, 0, 'Trip-specific override should disable notifications')
})

// ============================================================================
// Test: sendEmailNotification (mocked)
// ============================================================================

Deno.test('sendEmailNotification - successful delivery', async () => {
  // Mock fetch to return success
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (_url: string | URL | Request, _init?: RequestInit) => {
    return new Response(JSON.stringify({ id: 'email-123' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const result = await sendEmailNotification(
    'test-api-key',
    'TripThreads <notifications@tripthreads.app>',
    'recipient@example.com',
    'Test Subject',
    '<p>Test HTML</p>'
  )

  globalThis.fetch = originalFetch

  assertEquals(result.success, true)
  assertEquals(result.emailId, 'email-123')
  assertEquals(result.error, undefined)
})

Deno.test('sendEmailNotification - failed delivery', async () => {
  // Mock fetch to return error
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (_url: string | URL | Request, _init?: RequestInit) => {
    return new Response('Resend API Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  const result = await sendEmailNotification(
    'test-api-key',
    'TripThreads <notifications@tripthreads.app>',
    'recipient@example.com',
    'Test Subject',
    '<p>Test HTML</p>'
  )

  globalThis.fetch = originalFetch

  assertEquals(result.success, false)
  assertExists(result.error)
})

// ============================================================================
// Test: logNotification
// ============================================================================

Deno.test('logNotification - successful log', async () => {
  const mockClient = new MockSupabaseClient() as unknown as SupabaseClient

  // Should not throw
  await logNotification(mockClient, {
    trip_id: 'trip-1',
    user_id: 'user-1',
    event_type: 'expenses',
    notification_type: 'email',
    status: 'sent',
    metadata: { expense_id: 'exp-1', email_id: 'email-123' },
  })

  // Success - no error thrown
  assertEquals(true, true)
})

Deno.test('logNotification - skipped notification', async () => {
  const mockClient = new MockSupabaseClient() as unknown as SupabaseClient

  // Should not throw
  await logNotification(mockClient, {
    trip_id: 'trip-1',
    user_id: 'user-1',
    event_type: 'expenses',
    notification_type: 'email',
    status: 'skipped',
    skip_reason: 'preferences_disabled',
    metadata: { expense_id: 'exp-1' },
  })

  // Success - no error thrown
  assertEquals(true, true)
})

Deno.test('logNotification - failed notification', async () => {
  const mockClient = new MockSupabaseClient() as unknown as SupabaseClient

  // Should not throw
  await logNotification(mockClient, {
    trip_id: 'trip-1',
    user_id: 'user-1',
    event_type: 'expenses',
    notification_type: 'email',
    status: 'failed',
    error_message: 'Resend API error: 500 Internal Server Error',
    metadata: { expense_id: 'exp-1' },
  })

  // Success - no error thrown
  assertEquals(true, true)
})

// ============================================================================
// Test: End-to-End Scenarios
// ============================================================================

Deno.test('E2E: Expense notification with mixed preferences', async () => {
  const mockClient = new MockSupabaseClient() as unknown as SupabaseClient

  // Mock fetch for email delivery
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (_url: string | URL | Request, _init?: RequestInit) => {
    return new Response(JSON.stringify({ id: 'email-123' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const participants: TripParticipant[] = [
    {
      id: 'tp-1',
      user_id: 'user-1',
      trip_id: 'trip-1',
      role: 'participant',
      notification_preferences: null,
      user: {
        id: 'user-1',
        email: 'enabled@example.com',
        full_name: 'Enabled User',
        notification_preferences: { email_expense_updates: true },
      },
    },
    {
      id: 'tp-2',
      user_id: 'user-2',
      trip_id: 'trip-1',
      role: 'participant',
      notification_preferences: { expenses: false },
      user: {
        id: 'user-2',
        email: 'tripoverride@example.com',
        full_name: 'Trip Override User',
        notification_preferences: { email_expense_updates: true },
      },
    },
    {
      id: 'tp-3',
      user_id: 'user-3',
      trip_id: 'trip-1',
      role: 'participant',
      notification_preferences: null,
      user: {
        id: 'user-3',
        email: 'disabled@example.com',
        full_name: 'Disabled User',
        notification_preferences: { email_expense_updates: false },
      },
    },
  ]

  // Filter recipients
  const toNotify = await filterRecipientsAndLog(
    mockClient,
    'trip-1',
    participants,
    'expenses',
    'email',
    { expense_id: 'exp-1' }
  )

  assertEquals(toNotify.length, 1, 'Only user-1 should receive notification')
  assertEquals(toNotify[0].user_id, 'user-1')

  // Send email to recipient
  for (const participant of toNotify) {
    const emailResult = await sendEmailNotification(
      'test-api-key',
      'TripThreads <notifications@tripthreads.app>',
      participant.user.email,
      'New Expense',
      '<p>Test</p>'
    )

    assertEquals(emailResult.success, true)

    // Log successful delivery
    await logNotification(mockClient, {
      trip_id: 'trip-1',
      user_id: participant.user_id,
      event_type: 'expenses',
      notification_type: 'email',
      status: 'sent',
      metadata: { expense_id: 'exp-1', email_id: emailResult.emailId },
    })
  }

  globalThis.fetch = originalFetch
})
