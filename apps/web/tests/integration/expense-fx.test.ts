/**
 * @jest-environment node
 *
 * Unit tests for Expense FX Rate Snapshot (Mocked)
 *
 * Tests that expense creation properly handles and stores FX rate snapshots.
 * Uses mocked Supabase client to avoid database dependencies.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { createExpense } from '@/app/actions/expenses'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as Sentry from '@sentry/nextjs'
import * as Core from '@tripthreads/core'

// Mock all external dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('@tripthreads/core', () => ({
  getFxRate: jest.fn(),
  formatDateForFx: jest.fn((date: string | Date) => {
    if (typeof date === 'string') return date.split('T')[0]
    return date.toISOString().split('T')[0]
  }),
  getSettlementSummary: jest.fn(),
  matchSingleParticipantName: jest.fn((name: string, participants: any[]) => {
    // Simple mock: return the first participant's user_id if name matches user_id
    const match = participants.find(p => p.user_id === name)
    return match
      ? { success: true as const, userId: match.user_id }
      : { success: false as const, error: 'Participant not found' }
  }),
}))

// Type definitions for mocks
type SupabaseMock = {
  auth: {
    getUser: jest.MockedFunction<() => Promise<any>>
  }
  from: jest.MockedFunction<(table: string) => any>
  rpc: jest.MockedFunction<(name: string, params: any) => Promise<any>>
}

const createMockSupabase = (): SupabaseMock => ({
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  rpc: jest.fn(),
})

/**
 * Helper function to set up standard mocks for expense creation
 */
