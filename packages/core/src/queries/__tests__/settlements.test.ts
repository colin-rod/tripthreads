/**
 * Unit tests for settlement query operations
 *
 * Tests settlement calculation, FX conversion, RLS enforcement, and date-scoped visibility.
 * Following TDD methodology - these tests are written BEFORE implementation.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getSettlementSummary } from '../settlements'
import { createExpense } from '../expenses'

// Test database setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

let adminClient: SupabaseClient

// Test data IDs (from seed data)
const TEST_TRIP_ID = '00000000-0000-0000-0000-000000000001'
const ALICE_ID = '00000000-0000-0000-0000-000000000001' // Owner
const BENJI_ID = '00000000-0000-0000-0000-000000000002' // Participant
const BAYLEE_ID = '00000000-0000-0000-0000-000000000003' // Viewer
// const MAYA_ID = '00000000-0000-0000-0000-000000000004' // Partial joiner (joined 2025-10-14) - TODO: Add tests for partial joiners

beforeAll(() => {
  adminClient = createClient(supabaseUrl, supabaseServiceKey)
})

beforeEach(async () => {
  // Clean up test expenses before each test
  await adminClient.from('expenses').delete().eq('trip_id', TEST_TRIP_ID)
})

afterAll(async () => {
  // Cleanup
  await adminClient.from('expenses').delete().eq('trip_id', TEST_TRIP_ID)
})

/**
 * Helper to create authenticated client for a specific user
 */
function getAuthenticatedClient(userId: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      headers: {
        'X-User-Id': userId,
      },
    },
  })
}

describe('getSettlementSummary', () => {
  it('should return empty summary when no expenses exist', async () => {
    const aliceClient = getAuthenticatedClient(ALICE_ID)
    const summary = await getSettlementSummary(aliceClient, TEST_TRIP_ID)

    expect(summary.balances).toEqual([])
    expect(summary.settlements).toEqual([])
    expect(summary.total_expenses).toBe(0)
    expect(summary.excluded_expenses).toEqual([])
  })

  it('should calculate balances for single expense with equal split', async () => {
    // Alice pays €60, split 3 ways
    await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Dinner',
      amount: 6000, // €60.00
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      participants: [
        { userId: ALICE_ID, shareType: 'equal' },
        { userId: BENJI_ID, shareType: 'equal' },
        { userId: BAYLEE_ID, shareType: 'equal' },
      ],
    })

    const aliceClient = getAuthenticatedClient(ALICE_ID)
    const summary = await getSettlementSummary(aliceClient, TEST_TRIP_ID)

    expect(summary.total_expenses).toBe(1)
    expect(summary.balances).toHaveLength(3)

    // Alice paid €60, owes €20, net +€40
    const alice = summary.balances.find(b => b.user_id === ALICE_ID)
    expect(alice?.net_balance).toBe(4000)

    // Benji owes €20
    const benji = summary.balances.find(b => b.user_id === BENJI_ID)
    expect(benji?.net_balance).toBe(-2000)

    // Baylee owes €20
    const baylee = summary.balances.find(b => b.user_id === BAYLEE_ID)
    expect(baylee?.net_balance).toBe(-2000)
  })

  it('should optimize settlements to minimize transactions', async () => {
    // Create scenario: Alice +€40, Benji -€20, Baylee -€20
    await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Dinner',
      amount: 6000,
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      participants: [
        { userId: ALICE_ID, shareType: 'equal' },
        { userId: BENJI_ID, shareType: 'equal' },
        { userId: BAYLEE_ID, shareType: 'equal' },
      ],
    })

    const aliceClient = getAuthenticatedClient(ALICE_ID)
    const summary = await getSettlementSummary(aliceClient, TEST_TRIP_ID)

    // Should create 2 optimal settlements
    expect(summary.settlements).toHaveLength(2)

    // Benji pays Alice €20
    const benjiSettlement = summary.settlements.find(
      s => s.from_user_id === BENJI_ID && s.to_user_id === ALICE_ID
    )
    expect(benjiSettlement?.amount).toBe(2000)

    // Baylee pays Alice €20
    const bayleeSettlement = summary.settlements.find(
      s => s.from_user_id === BAYLEE_ID && s.to_user_id === ALICE_ID
    )
    expect(bayleeSettlement?.amount).toBe(2000)
  })

  it('should handle multiple expenses with different payers', async () => {
    // Alice pays €100, split with Benji
    await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Hotel',
      amount: 10000,
      currency: 'EUR',
      category: 'accommodation',
      payerId: ALICE_ID,
      participants: [
        { userId: ALICE_ID, shareType: 'equal' },
        { userId: BENJI_ID, shareType: 'equal' },
      ],
    })

    // Benji pays €60, split with Alice
    await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Dinner',
      amount: 6000,
      currency: 'EUR',
      category: 'food',
      payerId: BENJI_ID,
      participants: [
        { userId: ALICE_ID, shareType: 'equal' },
        { userId: BENJI_ID, shareType: 'equal' },
      ],
    })

    const aliceClient = getAuthenticatedClient(ALICE_ID)
    const summary = await getSettlementSummary(aliceClient, TEST_TRIP_ID)

    expect(summary.total_expenses).toBe(2)

    // Alice: paid €100, owes €50 + €30 = €80, net = +€20
    const alice = summary.balances.find(b => b.user_id === ALICE_ID)
    expect(alice?.net_balance).toBe(2000)

    // Benji: paid €60, owes €50 + €30 = €80, net = -€20
    const benji = summary.balances.find(b => b.user_id === BENJI_ID)
    expect(benji?.net_balance).toBe(-2000)

    // Should create 1 settlement: Benji pays Alice €20
    expect(summary.settlements).toHaveLength(1)
    expect(summary.settlements[0]).toEqual({
      from_user_id: BENJI_ID,
      from_user_name: expect.any(String),
      to_user_id: ALICE_ID,
      to_user_name: expect.any(String),
      amount: 2000,
      currency: 'EUR',
    })
  })

  it('should return empty settlements when all balanced', async () => {
    // Alice pays €50
    await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Lunch',
      amount: 5000,
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      participants: [
        { userId: ALICE_ID, shareType: 'equal' },
        { userId: BENJI_ID, shareType: 'equal' },
      ],
    })

    // Benji pays €50 (now balanced)
    await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Dinner',
      amount: 5000,
      currency: 'EUR',
      category: 'food',
      payerId: BENJI_ID,
      participants: [
        { userId: ALICE_ID, shareType: 'equal' },
        { userId: BENJI_ID, shareType: 'equal' },
      ],
    })

    const aliceClient = getAuthenticatedClient(ALICE_ID)
    const summary = await getSettlementSummary(aliceClient, TEST_TRIP_ID)

    // All balances should be 0
    summary.balances.forEach(balance => {
      expect(balance.net_balance).toBe(0)
    })

    // No settlements needed
    expect(summary.settlements).toEqual([])
  })

  // Note: Multi-currency and FX rate tests would go here
  // Skipping for now as they require FX rate setup in test database
  it.todo('should convert multi-currency expenses to base currency')
  it.todo('should exclude expenses with missing FX rates and show warning')
  it.todo('should handle date-scoped visibility for partial joiners')
})
