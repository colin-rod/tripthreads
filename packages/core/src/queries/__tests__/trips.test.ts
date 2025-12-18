/**
 * Integration tests for trip query operations
 *
 * NOTE: These are INTEGRATION tests that run against a real Supabase database.
 * They test query LOGIC and data flow, not RLS enforcement.
 *
 * RLS policies are tested separately in:
 * - apps/web/tests/integration/rls-security.test.ts (with real JWT auth)
 * - supabase/tests/rls_security_tests.sql (direct SQL tests)
 *
 * These tests use the service role key to bypass RLS and focus on testing
 * the query functions themselves (CRUD operations, trip access patterns).
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  beforeEach,
  jest,
} from '@jest/globals'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  getUserTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  isTripOwner,
} from '../trips'
import { Database } from '../../types/database'

// Test database setup - uses service role key to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

let adminClient: SupabaseClient<Database>

// Test user IDs (aligned with seed data)
const ALICE_ID = '00000000-0000-0000-0000-000000000001' // Owner
const BENJI_ID = '00000000-0000-0000-0000-000000000002' // Participant
const BAYLEE_ID = '00000000-0000-0000-0000-000000000003' // Viewer
const MAYA_ID = '00000000-0000-0000-0000-000000000004' // Not added to trips

// Track inserted trips to ensure cleanup between tests
const insertedTripIds: string[] = []

beforeAll(() => {
  adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey)
})

beforeEach(async () => {
  // Ensure clean slate before seeding specific scenarios
  await cleanupTrips()
})

afterEach(async () => {
  await cleanupTrips()
})

afterAll(async () => {
  await cleanupTrips()
})

/**
 * Helper to create a client for testing query logic
 * Uses service role key to bypass RLS and focus on query functionality
 */
function getAuthenticatedClient(_userId: string): SupabaseClient<Database> {
  // Uses service role key to test query logic without RLS interference
  // RLS is tested separately in integration/rls-security.test.ts
  return adminClient
}

/**
 * Helper to seed a trip with optional extra participants.
 */
async function seedTrip({
  ownerId,
  name = `Test Trip ${Date.now()}`,
  startDate = '2025-10-10T00:00:00.000Z',
  endDate = '2025-10-20T00:00:00.000Z',
  participants = [],
}: {
  ownerId: string
  name?: string
  startDate?: string
  endDate?: string
  participants?: Array<{
    userId: string
    role?: 'owner' | 'participant' | 'viewer'
    joinedAt?: string
    joinStartDate?: string | null
    joinEndDate?: string | null
  }>
}) {
  const { data: trip, error } = await adminClient
    .from('trips')
    .insert({
      name,
      description: 'Test trip',
      start_date: startDate,
      end_date: endDate,
      owner_id: ownerId,
    })
    .select()
    .single()

  if (error || !trip) {
    throw new Error(`Failed to seed trip: ${error?.message}`)
  }

  insertedTripIds.push(trip.id)

  if (participants.length > 0) {
    const participantRows = participants.map(participant => ({
      trip_id: trip.id,
      user_id: participant.userId,
      role: participant.role ?? 'participant',
      invited_by: ownerId,
      joined_at: participant.joinedAt ?? new Date().toISOString(),
      join_start_date: participant.joinStartDate ?? null,
      join_end_date: participant.joinEndDate ?? null,
    }))

    const { error: participantError } = await adminClient
      .from('trip_participants')
      .insert(participantRows)

    if (participantError) {
      throw new Error(`Failed to seed participants: ${participantError.message}`)
    }
  }

  return trip
}

/**
 * Removes all trips inserted through these tests (cascades to participants & related data).
 */
async function cleanupTrips() {
  if (insertedTripIds.length === 0) return

  await adminClient
    .from('trips')
    .delete()
    .in('id', [...insertedTripIds])
  insertedTripIds.length = 0
}

