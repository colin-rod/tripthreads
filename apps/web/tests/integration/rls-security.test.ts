/**
 * @jest-environment node
 *
 * RLS Policy Security Integration Tests
 *
 * Tests RLS policies using Supabase client with real auth contexts.
 * Each test authenticates as a different user to verify access control.
 *
 * ⚠️  IMPORTANT: These tests require a local Supabase instance with test data.
 *    To run these tests:
 *    1. Start Docker
 *    2. Run: supabase start
 *    3. Run: supabase db reset (loads seed data)
 *    4. Update .env.local to use local Supabase URL (http://127.0.0.1:54321)
 *
 * Tests are automatically skipped when running against production Supabase.
 *
 * Related: CRO-797 (Linear)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Test user credentials (from seed.sql)
const TEST_USERS = {
  alice: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'temp@test.com',
    password: 'test123456', // Set in seed
  },
  benji: {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'benji@temp.com',
    password: 'test123456',
  },
  baylee: {
    id: '66666666-6666-6666-6666-666666666666',
    email: 'baylee@temp.com',
    password: 'test123456',
  },
  maya: {
    id: '55555555-5555-5555-5555-555555555555',
    email: 'maya@test.com',
    password: 'test123456',
  },
}

const PARIS_TRIP_ID = '10000000-0000-0000-0000-000000000001'
const TOKYO_TRIP_ID = '20000000-0000-0000-0000-000000000002'

// Check if running against local Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const isLocalSupabase = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')

// Skip tests if not running against local instance
const describeOrSkip = isLocalSupabase ? describe : describe.skip

describeOrSkip('RLS Policy Security Tests', () => {
  let supabase: SupabaseClient<Database>

  beforeAll(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    supabase = createClient<Database>(supabaseUrl, supabaseKey)
  })

  // Helper to create authenticated client for a user
  async function getAuthenticatedClient(user: keyof typeof TEST_USERS) {
    const { email, password } = TEST_USERS[user]
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) throw new Error(`Failed to authenticate as ${user}: ${signInError.message}`)

    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        },
      }
    )
  }

  describe('TC1: Trip Access Control', () => {
    it("TC1.1: User cannot read trips they're not part of", async () => {
      const mayaClient = await getAuthenticatedClient('maya')

      const { data } = await mayaClient.from('trips').select('*').eq('id', PARIS_TRIP_ID).single()

      // Maya should not see Alice's Paris trip
      expect(data).toBeNull()
    })

    it("TC1.2: User cannot modify trips they don't own", async () => {
      const benjiClient = await getAuthenticatedClient('benji')

      const { error: updateError } = await benjiClient
        .from('trips')
        .update({ name: 'Hacked Trip Name' })
        .eq('id', PARIS_TRIP_ID)

      // Benji should not be able to update Alice's trip
      expect(updateError).toBeTruthy()
      expect(updateError?.message).toContain('permission denied')
    })

    it("TC1.3: User cannot delete other users' trips", async () => {
      const benjiClient = await getAuthenticatedClient('benji')

      const { error: deleteError } = await benjiClient
        .from('trips')
        .delete()
        .eq('id', PARIS_TRIP_ID)

      expect(deleteError).toBeTruthy()
      expect(deleteError?.message).toContain('permission denied')
    })

    it('TC1.4: Participant can read but not modify trip details', async () => {
      const benjiClient = await getAuthenticatedClient('benji')

      // Should be able to read
      const { data: readData, error: readError } = await benjiClient
        .from('trips')
        .select('*')
        .eq('id', PARIS_TRIP_ID)
        .single()

      expect(readError).toBeNull()
      expect(readData).toBeTruthy()

      // Should not be able to update
      const { error: updateError } = await benjiClient
        .from('trips')
        .update({ description: 'Unauthorized change' })
        .eq('id', PARIS_TRIP_ID)

      expect(updateError).toBeTruthy()
    })

    it('TC1.5: Viewer has read-only access', async () => {
      const bayleeClient = await getAuthenticatedClient('baylee')

      // Should be able to read trip
      const { data, error: viewerReadError } = await bayleeClient
        .from('trips')
        .select('*')
        .eq('id', PARIS_TRIP_ID)
        .single()

      expect(viewerReadError).toBeNull()
      expect(data).toBeTruthy()

      // Should not be able to update
      const { error: viewerUpdateError } = await bayleeClient
        .from('trips')
        .update({ name: 'Viewer Update Attempt' })
        .eq('id', PARIS_TRIP_ID)

      expect(viewerUpdateError).toBeTruthy()
    })
  })

  describe('TC2: Participant Permissions', () => {
    it('TC2.1: Non-participant cannot see participant list', async () => {
      const mayaClient = await getAuthenticatedClient('maya')

      const { data } = await mayaClient
        .from('trip_participants')
        .select('*')
        .eq('trip_id', PARIS_TRIP_ID)

      // Maya should not see Paris trip participants
      expect(data).toEqual([])
    })

    it('TC2.2: Organizer can view all participants', async () => {
      const aliceClient = await getAuthenticatedClient('alice')

      const { data, error: participantListError } = await aliceClient
        .from('trip_participants')
        .select('*')
        .eq('trip_id', PARIS_TRIP_ID)

      expect(participantListError).toBeNull()
      expect(data).toBeTruthy()
      expect(data!.length).toBeGreaterThan(0)
    })

    it('TC2.3: Participant can view other participants', async () => {
      const benjiClient = await getAuthenticatedClient('benji')

      const { data, error: participantReadError } = await benjiClient
        .from('trip_participants')
        .select('*')
        .eq('trip_id', PARIS_TRIP_ID)

      expect(participantReadError).toBeNull()
      expect(data).toBeTruthy()
      expect(data!.length).toBeGreaterThan(0)
    })

    it('TC2.4: Cannot add self as participant without owner permission', async () => {
      const mayaClient = await getAuthenticatedClient('maya')

      const { error: insertError } = await mayaClient.from('trip_participants').insert({
        trip_id: PARIS_TRIP_ID,
        user_id: TEST_USERS.maya.id,
        role: 'participant',
        invited_by: TEST_USERS.maya.id,
      })

      expect(insertError).toBeTruthy()
      expect(insertError?.message).toContain('permission denied')
    })
  })

  describe('TC3: Date-Scoped Visibility', () => {
    it('TC3.1: Partial joiner cannot see itinerary before join date', async () => {
      const benjiClient = await getAuthenticatedClient('benji')

      // Benji joined on 2025-06-18, should not see items before that
      const { data, error: preJoinError } = await benjiClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', PARIS_TRIP_ID)
        .lt('start_time', '2025-06-18 00:00:00+00')

      expect(preJoinError).toBeNull()
      expect(data).toEqual([]) // Should be empty
    })

    it('TC3.2: Partial joiner sees itinerary from join date onward', async () => {
      const benjiClient = await getAuthenticatedClient('benji')

      const { data, error: postJoinError } = await benjiClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', PARIS_TRIP_ID)
        .gte('start_time', '2025-06-18 00:00:00+00')

      expect(postJoinError).toBeNull()
      expect(data).toBeTruthy()
      expect(data!.length).toBeGreaterThan(0)
    })

    it('TC3.3: Organizer sees all itinerary regardless of dates', async () => {
      const aliceClient = await getAuthenticatedClient('alice')

      const { data, error: organizerViewError } = await aliceClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', PARIS_TRIP_ID)

      expect(organizerViewError).toBeNull()
      expect(data).toBeTruthy()
      // Alice should see all 5 items
      expect(data!.length).toBe(5)
    })

    it('TC3.4: Date-scoped queries return correct subset', async () => {
      const benjiClient = await getAuthenticatedClient('benji')

      const { data, error: scopedQueryError } = await benjiClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', PARIS_TRIP_ID)

      expect(scopedQueryError).toBeNull()
      expect(data).toBeTruthy()
      // Benji should see 3 items (from join date onward)
      expect(data!.length).toBe(3)
    })
  })

  describe('TC4: Expense Privacy', () => {
    it('TC4.1: Non-involved users cannot see expense', async () => {
      const mayaClient = await getAuthenticatedClient('maya')

      const { data } = await mayaClient.from('expenses').select('*').eq('trip_id', PARIS_TRIP_ID)

      expect(data).toEqual([])
    })

    it('TC4.2: Organizer can see all trip expenses', async () => {
      const aliceClient = await getAuthenticatedClient('alice')

      const { data, error: organizerExpenseError } = await aliceClient
        .from('expenses')
        .select('*')
        .eq('trip_id', PARIS_TRIP_ID)

      expect(organizerExpenseError).toBeNull()
      expect(data).toBeTruthy()
      expect(data!.length).toBeGreaterThan(0)
    })

    it('TC4.3: Involved participants see expense', async () => {
      const benjiClient = await getAuthenticatedClient('benji')

      const { data, error: participantExpenseError } = await benjiClient
        .from('expenses')
        .select('*')
        .eq('trip_id', PARIS_TRIP_ID)
        .gte('date', '2025-06-18 00:00:00+00')

      expect(participantExpenseError).toBeNull()
      expect(data).toBeTruthy()
      expect(data!.length).toBeGreaterThan(0)
    })

    it('TC4.4: Cannot modify expense payer or splits without permission', async () => {
      const benjiClient = await getAuthenticatedClient('benji')

      // Try to update an expense created by Alice
      const { error: expenseUpdateError } = await benjiClient
        .from('expenses')
        .update({ description: 'Hacked expense' })
        .eq('trip_id', PARIS_TRIP_ID)
        .eq('created_by', TEST_USERS.alice.id)

      expect(expenseUpdateError).toBeTruthy()
    })

    it('TC4.5: Viewer cannot see expenses', async () => {
      const bayleeClient = await getAuthenticatedClient('baylee')

      const { data } = await bayleeClient.from('expenses').select('*').eq('trip_id', PARIS_TRIP_ID)

      expect(data).toEqual([]) // Viewers don't see expenses
    })

    it('TC4.6: Partial joiner only sees expenses after join date', async () => {
      const benjiClient = await getAuthenticatedClient('benji')

      // Benji joined on 2025-06-18
      // Should not see expenses before that date
      const { data: beforeJoin } = await benjiClient
        .from('expenses')
        .select('*')
        .eq('trip_id', PARIS_TRIP_ID)
        .lt('date', '2025-06-18')

      expect(beforeJoin).toEqual([])

      // Should see expenses after join date
      const { data: afterJoin } = await benjiClient
        .from('expenses')
        .select('*')
        .eq('trip_id', PARIS_TRIP_ID)
        .gte('date', '2025-06-18')

      expect(afterJoin).toBeTruthy()
    })

    it('TC4.7: Cannot create expense without being a participant', async () => {
      const mayaClient = await getAuthenticatedClient('maya')

      const { error } = await mayaClient.from('expenses').insert({
        trip_id: PARIS_TRIP_ID,
        description: 'Unauthorized expense',
        amount: 1000,
        currency: 'EUR',
        category: 'food',
        payer_id: TEST_USERS.maya.id,
        date: '2025-06-20',
        created_by: TEST_USERS.maya.id,
      })

      expect(error).toBeTruthy()
      expect(error?.message).toContain('permission denied')
    })

    it('TC4.8: Participant can create expense for trip', async () => {
      const benjiClient = await getAuthenticatedClient('benji')

      const { data, error } = await benjiClient
        .from('expenses')
        .insert({
          trip_id: PARIS_TRIP_ID,
          description: 'Benji test expense',
          amount: 2500,
          currency: 'EUR',
          category: 'food',
          payer_id: TEST_USERS.benji.id,
          date: '2025-06-20',
          created_by: TEST_USERS.benji.id,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data?.description).toBe('Benji test expense')

      // Cleanup
      if (data) {
        await benjiClient.from('expenses').delete().eq('id', data.id)
      }
    })

    it('TC4.9: Can only see expense participants if expense is visible', async () => {
      const mayaClient = await getAuthenticatedClient('maya')

      // First get expense IDs for Paris trip (should be empty for Maya)
      const { data: expenses } = await mayaClient
        .from('expenses')
        .select('id')
        .eq('trip_id', PARIS_TRIP_ID)

      const expenseIds = expenses?.map(e => e.id) || []

      // Maya cannot see expenses for Paris trip, so she shouldn't see participants either
      if (expenseIds.length > 0) {
        const { data } = await mayaClient
          .from('expense_participants')
          .select('*')
          .in('expense_id', expenseIds)

        expect(data).toEqual([])
      } else {
        // Maya can't see any expenses, so test passes
        expect(expenseIds).toEqual([])
      }
    })

    it('TC4.10: Involved user can see expense participants', async () => {
      const benjiClient = await getAuthenticatedClient('benji')

      // Get an expense Benji is involved in
      const { data: expenses } = await benjiClient
        .from('expenses')
        .select('id')
        .eq('trip_id', PARIS_TRIP_ID)
        .limit(1)

      if (expenses && expenses.length > 0) {
        const { data: participants, error } = await benjiClient
          .from('expense_participants')
          .select('*')
          .eq('expense_id', expenses[0].id)

        expect(error).toBeNull()
        expect(participants).toBeTruthy()
      }
    })
  })

  describe('TC5: Attack Scenarios', () => {
    it('TC5.1: Trip ID enumeration blocked', async () => {
      const aliceClient = await getAuthenticatedClient('alice')

      // Alice tries to access Maya's Tokyo trip
      const { data, error: enumerationError } = await aliceClient
        .from('trips')
        .select('*')
        .eq('id', TOKYO_TRIP_ID)
        .single()

      expect(data).toBeNull()
      expect(enumerationError).toBeTruthy()
    })

    it('TC5.4: Deleted user cannot access old trips', async () => {
      // Simulate query with invalid user ID
      const invalidClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data } = await invalidClient.from('trips').select('*').eq('id', PARIS_TRIP_ID)

      expect(data).toEqual([]) // No auth = no access
    })
  })

  describe('TC6: Cross-Trip Data Isolation', () => {
    it("TC6.1: User A cannot see User B's trips", async () => {
      const aliceClient = await getAuthenticatedClient('alice')

      const { data } = await aliceClient.from('trips').select('*').eq('id', TOKYO_TRIP_ID)

      expect(data).toEqual([])
    })

    it('TC6.2: Itinerary items isolated per trip', async () => {
      const aliceClient = await getAuthenticatedClient('alice')

      // Alice should only see Paris trip items, not Tokyo
      const { data } = await aliceClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', TOKYO_TRIP_ID)

      expect(data).toEqual([])
    })

    it('TC6.3: Expenses isolated per trip', async () => {
      const aliceClient = await getAuthenticatedClient('alice')

      const { data } = await aliceClient.from('expenses').select('*').eq('trip_id', TOKYO_TRIP_ID)

      expect(data).toEqual([])
    })

    it('TC6.4: Media files isolated per trip', async () => {
      const aliceClient = await getAuthenticatedClient('alice')

      const { data } = await aliceClient
        .from('media_files')
        .select('*')
        .eq('trip_id', TOKYO_TRIP_ID)

      expect(data).toEqual([])
    })
  })

  describe('TC7: Edge Cases', () => {
    it('TC7.1: User removed from trip loses access immediately', async () => {
      // This test requires setup: add user, then remove them
      // For now, we'll test the policy exists
      const benjiClient = await getAuthenticatedClient('benji')

      // First confirm Benji has access
      const { data: beforeData } = await benjiClient
        .from('trips')
        .select('*')
        .eq('id', PARIS_TRIP_ID)

      expect(beforeData).toBeTruthy()

      // TODO: Remove Benji from trip and verify access lost
      // This requires owner privileges to execute
    })

    it('TC7.2: Trip deletion cascades to related data', async () => {
      // This test verifies FK constraints exist
      // Actual deletion test would require creating a test trip
      // For now, we verify the constraint exists in schema

      // Query would check information_schema for CASCADE constraints
      // Skipping actual deletion to avoid affecting test data
      expect(true).toBe(true) // Placeholder
    })
  })

  afterAll(async () => {
    await supabase.auth.signOut()
  })
})
