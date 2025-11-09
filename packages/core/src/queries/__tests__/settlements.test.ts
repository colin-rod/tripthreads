/**
 * Unit tests for settlement query operations
 *
 * Tests settlement calculation, FX conversion, RLS enforcement, and date-scoped visibility.
 * Following TDD methodology - these tests are written BEFORE implementation.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getSettlementSummary, markSettlementAsPaid } from '../settlements'
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
  // Clean up test data before each test
  await adminClient.from('settlements').delete().eq('trip_id', TEST_TRIP_ID)
  await adminClient.from('expenses').delete().eq('trip_id', TEST_TRIP_ID)
})

afterAll(async () => {
  // Cleanup
  await adminClient.from('settlements').delete().eq('trip_id', TEST_TRIP_ID)
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
    expect(summary.pending_settlements).toEqual([])
    expect(summary.settled_settlements).toEqual([])
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
    expect(summary.pending_settlements).toHaveLength(2)

    // Benji pays Alice €20
    const benjiSettlement = summary.pending_settlements.find(
      s => s.from_user_id === BENJI_ID && s.to_user_id === ALICE_ID
    )
    expect(benjiSettlement?.amount).toBe(2000)

    // Baylee pays Alice €20
    const bayleeSettlement = summary.pending_settlements.find(
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
    expect(summary.pending_settlements).toHaveLength(1)
    expect(summary.pending_settlements[0]).toMatchObject({
      from_user_id: BENJI_ID,
      to_user_id: ALICE_ID,
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
    expect(summary.pending_settlements).toEqual([])
  })

  // Note: Multi-currency and FX rate tests would go here
  // Skipping for now as they require FX rate setup in test database
  it.todo('should convert multi-currency expenses to base currency')
  it.todo('should exclude expenses with missing FX rates and show warning')
  it.todo('should handle date-scoped visibility for partial joiners')
})

describe('Settlement Persistence (CRO-735)', () => {
  describe('upsertSettlements', () => {
    it('should create new settlement records from optimized settlements', async () => {
      // Create expense scenario: Alice pays €60, split 3 ways
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

      // Get settlement summary (which should trigger upsert)
      const aliceClient = getAuthenticatedClient(ALICE_ID)
      const summary = await getSettlementSummary(aliceClient, TEST_TRIP_ID)

      // Should have 2 pending settlements created
      expect(summary.pending_settlements).toHaveLength(2)
      expect(summary.settled_settlements).toHaveLength(0)

      // Verify settlements are persisted in database
      const { data: dbSettlements } = await adminClient
        .from('settlements')
        .select('*')
        .eq('trip_id', TEST_TRIP_ID)
        .eq('status', 'pending')

      expect(dbSettlements).toHaveLength(2)
      expect(dbSettlements![0].amount).toBe(2000) // €20
      expect(dbSettlements![0].currency).toBe('EUR')
    })

    it('should update existing settlement amounts when recalculated', async () => {
      // Initial expense: Alice pays €60, split with Benji
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
        ],
      })

      // First calculation - Benji owes Alice €30
      const aliceClient = getAuthenticatedClient(ALICE_ID)
      await getSettlementSummary(aliceClient, TEST_TRIP_ID)

      // Add another expense: Alice pays €40, split with Benji
      await createExpense(adminClient, {
        tripId: TEST_TRIP_ID,
        description: 'Lunch',
        amount: 4000,
        currency: 'EUR',
        category: 'food',
        payerId: ALICE_ID,
        participants: [
          { userId: ALICE_ID, shareType: 'equal' },
          { userId: BENJI_ID, shareType: 'equal' },
        ],
      })

      // Recalculate - Benji now owes Alice €50 (€30 + €20)
      const updatedSummary = await getSettlementSummary(aliceClient, TEST_TRIP_ID)

      expect(updatedSummary.pending_settlements).toHaveLength(1)
      expect(updatedSummary.pending_settlements[0].amount).toBe(5000) // €50

      // Verify only 1 settlement exists (updated, not duplicated)
      const { data: dbSettlements } = await adminClient
        .from('settlements')
        .select('*')
        .eq('trip_id', TEST_TRIP_ID)
        .eq('status', 'pending')

      expect(dbSettlements).toHaveLength(1)
    })

    it('should not modify settled settlements when recalculating', async () => {
      // Create initial expense
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
        ],
      })

      const aliceClient = getAuthenticatedClient(ALICE_ID)
      const summary = await getSettlementSummary(aliceClient, TEST_TRIP_ID)

      // Mark settlement as paid
      const settlementId = summary.pending_settlements[0].id
      await markSettlementAsPaid(aliceClient, {
        settlementId,
        note: 'Paid via Venmo',
      })

      // Add new expense (would change optimization if recalculated)
      await createExpense(adminClient, {
        tripId: TEST_TRIP_ID,
        description: 'Lunch',
        amount: 4000,
        currency: 'EUR',
        category: 'food',
        payerId: ALICE_ID,
        participants: [
          { userId: ALICE_ID, shareType: 'equal' },
          { userId: BENJI_ID, shareType: 'equal' },
        ],
      })

      // Recalculate settlements
      const updatedSummary = await getSettlementSummary(aliceClient, TEST_TRIP_ID)

      // Should have 1 settled settlement (unchanged) + 1 new pending settlement
      expect(updatedSummary.settled_settlements).toHaveLength(1)
      expect(updatedSummary.settled_settlements[0].id).toBe(settlementId)
      expect(updatedSummary.settled_settlements[0].amount).toBe(3000) // Original €30
      expect(updatedSummary.settled_settlements[0].status).toBe('settled')

      expect(updatedSummary.pending_settlements).toHaveLength(1)
      expect(updatedSummary.pending_settlements[0].amount).toBe(2000) // New €20
    })
  })

  describe('markSettlementAsPaid', () => {
    it('should mark a pending settlement as settled with timestamp and note', async () => {
      // Create expense and settlement
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
        ],
      })

      const benjiClient = getAuthenticatedClient(BENJI_ID)
      const summary = await getSettlementSummary(benjiClient, TEST_TRIP_ID)
      const settlementId = summary.pending_settlements[0].id

      // Benji marks settlement as paid
      await markSettlementAsPaid(benjiClient, {
        settlementId,
        note: 'Paid via Venmo on Dec 1',
      })

      // Verify settlement is now settled
      const { data: settlement } = await adminClient
        .from('settlements')
        .select('*')
        .eq('id', settlementId)
        .single()

      expect(settlement!.status).toBe('settled')
      expect(settlement!.settled_by).toBe(BENJI_ID)
      expect(settlement!.settled_at).toBeTruthy()
      expect(settlement!.note).toBe('Paid via Venmo on Dec 1')
    })

    it('should allow either party (from_user or to_user) to mark as paid', async () => {
      // Create expense
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
        ],
      })

      // Get settlement ID
      const aliceClient = getAuthenticatedClient(ALICE_ID)
      const summary = await getSettlementSummary(aliceClient, TEST_TRIP_ID)
      const settlementId = summary.pending_settlements[0].id

      // Alice (to_user / creditor) marks as paid
      await markSettlementAsPaid(aliceClient, {
        settlementId,
        note: 'Received payment',
      })

      // Verify it was marked by Alice
      const { data: settlement } = await adminClient
        .from('settlements')
        .select('*')
        .eq('id', settlementId)
        .single()

      expect(settlement!.status).toBe('settled')
      expect(settlement!.settled_by).toBe(ALICE_ID)
    })

    it('should exclude settled settlements from balance calculations', async () => {
      // Create two expenses: Alice pays €60, Benji pays €40 (both split equally)
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
        ],
      })

      await createExpense(adminClient, {
        tripId: TEST_TRIP_ID,
        description: 'Lunch',
        amount: 4000,
        currency: 'EUR',
        category: 'food',
        payerId: BENJI_ID,
        participants: [
          { userId: ALICE_ID, shareType: 'equal' },
          { userId: BENJI_ID, shareType: 'equal' },
        ],
      })

      // Get initial summary: Benji owes Alice €10 (€30 - €20)
      const aliceClient = getAuthenticatedClient(ALICE_ID)
      const initialSummary = await getSettlementSummary(aliceClient, TEST_TRIP_ID)
      expect(initialSummary.pending_settlements).toHaveLength(1)
      expect(initialSummary.pending_settlements[0].amount).toBe(1000) // €10

      // Mark settlement as paid
      await markSettlementAsPaid(aliceClient, {
        settlementId: initialSummary.pending_settlements[0].id,
        note: 'Settled up',
      })

      // Get updated summary
      const updatedSummary = await getSettlementSummary(aliceClient, TEST_TRIP_ID)

      // Should show balanced (no pending settlements)
      expect(updatedSummary.pending_settlements).toHaveLength(0)
      expect(updatedSummary.settled_settlements).toHaveLength(1)

      // Balances should reflect the settled amount
      const alice = updatedSummary.balances.find(b => b.user_id === ALICE_ID)
      const benji = updatedSummary.balances.find(b => b.user_id === BENJI_ID)

      // After settlement, both should be balanced
      expect(alice?.net_balance).toBe(0)
      expect(benji?.net_balance).toBe(0)
    })

    it('should fail if user is not involved in the settlement', async () => {
      // Create expense between Alice and Benji
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
        ],
      })

      const aliceClient = getAuthenticatedClient(ALICE_ID)
      const summary = await getSettlementSummary(aliceClient, TEST_TRIP_ID)
      const settlementId = summary.pending_settlements[0].id

      // Baylee (not involved) tries to mark it as paid
      const bayleeClient = getAuthenticatedClient(BAYLEE_ID)

      await expect(
        markSettlementAsPaid(bayleeClient, {
          settlementId,
          note: 'I should not be able to do this',
        })
      ).rejects.toThrow()
    })

    it('should include settlement history in summary response', async () => {
      // Create expense
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
        ],
      })

      const benjiClient = getAuthenticatedClient(BENJI_ID)
      const summary = await getSettlementSummary(benjiClient, TEST_TRIP_ID)

      // Mark as paid
      await markSettlementAsPaid(benjiClient, {
        settlementId: summary.pending_settlements[0].id,
        note: 'Venmo transfer complete',
      })

      // Get updated summary
      const updatedSummary = await getSettlementSummary(benjiClient, TEST_TRIP_ID)

      // Should show settlement in history
      expect(updatedSummary.settled_settlements).toHaveLength(1)
      expect(updatedSummary.settled_settlements[0].status).toBe('settled')
      expect(updatedSummary.settled_settlements[0].note).toBe('Venmo transfer complete')
      expect(updatedSummary.settled_settlements[0].settled_by).toBe(BENJI_ID)
      expect(updatedSummary.settled_settlements[0].from_user).toEqual({
        id: BENJI_ID,
        full_name: expect.any(String),
        avatar_url: expect.anything(),
      })
      expect(updatedSummary.settled_settlements[0].to_user).toEqual({
        id: ALICE_ID,
        full_name: expect.any(String),
        avatar_url: expect.anything(),
      })
    })
  })
})
