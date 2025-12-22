import { createClient } from '@supabase/supabase-js'
import type { Database } from '@tripthreads/core/types/database'

/**
 * Test Data Factory for E2E Tests
 *
 * Utilities for creating test data dynamically during E2E test runs.
 * Uses Supabase client to insert data into the test database.
 */

// Initialize Supabase client for test data creation
const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
)

export interface TestUserData {
  id?: string
  email: string
  full_name: string
  password?: string
}

export interface TestTripData {
  id?: string
  name: string
  description?: string
  owner_id: string
  start_date: string
  end_date: string
  base_currency: string
}

export interface TestInviteData {
  token?: string
  trip_id: string
  inviter_id: string
  email: string
  role: 'owner' | 'participant' | 'viewer'
  status?: 'pending' | 'accepted' | 'declined' | 'expired'
}

export interface TestExpenseData {
  trip_id: string
  description: string
  amount: number
  currency: string
  category: string
  payer_id: string
  date: string
}

/**
 * Create a test invite with dynamic token
 */
export async function createTestInvite(overrides?: Partial<TestInviteData>): Promise<string> {
  const token = `test-invite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const { error } = await supabase.from('trip_invites').insert({
    token,
    trip_id: overrides?.trip_id || 'test-trip-deep-link',
    inviter_id: overrides?.inviter_id || 'test-user-1-id',
    email: overrides?.email || `invitee-${Date.now()}@test.com`,
    role: overrides?.role || 'participant',
    status: overrides?.status || 'pending',
  })

  if (error) {
    console.error('Failed to create test invite:', error)
    throw error
  }

  return token
}

/**
 * Create a test trip
 */
export async function createTestTrip(overrides?: Partial<TestTripData>): Promise<string> {
  const tripId = `test-trip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const { error } = await supabase.from('trips').insert({
    id: tripId,
    name: overrides?.name || 'E2E Test Trip',
    description: overrides?.description || 'Created by E2E test',
    owner_id: overrides?.owner_id || 'test-user-1-id',
    start_date: overrides?.start_date || '2025-01-01',
    end_date: overrides?.end_date || '2025-01-07',
    base_currency: overrides?.base_currency || 'USD',
  })

  if (error) {
    console.error('Failed to create test trip:', error)
    throw error
  }

  return tripId
}

/**
 * Create a test expense
 */
export async function createTestExpense(data: TestExpenseData): Promise<string> {
  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      trip_id: data.trip_id,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      category: data.category,
      payer_id: data.payer_id,
      date: data.date,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create test expense:', error)
    throw error
  }

  return expense.id
}

/**
 * Add a participant to a trip
 */
export async function addTripParticipant(
  tripId: string,
  userId: string,
  role: 'owner' | 'participant' | 'viewer' = 'participant'
): Promise<void> {
  const { error } = await supabase.from('trip_participants').insert({
    trip_id: tripId,
    user_id: userId,
    role,
  })

  if (error) {
    console.error('Failed to add trip participant:', error)
    throw error
  }
}

/**
 * Clean up test data (call in afterAll hooks)
 */
export async function cleanupTestData(prefix: string): Promise<void> {
  // Delete test invites
  await supabase.from('trip_invites').delete().like('token', `${prefix}%`)

  // Delete test trips
  await supabase.from('trips').delete().like('id', `${prefix}%`)

  // Note: Expenses and participants will cascade delete via foreign keys
}

/**
 * Get a test user ID (assumes seed data exists)
 */
export function getTestUserId(): string {
  return 'test-user-1-id'
}

/**
 * Get a test trip ID (assumes seed data exists)
 */
export function getTestTripId(): string {
  return 'test-trip-deep-link'
}

/**
 * Get a test invite token (assumes seed data exists)
 */
export function getTestInviteToken(): string {
  return 'test-invite-token-123'
}
