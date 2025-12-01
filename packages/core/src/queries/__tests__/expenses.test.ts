/**
 * Unit tests for expense query operations
 *
 * Tests CRUD operations, RLS enforcement, participant resolution, and split calculations.
 * Following TDD methodology - these tests are written BEFORE implementation.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  getUserExpensesForTrip,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseParticipants,
  updateExpenseParticipants,
} from '../expenses'
import { CreateExpenseInput } from '../../types/expense'

// Test database setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

let adminClient: SupabaseClient

// Test data IDs (from seed data)
const TEST_TRIP_ID = '00000000-0000-0000-0000-000000000001'
const ALICE_ID = '00000000-0000-0000-0000-000000000001' // Owner
const BENJI_ID = '00000000-0000-0000-0000-000000000002' // Participant
const BAYLEE_ID = '00000000-0000-0000-0000-000000000003' // Viewer
const MAYA_ID = '00000000-0000-0000-0000-000000000004' // Partial joiner (joined 2025-10-14)

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
  // In real implementation, this would use auth token
  // For now, use RLS context setting
  return createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      headers: {
        'X-User-Id': userId, // Custom header for testing
      },
    },
  })
}

describe('getUserExpensesForTrip', () => {
  it('should return all expenses for trip owner', async () => {
    // Create test expense
    const expense = await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Test dinner',
      amount: 5000, // €50.00
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      participants: [
        { userId: ALICE_ID, shareType: 'equal' },
        { userId: BENJI_ID, shareType: 'equal' },
      ],
    })

    const aliceClient = getAuthenticatedClient(ALICE_ID)
    const expenses = await getUserExpensesForTrip(aliceClient, TEST_TRIP_ID)

    expect(expenses).toHaveLength(1)
    expect(expenses[0].id).toBe(expense.id)
    expect(expenses[0].description).toBe('Test dinner')
  })

  it('should return only involved expenses for participant', async () => {
    // Create two expenses - Benji only in first one
    const expense1 = await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Benji dinner',
      amount: 3000,
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
      description: 'Alice solo expense',
      amount: 2000,
      currency: 'EUR',
      category: 'activity',
      payerId: ALICE_ID,
      participants: [{ userId: ALICE_ID, shareType: 'equal' }],
    })

    const benjiClient = getAuthenticatedClient(BENJI_ID)
    const expenses = await getUserExpensesForTrip(benjiClient, TEST_TRIP_ID)

    expect(expenses).toHaveLength(1)
    expect(expenses[0].id).toBe(expense1.id)
    expect(expenses[0].description).toBe('Benji dinner')
  })

  it('should return empty array for viewer', async () => {
    // Create expense
    await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Test expense',
      amount: 1000,
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      participants: [{ userId: ALICE_ID, shareType: 'equal' }],
    })

    const bayleeClient = getAuthenticatedClient(BAYLEE_ID)
    const expenses = await getUserExpensesForTrip(bayleeClient, TEST_TRIP_ID)

    expect(expenses).toHaveLength(0)
  })

  it('should respect date scoping for partial joiners', async () => {
    // Maya joined on 2025-10-14
    // Create expense before join date
    await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Before Maya joined',
      amount: 3000,
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      date: '2025-10-13',
      participants: [
        { userId: ALICE_ID, shareType: 'equal' },
        { userId: MAYA_ID, shareType: 'equal' },
      ],
    })

    // Create expense after join date
    const afterExpense = await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'After Maya joined',
      amount: 4000,
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      date: '2025-10-15',
      participants: [
        { userId: ALICE_ID, shareType: 'equal' },
        { userId: MAYA_ID, shareType: 'equal' },
      ],
    })

    const mayaClient = getAuthenticatedClient(MAYA_ID)
    const expenses = await getUserExpensesForTrip(mayaClient, TEST_TRIP_ID)

    // Maya should only see the expense after her join date
    expect(expenses).toHaveLength(1)
    expect(expenses[0].id).toBe(afterExpense.id)
  })
})

describe('getExpenseById', () => {
  it('should return expense with participants for involved user', async () => {
    const expense = await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Test expense',
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
    const result = await getExpenseById(benjiClient, expense.id)

    expect(result).toBeDefined()
    expect(result?.id).toBe(expense.id)
    expect(result?.payer.id).toBe(ALICE_ID)
    expect(result?.participants).toHaveLength(2)
  })

  it('should return null for non-involved user', async () => {
    const expense = await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Alice expense',
      amount: 2000,
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      participants: [{ userId: ALICE_ID, shareType: 'equal' }],
    })

    const benjiClient = getAuthenticatedClient(BENJI_ID)
    const result = await getExpenseById(benjiClient, expense.id)

    expect(result).toBeNull()
  })

  it('should return null for viewer', async () => {
    const expense = await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Test expense',
      amount: 1000,
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      participants: [{ userId: ALICE_ID, shareType: 'equal' }],
    })

    const bayleeClient = getAuthenticatedClient(BAYLEE_ID)
    const result = await getExpenseById(bayleeClient, expense.id)

    expect(result).toBeNull()
  })
})

describe('createExpense', () => {
  it('should create expense with equal split', async () => {
    const input: CreateExpenseInput = {
      tripId: TEST_TRIP_ID,
      description: 'Dinner at restaurant',
      amount: 8000, // €80.00
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      participants: [
        { userId: ALICE_ID, shareType: 'equal' },
        { userId: BENJI_ID, shareType: 'equal' },
      ],
    }

    const expense = await createExpense(adminClient, input)

    expect(expense.id).toBeDefined()
    expect(expense.description).toBe('Dinner at restaurant')
    expect(expense.amount).toBe(8000)
    expect(expense.payer_id).toBe(ALICE_ID)

    // Check participants
    const participants = await getExpenseParticipants(adminClient, expense.id)
    expect(participants).toHaveLength(2)
    expect(participants[0].share_amount).toBe(4000) // €40.00 each
    expect(participants[1].share_amount).toBe(4000)
  })

  it('should create expense with percentage split', async () => {
    const input: CreateExpenseInput = {
      tripId: TEST_TRIP_ID,
      description: 'Shared taxi',
      amount: 3000, // €30.00
      currency: 'EUR',
      category: 'transport',
      payerId: ALICE_ID,
      participants: [
        { userId: ALICE_ID, shareType: 'percentage', shareValue: 60 },
        { userId: BENJI_ID, shareType: 'percentage', shareValue: 40 },
      ],
    }

    const expense = await createExpense(adminClient, input)
    const participants = await getExpenseParticipants(adminClient, expense.id)

    expect(participants).toHaveLength(2)
    expect(participants.find(p => p.user_id === ALICE_ID)?.share_amount).toBe(1800) // 60%
    expect(participants.find(p => p.user_id === BENJI_ID)?.share_amount).toBe(1200) // 40%
  })

  it('should create expense with custom amounts', async () => {
    const input: CreateExpenseInput = {
      tripId: TEST_TRIP_ID,
      description: 'Custom split',
      amount: 5000,
      currency: 'EUR',
      category: 'other',
      payerId: ALICE_ID,
      participants: [
        { userId: ALICE_ID, shareType: 'amount', shareValue: 3000 },
        { userId: BENJI_ID, shareType: 'amount', shareValue: 2000 },
      ],
    }

    const expense = await createExpense(adminClient, input)
    const participants = await getExpenseParticipants(adminClient, expense.id)

    expect(participants.find(p => p.user_id === ALICE_ID)?.share_amount).toBe(3000)
    expect(participants.find(p => p.user_id === BENJI_ID)?.share_amount).toBe(2000)
  })

  it('should default date to today if not provided', async () => {
    const input: CreateExpenseInput = {
      tripId: TEST_TRIP_ID,
      description: 'No date provided',
      amount: 1000,
      currency: 'EUR',
      category: 'other',
      payerId: ALICE_ID,
      participants: [{ userId: ALICE_ID, shareType: 'equal' }],
    }

    const expense = await createExpense(adminClient, input)
    const today = new Date().toISOString().split('T')[0]

    expect(expense.date).toBe(today)
  })

  it('should throw error if participant split does not sum to total', async () => {
    const input: CreateExpenseInput = {
      tripId: TEST_TRIP_ID,
      description: 'Invalid split',
      amount: 5000,
      currency: 'EUR',
      category: 'other',
      payerId: ALICE_ID,
      participants: [
        { userId: ALICE_ID, shareType: 'amount', shareValue: 2000 },
        { userId: BENJI_ID, shareType: 'amount', shareValue: 2000 },
      ],
    }

    await expect(createExpense(adminClient, input)).rejects.toThrow()
  })
})

describe('updateExpense', () => {
  it('should update expense description', async () => {
    const expense = await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Original description',
      amount: 1000,
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      participants: [{ userId: ALICE_ID, shareType: 'equal' }],
    })

    const updated = await updateExpense(adminClient, expense.id, {
      description: 'Updated description',
    })

    expect(updated.description).toBe('Updated description')
    expect(updated.amount).toBe(1000) // Unchanged
  })

  it('should update expense amount and category', async () => {
    const expense = await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Test',
      amount: 1000,
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      participants: [{ userId: ALICE_ID, shareType: 'equal' }],
    })

    const updated = await updateExpense(adminClient, expense.id, {
      amount: 2000,
      category: 'transport',
    })

    expect(updated.amount).toBe(2000)
    expect(updated.category).toBe('transport')
  })
})

describe('deleteExpense', () => {
  it('should delete expense and participants', async () => {
    const expense = await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'To be deleted',
      amount: 1000,
      currency: 'EUR',
      category: 'other',
      payerId: ALICE_ID,
      participants: [{ userId: ALICE_ID, shareType: 'equal' }],
    })

    await deleteExpense(adminClient, expense.id)

    const result = await getExpenseById(adminClient, expense.id)
    expect(result).toBeNull()

    const participants = await getExpenseParticipants(adminClient, expense.id)
    expect(participants).toHaveLength(0)
  })
})

describe('getExpenseParticipants', () => {
  it('should return all participants with user details', async () => {
    const expense = await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Test',
      amount: 6000,
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      participants: [
        { userId: ALICE_ID, shareType: 'equal' },
        { userId: BENJI_ID, shareType: 'equal' },
      ],
    })

    const participants = await getExpenseParticipants(adminClient, expense.id)

    expect(participants).toHaveLength(2)
    expect(participants[0].user).toBeDefined()
    expect(participants[0].user.full_name).toBeDefined()
  })
})

describe('updateExpenseParticipants', () => {
  it('should update participant shares', async () => {
    const expense = await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Test',
      amount: 5000,
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      participants: [
        { userId: ALICE_ID, shareType: 'equal' },
        { userId: BENJI_ID, shareType: 'equal' },
      ],
    })

    await updateExpenseParticipants(adminClient, expense.id, [
      { userId: ALICE_ID, shareType: 'percentage', shareValue: 70 },
      { userId: BENJI_ID, shareType: 'percentage', shareValue: 30 },
    ])

    const participants = await getExpenseParticipants(adminClient, expense.id)

    expect(participants.find(p => p.user_id === ALICE_ID)?.share_amount).toBe(3500)
    expect(participants.find(p => p.user_id === BENJI_ID)?.share_amount).toBe(1500)
  })

  it('should add new participants', async () => {
    const expense = await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Test',
      amount: 6000,
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      participants: [{ userId: ALICE_ID, shareType: 'equal' }],
    })

    await updateExpenseParticipants(adminClient, expense.id, [
      { userId: ALICE_ID, shareType: 'equal' },
      { userId: BENJI_ID, shareType: 'equal' },
    ])

    const participants = await getExpenseParticipants(adminClient, expense.id)
    expect(participants).toHaveLength(2)
  })

  it('should remove participants', async () => {
    const expense = await createExpense(adminClient, {
      tripId: TEST_TRIP_ID,
      description: 'Test',
      amount: 4000,
      currency: 'EUR',
      category: 'food',
      payerId: ALICE_ID,
      participants: [
        { userId: ALICE_ID, shareType: 'equal' },
        { userId: BENJI_ID, shareType: 'equal' },
      ],
    })

    await updateExpenseParticipants(adminClient, expense.id, [
      { userId: ALICE_ID, shareType: 'equal' },
    ])

    const participants = await getExpenseParticipants(adminClient, expense.id)
    expect(participants).toHaveLength(1)
    expect(participants[0].user_id).toBe(ALICE_ID)
  })
})