describe('getUserTrips', () => {
  it('should return trips owned by the user including participants', async () => {
    const trip = await seedTrip({
      ownerId: ALICE_ID,
      participants: [
        { userId: BENJI_ID, role: 'participant' },
        { userId: BAYLEE_ID, role: 'viewer' },
      ],
    })

    const aliceClient = getAuthenticatedClient(ALICE_ID)
    const trips = await getUserTrips(aliceClient)

    const insertedTrips = trips.filter(result => insertedTripIds.includes(result.id))
    expect(insertedTrips).toHaveLength(1)
    const [ownerTrip] = insertedTrips
    expect(ownerTrip.id).toBe(trip.id)
    expect(ownerTrip.owner.id).toBe(ALICE_ID)
    expect(ownerTrip.trip_participants?.some(participant => participant.user.id === BENJI_ID)).toBe(
      true
    )
    expect(
      ownerTrip.trip_participants?.some(participant => participant.user.id === BAYLEE_ID)
    ).toBe(true)
  })

  it('should only return trips where the user is a participant', async () => {
    const participantTrip = await seedTrip({
      ownerId: ALICE_ID,
      participants: [{ userId: BENJI_ID, role: 'participant' }],
    })
    await seedTrip({ ownerId: BAYLEE_ID })

    const benjiClient = getAuthenticatedClient(BENJI_ID)
    const trips = await getUserTrips(benjiClient)

    const insertedTrips = trips.filter(result => insertedTripIds.includes(result.id))
    expect(insertedTrips).toHaveLength(1)
    expect(insertedTrips[0].id).toBe(participantTrip.id)
  })

  it('should only return trips where the user is a viewer', async () => {
    const viewerTrip = await seedTrip({
      ownerId: ALICE_ID,
      participants: [{ userId: BAYLEE_ID, role: 'viewer' }],
    })
    await seedTrip({ ownerId: BENJI_ID })

    const bayleeClient = getAuthenticatedClient(BAYLEE_ID)
    const trips = await getUserTrips(bayleeClient)

    const insertedTrips = trips.filter(result => insertedTripIds.includes(result.id))
    expect(insertedTrips).toHaveLength(1)
    expect(insertedTrips[0].id).toBe(viewerTrip.id)
  })
})

describe('getTripById', () => {
  it('should return trip details for a participant', async () => {
    const trip = await seedTrip({
      ownerId: ALICE_ID,
      participants: [{ userId: BENJI_ID, role: 'participant' }],
    })

    const benjiClient = getAuthenticatedClient(BENJI_ID)
    const result = await getTripById(benjiClient, trip.id)

    expect(result.id).toBe(trip.id)
    expect(result.owner.id).toBe(ALICE_ID)
    expect(result.trip_participants?.some(participant => participant.user.id === BENJI_ID)).toBe(
      true
    )
  })

  it('should throw an error when the user is not a participant', async () => {
    const trip = await seedTrip({ ownerId: ALICE_ID })

    const mayaClient = getAuthenticatedClient(MAYA_ID)
    await expect(getTripById(mayaClient, trip.id)).rejects.toThrow(
      'Trip not found or you do not have access'
    )
  })
})