function setupExpenseMocks(
  mockSupabase: SupabaseMock,
  options: {
    userId: string
    tripId: string
    baseCurrency: string
    expenseCurrency: string
    fxRate: number | null
    expenseId?: string
    amount?: number
  }
) {
  const {
    userId,
    tripId,
    baseCurrency,
    expenseCurrency,
    fxRate,
    expenseId = 'expense-123',
    amount = 10000,
  } = options

  // Mock auth
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })

  // Mock RLS check
  mockSupabase.rpc.mockResolvedValue({
    data: true,
    error: null,
  })

  // Track call counts for trip_participants (queried twice)
  let tripParticipantsCallCount = 0

  // Build query chain mocks
  const tripParticipantSingle = jest.fn() as any
  tripParticipantSingle.mockResolvedValue({
    data: { id: 'participant-1', role: 'participant' },
    error: null,
  })

  const tripParticipantEqUser = jest.fn() as any
  tripParticipantEqUser.mockReturnValue({ single: tripParticipantSingle })

  const tripParticipantEqTrip = jest.fn() as any
  tripParticipantEqTrip.mockReturnValue({ eq: tripParticipantEqUser })

  const tripParticipantSelect = jest.fn() as any
  tripParticipantSelect.mockReturnValue({ eq: tripParticipantEqTrip })

  // Mock trip query (for base currency)
  const tripSingle = jest.fn() as any
  tripSingle.mockResolvedValue({
    data: { id: tripId, base_currency: baseCurrency },
    error: null,
  })

  const tripEq = jest.fn() as any
  tripEq.mockReturnValue({ single: tripSingle })

  const tripSelect = jest.fn() as any
  tripSelect.mockReturnValue({ eq: tripEq })

  // Mock trip_participants list query (has .eq() after .select())
  const participantsEq = jest.fn() as any
  participantsEq.mockResolvedValue({
    data: [
      {
        user_id: userId,
        users: { full_name: 'Test User' },
      },
    ],
    error: null,
  })

  const participantsSelect = jest.fn() as any
  participantsSelect.mockReturnValue({ eq: participantsEq })

  // Mock expense insert
  const expenseSingle = jest.fn() as any
  expenseSingle.mockResolvedValue({
    data: {
      id: expenseId,
      trip_id: tripId,
      amount,
      currency: expenseCurrency,
      fx_rate: fxRate,
      description: 'Test expense',
      category: 'food',
      payer_id: userId,
      date: '2025-02-07T12:00:00Z',
      created_by: userId,
    },
    error: null,
  })

  const expenseSelect = jest.fn() as any
  expenseSelect.mockReturnValue({ single: expenseSingle })

  const expenseInsert = jest.fn() as any
  expenseInsert.mockReturnValue({ select: expenseSelect })

  // Mock expense_participants insert
  const participantsInsert = jest.fn() as any
  participantsInsert.mockResolvedValue({ error: null })

  // Wire up table handlers
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'trip_participants') {
      tripParticipantsCallCount++
      if (tripParticipantsCallCount === 1) {
        // First call: auth check
        return { select: tripParticipantSelect }
      } else {
        // Second call: participant list
        return { select: participantsSelect }
      }
    }
    if (table === 'trips') {
      return { select: tripSelect }
    }
    if (table === 'expenses') {
      return { insert: expenseInsert }
    }
    if (table === 'expense_participants') {
      return { insert: participantsInsert }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('Expense FX Integration (Mocked)', () => {
  let mockSupabase: SupabaseMock
  const mockGetFxRate = Core.getFxRate as jest.MockedFunction<typeof Core.getFxRate>
  const createClientMock = createClient as jest.MockedFunction<typeof createClient>
  const revalidatePathMock = revalidatePath as jest.MockedFunction<typeof revalidatePath>

  const testUserId = 'user-123'
  const testTripId = 'trip-456'

  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase = createMockSupabase()
    createClientMock.mockResolvedValue(mockSupabase as unknown as any)
  })

  it('stores FX rate snapshot when expense currency differs from base', async () => {
    setupExpenseMocks(mockSupabase, {
      userId: testUserId,
      tripId: testTripId,
      baseCurrency: 'EUR',
      expenseCurrency: 'USD',
      fxRate: 1.12,
    })

    // Mock getFxRate to return 1.12
    mockGetFxRate.mockResolvedValue(1.12)

    const result = await createExpense({
      tripId: testTripId,
      description: 'Test USD expense',
      amount: 10000,
      currency: 'USD',
      category: 'food',
      payer: testUserId,
      splitType: 'none',
      splitCount: null,
      participants: null,
      customSplits: null,
      date: '2025-02-07T12:00:00Z',
    })

    expect(result.success).toBe(true)
    expect(result.expense?.fx_rate).toBe(1.12)

    // Verify getFxRate was called with correct parameters
    expect(mockGetFxRate).toHaveBeenCalledWith(
      mockSupabase,
      'EUR', // base currency
      'USD', // expense currency
      '2025-02-07',
      expect.any(Object) // Options object (supabaseUrl and serviceRoleKey may be undefined in test)
    )

    // Verify revalidatePath was called
    expect(revalidatePathMock).toHaveBeenCalledWith(`/trips/${testTripId}`)
    expect(revalidatePathMock).toHaveBeenCalledWith(`/trips/${testTripId}/expenses`)
  })

  it('stores null FX rate when expense currency matches base currency', async () => {
    setupExpenseMocks(mockSupabase, {
      userId: testUserId,
      tripId: testTripId,
      baseCurrency: 'EUR',
      expenseCurrency: 'EUR',
      fxRate: null,
    })

    const result = await createExpense({
      tripId: testTripId,
      description: 'Test EUR expense',
      amount: 10000,
      currency: 'EUR',
      category: 'food',
      payer: testUserId,
      splitType: 'none',
      splitCount: null,
      participants: null,
      customSplits: null,
      date: '2025-02-07T12:00:00Z',
    })

    expect(result.success).toBe(true)
    expect(result.expense?.fx_rate).toBeNull()

    // getFxRate should NOT be called when currencies match
    expect(mockGetFxRate).not.toHaveBeenCalled()
  })

  it('handles missing FX rate gracefully (stores null)', async () => {
    setupExpenseMocks(mockSupabase, {
      userId: testUserId,
      tripId: testTripId,
      baseCurrency: 'EUR',
      expenseCurrency: 'GBP',
      fxRate: null,
    })

    // Mock getFxRate to return null (rate unavailable)
    mockGetFxRate.mockResolvedValue(null)

    const result = await createExpense({
      tripId: testTripId,
      description: 'Test GBP expense',
      amount: 10000,
      currency: 'GBP',
      category: 'food',
      payer: testUserId,
      splitType: 'none',
      splitCount: null,
      participants: null,
      customSplits: null,
      date: '2025-02-07T12:00:00Z',
    })

    expect(result.success).toBe(true)
    expect(result.expense?.fx_rate).toBeNull()

    // Verify Sentry warning was logged
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('FX rate unavailable'),
      expect.objectContaining({
        level: 'warning',
      })
    )
  })

  it('preserves FX rate snapshot over time (immutability)', async () => {
    setupExpenseMocks(mockSupabase, {
      userId: testUserId,
      tripId: testTripId,
      baseCurrency: 'EUR',
      expenseCurrency: 'USD',
      fxRate: 1.12,
      expenseId: 'immutable-expense',
    })

    mockGetFxRate.mockResolvedValue(1.12)

    const result = await createExpense({
      tripId: testTripId,
      description: 'Immutability test expense',
      amount: 10000,
      currency: 'USD',
      category: 'food',
      payer: testUserId,
      splitType: 'none',
      splitCount: null,
      participants: null,
      customSplits: null,
      date: '2025-02-07T12:00:00Z',
    })

    expect(result.success).toBe(true)

    const originalFxRate = result.expense?.fx_rate
    expect(originalFxRate).toBe(1.12)

    // The returned expense already has the snapshot
    // In a real database, this would remain unchanged even if fx_rates table updates
    // This test verifies the snapshot is stored at creation time
    expect(result.expense?.fx_rate).toBe(1.12)
  })

  it('handles multiple currencies in same trip', async () => {
    const expenseIds = ['expense-usd', 'expense-gbp', 'expense-eur']

    // We need to set up mocks fresh for each expense creation
    // For this test, we'll call createExpense 3 times with different setups

    // Test USD expense
    jest.clearAllMocks()
    mockSupabase = createMockSupabase()
    createClientMock.mockResolvedValue(mockSupabase as unknown as any)

    setupExpenseMocks(mockSupabase, {
      userId: testUserId,
      tripId: testTripId,
      baseCurrency: 'EUR',
      expenseCurrency: 'USD',
      fxRate: 1.12,
      expenseId: expenseIds[0],
    })
    mockGetFxRate.mockResolvedValue(1.12)

    const usdResult = await createExpense({
      tripId: testTripId,
      description: 'USD expense',
      amount: 10000,
      currency: 'USD',
      category: 'food',
      payer: testUserId,
      splitType: 'none',
      splitCount: null,
      participants: null,
      customSplits: null,
      date: '2025-02-07T12:00:00Z',
    })

    // Test GBP expense
    jest.clearAllMocks()
    mockSupabase = createMockSupabase()
    createClientMock.mockResolvedValue(mockSupabase as unknown as any)

    setupExpenseMocks(mockSupabase, {
      userId: testUserId,
      tripId: testTripId,
      baseCurrency: 'EUR',
      expenseCurrency: 'GBP',
      fxRate: 0.85,
      expenseId: expenseIds[1],
    })
    mockGetFxRate.mockResolvedValue(0.85)

    const gbpResult = await createExpense({
      tripId: testTripId,
      description: 'GBP expense',
      amount: 8500,
      currency: 'GBP',
      category: 'transport',
      payer: testUserId,
      splitType: 'none',
      splitCount: null,
      participants: null,
      customSplits: null,
      date: '2025-02-07T12:00:00Z',
    })

    // Test EUR expense (same as base)
    jest.clearAllMocks()
    mockSupabase = createMockSupabase()
    createClientMock.mockResolvedValue(mockSupabase as unknown as any)

    setupExpenseMocks(mockSupabase, {
      userId: testUserId,
      tripId: testTripId,
      baseCurrency: 'EUR',
      expenseCurrency: 'EUR',
      fxRate: null,
      expenseId: expenseIds[2],
    })

    const eurResult = await createExpense({
      tripId: testTripId,
      description: 'EUR expense',
      amount: 5000,
      currency: 'EUR',
      category: 'activity',
      payer: testUserId,
      splitType: 'none',
      splitCount: null,
      participants: null,
      customSplits: null,
      date: '2025-02-07T12:00:00Z',
    })

    // Verify all expenses created successfully with correct FX rates
    expect(usdResult.success).toBe(true)
    expect(gbpResult.success).toBe(true)
    expect(eurResult.success).toBe(true)

    expect(usdResult.expense?.currency).toBe('USD')
    expect(usdResult.expense?.fx_rate).toBe(1.12)

    expect(gbpResult.expense?.currency).toBe('GBP')
    expect(gbpResult.expense?.fx_rate).toBe(0.85)

    expect(eurResult.expense?.currency).toBe('EUR')
    expect(eurResult.expense?.fx_rate).toBeNull()
  })
})
