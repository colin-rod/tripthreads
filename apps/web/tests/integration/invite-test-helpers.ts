/**
 * Invite System Test Helpers
 *
 * Utilities for testing the complete invite flow including:
 * - Invite link generation
 * - Email invites
 * - Invite acceptance
 * - Role assignment
 * - Date-scoped visibility
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { InviteRole } from '@/types/invite'

// Test user credentials (from seed.sql)
export const TEST_USERS = {
  alice: {
    id: 'ea1854fb-b8f4-480f-899f-af1bcf0218b3',
    email: 'temp@test.com',
    password: 'test123456',
  },
  benji: {
    id: '0af9094b-dedb-4472-8133-20577fbc8f98',
    email: 'benji@temp.com',
    password: 'test123456',
  },
  baylee: {
    id: '29f0dac4-7629-45f8-8fa1-10e0df75ce1b',
    email: 'baylee@temp.com',
    password: 'test123456',
  },
  maya: {
    id: 'aafa06ac-21e0-4d4e-bb0c-97e1ae2ae13e',
    email: 'maya@test.com',
    password: 'test123456',
  },
}

export const TEST_TRIP_IDS = {
  paris: '10000000-0000-0000-0000-000000000001',
  tokyo: '20000000-0000-0000-0000-000000000002',
}

/**
 * Create an authenticated Supabase client for a specific test user
 */
export async function getAuthenticatedClient(
  user: keyof typeof TEST_USERS
): Promise<SupabaseClient<Database>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey)
  const { email, password } = TEST_USERS[user]

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(`Failed to authenticate as ${user}: ${error.message}`)
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    },
  })
}

/**
 * Create a test trip with a specific owner
 */
export async function createTestTrip(
  client: SupabaseClient<Database>,
  ownerId: string,
  overrides?: Partial<Database['public']['Tables']['trips']['Insert']>
) {
  const trip = {
    name: `Test Trip ${Date.now()}`,
    description: 'Test trip for invite system',
    start_date: '2025-12-01',
    end_date: '2025-12-10',
    owner_id: ownerId,
    ...overrides,
  }

  const { data, error } = await client.from('trips').insert(trip).select().single()

  if (error) {
    throw new Error(`Failed to create test trip: ${error.message}`)
  }

  return data
}

/**
 * Generate an invite link for a trip
 */
export async function generateInviteLink(
  client: SupabaseClient<Database>,
  tripId: string,
  role: InviteRole = 'participant'
) {
  const { data, error } = await client
    .from('trip_invites')
    .insert({
      trip_id: tripId,
      role,
      invite_type: 'link',
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to generate invite link: ${error.message}`)
  }

  return data
}

/**
 * Create an email invite
 */
export async function createEmailInvite(
  client: SupabaseClient<Database>,
  tripId: string,
  email: string,
  role: InviteRole = 'participant'
) {
  const { data, error } = await client
    .from('trip_invites')
    .insert({
      trip_id: tripId,
      email,
      role,
      invite_type: 'email',
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create email invite: ${error.message}`)
  }

  return data
}

/**
 * Accept an invite with optional date range (for partial joiners)
 */
export async function acceptInvite(
  client: SupabaseClient<Database>,
  userId: string,
  token: string,
  dateRange?: {
    join_start_date: string
    join_end_date: string
  }
) {
  // First, get the invite details
  const { data: invite, error: inviteError } = await client
    .from('trip_invites')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (inviteError || !invite) {
    throw new Error(`Invite not found or already used: ${inviteError?.message}`)
  }

  // Check if user is already a participant
  const { data: existingParticipant } = await client
    .from('trip_participants')
    .select('id')
    .eq('trip_id', invite.trip_id)
    .eq('user_id', userId)
    .single()

  if (existingParticipant) {
    throw new Error('User is already a participant')
  }

  // Add user as participant
  const { data: participant, error: participantError } = await client
    .from('trip_participants')
    .insert({
      trip_id: invite.trip_id,
      user_id: userId,
      role: invite.role,
      invited_by: invite.invited_by,
      ...dateRange,
    })
    .select()
    .single()

  if (participantError) {
    throw new Error(`Failed to add participant: ${participantError.message}`)
  }

  // Update invite status
  if (invite.invite_type === 'email') {
    // Email invites are one-time use
    await client
      .from('trip_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id)
  } else {
    // Link invites increment use count
    await client
      .from('trip_invites')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id)
  }

  return participant
}

/**
 * Verify participant has correct access to trip data
 */