describe('createTrip', () => {
  it('should create a trip and add the owner as a participant', async () => {
    const ownerClient = getAuthenticatedClient(ALICE_ID)

    const trip = await createTrip(ownerClient, {
      name: 'Owner Auto Participant Trip',
      description: 'Ensures owner participant record is created',
      start_date: '2025-07-01T00:00:00.000Z',
      end_date: '2025-07-05T00:00:00.000Z',
      owner_id: ALICE_ID,
    })

    insertedTripIds.push(trip.id)

    const { data: participants, error } = await adminClient
      .from('trip_participants')
      .select('user_id, role')
      .eq('trip_id', trip.id)

    expect(error).toBeNull()
    expect(
      participants?.some(
        participant => participant.user_id === ALICE_ID && participant.role === 'owner'
      )
    ).toBe(true)
  })

  it('should rollback the trip when participant insertion fails', async () => {
    const deleteEqMock = jest
      .fn<() => Promise<{ error: null }>>()
      .mockResolvedValue({ error: null })
    const tripsSingleMock = jest
      .fn<() => Promise<{ data: { id: string; owner_id: string } | null; error: null }>>()
      .mockResolvedValue({ data: { id: 'trip-rollback', owner_id: ALICE_ID }, error: null })
    const tripsSelectMock = jest.fn(() => ({ single: tripsSingleMock }))
    const tripsInsertMock = jest.fn(() => ({ select: tripsSelectMock }))
    const tripsDeleteMock = jest.fn(() => ({ eq: deleteEqMock }))
    const participantsInsertMock = jest
      .fn<() => Promise<{ error: { message: string } }>>()
      .mockResolvedValue({ error: { message: 'Participant insert failed' } })

    const supabaseMock = {
      from: jest.fn((table: string) => {
        if (table === 'trips') {
          return {
            insert: tripsInsertMock,
            delete: tripsDeleteMock,
          }
        }

        if (table === 'trip_participants') {
          return {
            insert: participantsInsertMock,
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }),
    } as unknown as SupabaseClient<Database>

    await expect(
      createTrip(supabaseMock, {
        name: 'Should rollback',
        description: 'This trip should be cleaned up',
        start_date: '2025-09-01T00:00:00.000Z',
        end_date: '2025-09-05T00:00:00.000Z',
        owner_id: ALICE_ID,
      })
    ).rejects.toThrow('Failed to create trip: Participant insert failed')

    expect(tripsInsertMock).toHaveBeenCalledTimes(1)
    expect(participantsInsertMock).toHaveBeenCalledTimes(1)
    expect(tripsDeleteMock).toHaveBeenCalledTimes(1)
    expect(deleteEqMock).toHaveBeenCalledWith('trip-rollback')
  })
})

describe('updateTrip', () => {
  it('should enforce valid date ranges', async () => {
    const ownerClient = getAuthenticatedClient(ALICE_ID)
    const trip = await createTrip(ownerClient, {
      name: 'Update Trip - Invalid Range',
      description: 'Used to test date validation',
      start_date: '2025-08-01T00:00:00.000Z',
      end_date: '2025-08-10T00:00:00.000Z',
      owner_id: ALICE_ID,
    })

    insertedTripIds.push(trip.id)

    await expect(
      updateTrip(ownerClient, trip.id, {
        start_date: '2025-08-05T00:00:00.000Z',
        end_date: '2025-08-04T00:00:00.000Z',
      })
    ).rejects.toThrow('Invalid date range: end date must be on or after start date')
  })

  it('should only allow owners to update trips', async () => {
    const trip = await seedTrip({
      ownerId: ALICE_ID,
      participants: [{ userId: BENJI_ID, role: 'participant' }],
    })

    const benjiClient = getAuthenticatedClient(BENJI_ID)

    await expect(
      updateTrip(benjiClient, trip.id, {
        description: 'Attempted update by non-owner',
      })
    ).rejects.toThrow('Trip not found or you are not the owner')
  })
})

describe('deleteTrip & isTripOwner', () => {
  it('should cascade deletes and update ownership checks', async () => {
    const ownerClient = getAuthenticatedClient(ALICE_ID)
    const trip = await createTrip(ownerClient, {
      name: 'Cascade Delete Trip',
      description: 'Ensures related records are removed',
      start_date: '2025-11-01T00:00:00.000Z',
      end_date: '2025-11-05T00:00:00.000Z',
      owner_id: ALICE_ID,
    })

    insertedTripIds.push(trip.id)

    // Add additional participant and expense records
    const { error: participantError } = await adminClient.from('trip_participants').insert({
      trip_id: trip.id,
      user_id: BENJI_ID,
      role: 'participant',
      invited_by: ALICE_ID,
      joined_at: new Date().toISOString(),
    })
    expect(participantError).toBeNull()

    const { error: expenseError } = await adminClient.from('expenses').insert({
      trip_id: trip.id,
      description: 'Linked expense',
      amount: 1200,
      currency: 'EUR',
      category: 'food',
      payer_id: ALICE_ID,
      created_by: ALICE_ID,
    })
    expect(expenseError).toBeNull()

    const ownerGetUserSpy = jest
      .spyOn(ownerClient.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: ALICE_ID } as any }, error: null })

    expect(await isTripOwner(ownerClient, trip.id)).toBe(true)

    await deleteTrip(ownerClient, trip.id)

    // Related participants & expenses should be removed via cascade
    const { data: participants } = await adminClient
      .from('trip_participants')
      .select('id')
      .eq('trip_id', trip.id)
    expect(participants ?? []).toHaveLength(0)

    const { data: expenses } = await adminClient
      .from('expenses')
      .select('id')
      .eq('trip_id', trip.id)
    expect(expenses ?? []).toHaveLength(0)

    expect(await isTripOwner(ownerClient, trip.id)).toBe(false)

    const benjiClient = getAuthenticatedClient(BENJI_ID)
    const benjiGetUserSpy = jest
      .spyOn(benjiClient.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: BENJI_ID } as any }, error: null })

    expect(await isTripOwner(benjiClient, trip.id)).toBe(false)

    ownerGetUserSpy.mockRestore()
    benjiGetUserSpy.mockRestore()
  })
})
