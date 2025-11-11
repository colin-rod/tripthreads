/**
 * Integration Tests: Itinerary CRUD Operations
 *
 * Tests the complete flow of creating, reading, updating, and deleting itinerary items
 * with proper RLS enforcement for different user roles.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@tripthreads/core'

// Check if Supabase environment variables are available
const hasSupabaseEnv =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Skip all integration tests if Supabase environment variables are not available
const describeIntegration = hasSupabaseEnv ? describe : describe.skip

// Log skip reason if environment is missing
if (!hasSupabaseEnv) {
  console.log(
    '\n⏭️  Skipping itinerary CRUD integration tests: Supabase environment variables not configured.\n' +
      'To run these tests:\n' +
      '  1. Copy .env.example to .env.local\n' +
      '  2. Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY\n'
  )
}

// Test configuration - read in beforeAll after env vars are loaded
let SUPABASE_URL: string
let SUPABASE_ANON_KEY: string

// Test users (these should exist in your test database)
const TEST_USERS = {
  owner: {
    email: 'owner@test.com',
    password: 'testpassword123',
    id: '',
  },
  participant: {
    email: 'participant@test.com',
    password: 'testpassword123',
    id: '',
  },
  viewer: {
    email: 'viewer@test.com',
    password: 'testpassword123',
    id: '',
  },
}

let testTripId: string
let testItemId: string

describeIntegration('Itinerary CRUD Integration Tests', () => {
  let ownerClient: ReturnType<typeof createClient<Database>>
  let participantClient: ReturnType<typeof createClient<Database>>
  let viewerClient: ReturnType<typeof createClient<Database>>

  beforeAll(async () => {
    // Load environment variables (available after jest.setup.cjs runs)
    SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Create authenticated clients for each user
    ownerClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
    participantClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
    viewerClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Sign in as owner
    const { data: ownerAuth } = await ownerClient.auth.signInWithPassword({
      email: TEST_USERS.owner.email,
      password: TEST_USERS.owner.password,
    })
    TEST_USERS.owner.id = ownerAuth.user!.id

    // Sign in as participant
    const { data: participantAuth } = await participantClient.auth.signInWithPassword({
      email: TEST_USERS.participant.email,
      password: TEST_USERS.participant.password,
    })
    TEST_USERS.participant.id = participantAuth.user!.id

    // Sign in as viewer
    const { data: viewerAuth } = await viewerClient.auth.signInWithPassword({
      email: TEST_USERS.viewer.email,
      password: TEST_USERS.viewer.password,
    })
    TEST_USERS.viewer.id = viewerAuth.user!.id

    // Create a test trip
    const { data: trip, error } = await ownerClient
      .from('trips')
      .insert({
        name: 'Test Trip for Itinerary',
        description: 'Testing itinerary CRUD operations',
        start_date: '2025-06-15T00:00:00Z',
        end_date: '2025-06-22T00:00:00Z',
        owner_id: TEST_USERS.owner.id,
      })
      .select()
      .single()

    if (error) throw error
    testTripId = trip.id

    // Add participant
    await ownerClient.from('trip_participants').insert({
      trip_id: testTripId,
      user_id: TEST_USERS.participant.id,
      role: 'participant',
      invited_by: TEST_USERS.owner.id,
    })

    // Add viewer
    await ownerClient.from('trip_participants').insert({
      trip_id: testTripId,
      user_id: TEST_USERS.viewer.id,
      role: 'viewer',
      invited_by: TEST_USERS.owner.id,
    })
  })

  afterAll(async () => {
    // Clean up test trip (CASCADE will delete participants and items)
    if (testTripId && ownerClient) {
      await ownerClient.from('trips').delete().eq('id', testTripId)
    }

    // Sign out all clients
    if (ownerClient) await ownerClient.auth.signOut()
    if (participantClient) await participantClient.auth.signOut()
    if (viewerClient) await viewerClient.auth.signOut()
  })

  describe('CREATE Operations', () => {
    it('should allow owner to create itinerary item', async () => {
      const { data, error } = await ownerClient
        .from('itinerary_items')
        .insert({
          trip_id: testTripId,
          type: 'transport',
          title: 'Flight to Lisbon',
          description: 'Morning flight',
          start_time: '2025-06-15T08:00:00Z',
          location: 'Airport',
          created_by: TEST_USERS.owner.id,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.title).toBe('Flight to Lisbon')
      expect(data?.type).toBe('transport')

      testItemId = data!.id
    })

    it('should allow participant to create itinerary item', async () => {
      const { data, error } = await participantClient
        .from('itinerary_items')
        .insert({
          trip_id: testTripId,
          type: 'activity',
          title: 'City Walking Tour',
          start_time: '2025-06-16T10:00:00Z',
          created_by: TEST_USERS.participant.id,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.title).toBe('City Walking Tour')
    })

    it('should NOT allow viewer to create itinerary item', async () => {
      const { data, error } = await viewerClient
        .from('itinerary_items')
        .insert({
          trip_id: testTripId,
          type: 'dining',
          title: 'Dinner Reservation',
          start_time: '2025-06-16T19:00:00Z',
          created_by: TEST_USERS.viewer.id,
        })
        .select()
        .single()

      expect(error).not.toBeNull()
      expect(data).toBeNull()
    })

    it('should create item with all new fields (notes, links, metadata)', async () => {
      const { data, error } = await ownerClient
        .from('itinerary_items')
        .insert({
          trip_id: testTripId,
          type: 'accommodation',
          title: 'Hotel Check-in',
          description: 'Downtown hotel',
          notes: 'Confirmation code: ABC123',
          links: [
            { title: 'Booking Confirmation', url: 'https://booking.com/123' },
            { title: 'Hotel Website', url: 'https://hotel.com' },
          ],
          is_all_day: false,
          metadata: {
            accommodation_type: 'hotel',
            check_in_time: '15:00',
            confirmation_number: 'ABC123',
          },
          start_time: '2025-06-15T15:00:00Z',
          location: 'Downtown Hotel',
          created_by: TEST_USERS.owner.id,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.notes).toBe('Confirmation code: ABC123')
      expect(Array.isArray(data?.links)).toBe(true)
      expect((data?.links as Array<{ title: string; url: string }>)[0].title).toBe(
        'Booking Confirmation'
      )
      expect(data?.metadata).toBeDefined()
      expect((data?.metadata as Record<string, unknown>).accommodation_type).toBe('hotel')
    })

    it('should create all-day event', async () => {
      const { data, error } = await ownerClient
        .from('itinerary_items')
        .insert({
          trip_id: testTripId,
          type: 'general',
          title: 'Beach Day',
          is_all_day: true,
          start_time: '2025-06-17T00:00:00Z',
          created_by: TEST_USERS.owner.id,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.is_all_day).toBe(true)
    })
  })

  describe('READ Operations', () => {
    it('should allow all trip participants to read itinerary items', async () => {
      // Owner can read
      const { data: ownerData, error: ownerError } = await ownerClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', testTripId)

      expect(ownerError).toBeNull()
      expect(ownerData).toBeDefined()
      expect(ownerData!.length).toBeGreaterThan(0)

      // Participant can read
      const { data: participantData, error: participantError } = await participantClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', testTripId)

      expect(participantError).toBeNull()
      expect(participantData).toBeDefined()

      // Viewer can read
      const { data: viewerData, error: viewerError } = await viewerClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', testTripId)

      expect(viewerError).toBeNull()
      expect(viewerData).toBeDefined()
    })

    it('should read item with participants', async () => {
      // Create item with specific participants
      const { data: item } = await ownerClient
        .from('itinerary_items')
        .insert({
          trip_id: testTripId,
          type: 'activity',
          title: 'Private Tour',
          start_time: '2025-06-18T10:00:00Z',
          created_by: TEST_USERS.owner.id,
        })
        .select()
        .single()

      // Add participant
      await ownerClient.from('itinerary_item_participants').insert({
        itinerary_item_id: item!.id,
        user_id: TEST_USERS.participant.id,
      })

      // Read with participants
      const { data, error } = await ownerClient
        .from('itinerary_items')
        .select(
          `
          *,
          participants:itinerary_item_participants(
            id,
            user_id
          )
        `
        )
        .eq('id', item!.id)
        .single()

      expect(error).toBeNull()
      expect(data?.participants).toBeDefined()
      expect(Array.isArray(data?.participants)).toBe(true)
    })
  })

  describe('UPDATE Operations', () => {
    it('should allow creator to update their own item', async () => {
      const { data, error } = await ownerClient
        .from('itinerary_items')
        .update({
          title: 'Flight to Lisbon - Updated',
          description: 'Updated description',
        })
        .eq('id', testItemId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.title).toBe('Flight to Lisbon - Updated')
      expect(data?.description).toBe('Updated description')
    })

    it('should allow trip owner to update any item', async () => {
      // Create item as participant
      const { data: item } = await participantClient
        .from('itinerary_items')
        .insert({
          trip_id: testTripId,
          type: 'dining',
          title: 'Lunch',
          start_time: '2025-06-16T13:00:00Z',
          created_by: TEST_USERS.participant.id,
        })
        .select()
        .single()

      // Owner updates participant's item
      const { data, error } = await ownerClient
        .from('itinerary_items')
        .update({ title: 'Lunch - Owner Updated' })
        .eq('id', item!.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.title).toBe('Lunch - Owner Updated')
    })

    it('should NOT allow viewer to update items', async () => {
      const { data, error } = await viewerClient
        .from('itinerary_items')
        .update({ title: 'Should Fail' })
        .eq('id', testItemId)
        .select()
        .single()

      expect(error).not.toBeNull()
      expect(data).toBeNull()
    })

    it('should update item with new fields', async () => {
      const { data, error } = await ownerClient
        .from('itinerary_items')
        .update({
          notes: 'Updated notes',
          links: [{ title: 'New Link', url: 'https://example.com' }],
          metadata: { transport_type: 'flight', flight_number: 'TP123' },
        })
        .eq('id', testItemId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.notes).toBe('Updated notes')
      expect(Array.isArray(data?.links)).toBe(true)
    })
  })

  describe('DELETE Operations', () => {
    it('should allow creator to delete their own item', async () => {
      // Create item to delete
      const { data: item } = await participantClient
        .from('itinerary_items')
        .insert({
          trip_id: testTripId,
          type: 'general',
          title: 'To Delete',
          start_time: '2025-06-19T10:00:00Z',
          created_by: TEST_USERS.participant.id,
        })
        .select()
        .single()

      const { error } = await participantClient.from('itinerary_items').delete().eq('id', item!.id)

      expect(error).toBeNull()

      // Verify deleted
      const { data: check } = await participantClient
        .from('itinerary_items')
        .select()
        .eq('id', item!.id)
        .single()

      expect(check).toBeNull()
    })

    it('should allow trip owner to delete any item', async () => {
      // Create item as participant
      const { data: item } = await participantClient
        .from('itinerary_items')
        .insert({
          trip_id: testTripId,
          type: 'activity',
          title: 'Owner Will Delete',
          start_time: '2025-06-19T11:00:00Z',
          created_by: TEST_USERS.participant.id,
        })
        .select()
        .single()

      // Owner deletes
      const { error } = await ownerClient.from('itinerary_items').delete().eq('id', item!.id)

      expect(error).toBeNull()
    })

    it('should NOT allow viewer to delete items', async () => {
      const { error } = await viewerClient.from('itinerary_items').delete().eq('id', testItemId)

      expect(error).not.toBeNull()

      // Verify still exists
      const { data } = await ownerClient
        .from('itinerary_items')
        .select()
        .eq('id', testItemId)
        .single()

      expect(data).not.toBeNull()
    })

    it('should CASCADE delete participants when item is deleted', async () => {
      // Create item with participant
      const { data: item } = await ownerClient
        .from('itinerary_items')
        .insert({
          trip_id: testTripId,
          type: 'activity',
          title: 'With Participants',
          start_time: '2025-06-20T10:00:00Z',
          created_by: TEST_USERS.owner.id,
        })
        .select()
        .single()

      // Add participant
      await ownerClient.from('itinerary_item_participants').insert({
        itinerary_item_id: item!.id,
        user_id: TEST_USERS.participant.id,
      })

      // Delete item
      await ownerClient.from('itinerary_items').delete().eq('id', item!.id)

      // Verify participants were CASCADE deleted
      const { data: participants } = await ownerClient
        .from('itinerary_item_participants')
        .select()
        .eq('itinerary_item_id', item!.id)

      expect(participants).toEqual([])
    })
  })

  describe('Participant Management', () => {
    it('should allow adding participants to items', async () => {
      const { data: item } = await ownerClient
        .from('itinerary_items')
        .insert({
          trip_id: testTripId,
          type: 'activity',
          title: 'Group Activity',
          start_time: '2025-06-21T10:00:00Z',
          created_by: TEST_USERS.owner.id,
        })
        .select()
        .single()

      const { error } = await ownerClient.from('itinerary_item_participants').insert({
        itinerary_item_id: item!.id,
        user_id: TEST_USERS.participant.id,
      })

      expect(error).toBeNull()
    })

    it('should NOT allow duplicate participant entries', async () => {
      const { data: item } = await ownerClient
        .from('itinerary_items')
        .insert({
          trip_id: testTripId,
          type: 'activity',
          title: 'Test Duplicate',
          start_time: '2025-06-21T11:00:00Z',
          created_by: TEST_USERS.owner.id,
        })
        .select()
        .single()

      // Add participant once
      await ownerClient.from('itinerary_item_participants').insert({
        itinerary_item_id: item!.id,
        user_id: TEST_USERS.participant.id,
      })

      // Try to add same participant again
      const { error } = await ownerClient.from('itinerary_item_participants').insert({
        itinerary_item_id: item!.id,
        user_id: TEST_USERS.participant.id,
      })

      expect(error).not.toBeNull()
      expect(error?.code).toBe('23505') // Unique constraint violation
    })
  })
})