export async function verifyParticipantAccess(
  client: SupabaseClient<Database>,
  userId: string,
  tripId: string,
  expectedRole: InviteRole,
  dateRange?: {
    join_start_date: string
    join_end_date: string
  }
) {
  // Verify participant record exists
  const { data: participant, error: participantError } = await client
    .from('trip_participants')
    .select('*')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single()

  if (participantError) {
    throw new Error(`Participant not found: ${participantError.message}`)
  }

  // Verify role
  if (participant.role !== expectedRole) {
    throw new Error(
      `Role mismatch: expected ${expectedRole}, got ${participant.role}`
    )
  }

  // Verify date range if provided
  if (dateRange) {
    if (participant.join_start_date !== dateRange.join_start_date) {
      throw new Error('Join start date mismatch')
    }
    if (participant.join_end_date !== dateRange.join_end_date) {
      throw new Error('Join end date mismatch')
    }
  }

  // Verify trip access
  const { data: trip, error: tripError } = await client
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single()

  if (tripError) {
    throw new Error(`Cannot access trip: ${tripError.message}`)
  }

  return { participant, trip }
}

/**
 * Revoke an invite
 */
export async function revokeInvite(
  client: SupabaseClient<Database>,
  inviteId: string
) {
  const { error } = await client
    .from('trip_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)

  if (error) {
    throw new Error(`Failed to revoke invite: ${error.message}`)
  }
}

/**
 * Clean up test data: remove participant and invites for a trip
 */
export async function cleanupTestInvites(
  client: SupabaseClient<Database>,
  tripId: string
) {
  // Delete invites
  await client.from('trip_invites').delete().eq('trip_id', tripId)
}

/**
 * Clean up test trip and all associated data
 */
export async function cleanupTestTrip(
  client: SupabaseClient<Database>,
  tripId: string
) {
  // Delete in order due to FK constraints
  await client.from('trip_invites').delete().eq('trip_id', tripId)
  await client.from('trip_participants').delete().eq('trip_id', tripId)
  await client.from('itinerary_items').delete().eq('trip_id', tripId)
  await client.from('expenses').delete().eq('trip_id', tripId)
  await client.from('media_files').delete().eq('trip_id', tripId)
  await client.from('trips').delete().eq('id', tripId)
}

/**
 * Complete invite flow helper: create trip, generate invite, accept invite
 */
export async function testInviteFlow(
  organizerClient: SupabaseClient<Database>,
  inviteeClient: SupabaseClient<Database>,
  organizerId: string,
  inviteeId: string,
  role: InviteRole = 'participant',
  dateRange?: {
    join_start_date: string
    join_end_date: string
  }
) {
  // Create trip
  const trip = await createTestTrip(organizerClient, organizerId)

  // Generate invite
  const invite = await generateInviteLink(organizerClient, trip.id, role)

  // Accept invite
  const participant = await acceptInvite(
    inviteeClient,
    inviteeId,
    invite.token,
    dateRange
  )

  // Verify access
  await verifyParticipantAccess(inviteeClient, inviteeId, trip.id, role, dateRange)

  return { trip, invite, participant }
}

/**
 * Create a tampered/invalid token for security testing
 */
export function createInvalidToken(): string {
  return 'invalid-token-12345678901234567890'
}

/**
 * Create an expired invite (by manipulating created_at)
 * Note: This requires direct DB access or service role key
 */
export async function createExpiredInvite(
  client: SupabaseClient<Database>,
  tripId: string,
  role: InviteRole = 'participant'
) {
  // Create invite
  const invite = await generateInviteLink(client, tripId, role)

  // Manually update created_at to be 8 days ago (past 7-day expiry)
  const expiredDate = new Date()
  expiredDate.setDate(expiredDate.getDate() - 8)

  // Note: This will only work with service role key
  const { error } = await client
    .from('trip_invites')
    .update({ created_at: expiredDate.toISOString() })
    .eq('id', invite.id)

  if (error) {
    console.warn('Could not create expired invite (requires service role key)')
  }

  return invite
}

/**
 * Simulate concurrent invite acceptance (race condition test)
 */
export async function testConcurrentAcceptance(
  client1: SupabaseClient<Database>,
  client2: SupabaseClient<Database>,
  userId1: string,
  userId2: string,
  token: string
) {
  // Both users try to accept the same email invite simultaneously
  const results = await Promise.allSettled([
    acceptInvite(client1, userId1, token),
    acceptInvite(client2, userId2, token),
  ])

  return results
}

/**
 * Check rate limiting for invite generation
 */
export async function testRateLimit(
  client: SupabaseClient<Database>,
  tripId: string,
  maxInvites: number = 100
) {
  const invites = []
  let error = null

  for (let i = 0; i < maxInvites + 1; i++) {
    const result = await generateInviteLink(client, tripId)
    if (result) {
      invites.push(result)
    } else {
      error = 'Rate limit exceeded'
      break
    }
  }

  return { invites, error }
}
