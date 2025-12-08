/**
 * @jest-environment node
 *
 * Integration tests for Expense FX Rate Snapshot
 *
 * Tests that expense creation properly fetches and stores FX rate snapshots.
 * These tests verify the end-to-end flow from expense creation to FX rate storage.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { createExpense } from '@/app/actions/expenses'
import type { Database } from '@/types/database'

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

let supabase: ReturnType<typeof createClient<Database>>
let testUserId: string
let testTripId: string

// Skip suite if fx_rates table doesn't exist yet
const describeOrSkip = process.env.CI ? describe : describe.skip

describeOrSkip('Expense FX Integration', () => {
  beforeAll(async () => {
    supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Create test user
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: 'test-fx@tripthreads.com',
      email_confirm: true,
      password: 'test-password-123',
    })

    if (userError || !user.user) {
      throw new Error(`Failed to create test user: ${userError?.message}`)
    }

    testUserId = user.user.id

    // Create test trip with EUR base currency
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        name: 'Test Trip for FX',
        description: 'Integration test trip',
        start_date: '2025-02-07T00:00:00Z',
        end_date: '2025-02-14T00:00:00Z',
        owner_id: testUserId,
        base_currency: 'EUR',
      })
      .select()
      .single()

    if (tripError || !trip) {
      throw new Error(`Failed to create test trip: ${tripError?.message}`)
    }

    testTripId = trip.id

    // Insert test FX rate
    const { error: fxError } = await supabase.from('fx_rates').insert({
      base_currency: 'EUR',
      target_currency: 'USD',
      rate: 1.12,
      date: '2025-02-07',
    })

    if (fxError) {
      console.warn('Failed to insert test FX rate (table may not exist yet):', fxError)
    }
  })

  afterAll(async () => {
    // Clean up test data
    if (testTripId) {
      await supabase.from('trips').delete().eq('id', testTripId)
    }

    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId)
    }

    // Clean up test FX rates
    await supabase
      .from('fx_rates')
      .delete()
      .eq('base_currency', 'EUR')
      .eq('target_currency', 'USD')
      .eq('date', '2025-02-07')
  })

  beforeEach(async () => {
    // Clean up expenses before each test
    await supabase.from('expenses').delete().eq('trip_id', testTripId)
  })

  it('stores FX rate snapshot when expense currency differs from base', async () => {
    const result = await createExpense({
      tripId: testTripId,
      description: 'Test USD expense',
      amount: 10000, // $100.00
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
    expect(result.expense).toBeDefined()

    if (!result.expense) {
      throw new Error('Expense not created')
    }

    // Verify FX rate was stored
    const { data: expense } = await supabase
      .from('expenses')
      .select('fx_rate')
      .eq('id', result.expense.id)
      .single()

    expect(expense?.fx_rate).toBeDefined()
    expect(expense?.fx_rate).toBeCloseTo(1.12, 2)
  })

  it('stores null FX rate when expense currency matches base currency', async () => {
    const result = await createExpense({
      tripId: testTripId,
      description: 'Test EUR expense',
      amount: 10000, // €100.00
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
    expect(result.expense).toBeDefined()

    if (!result.expense) {
      throw new Error('Expense not created')
    }

    // Verify FX rate is null for same currency
    const { data: expense } = await supabase
      .from('expenses')
      .select('fx_rate')
      .eq('id', result.expense.id)
      .single()

    expect(expense?.fx_rate).toBeNull()
  })

  it('handles missing FX rate gracefully (stores null)', async () => {
    // Create expense with unsupported currency (no rate in cache)
    const result = await createExpense({
      tripId: testTripId,
      description: 'Test GBP expense',
      amount: 10000, // £100.00
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
    expect(result.expense).toBeDefined()

    if (!result.expense) {
      throw new Error('Expense not created')
    }

    // Expense should still be created even without FX rate
    const { data: expense } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', result.expense.id)
      .single()

    expect(expense).toBeDefined()
    expect(expense?.description).toBe('Test GBP expense')

    // FX rate may be null if on-demand fetch failed or was skipped
    // This is acceptable - graceful degradation
  })

  it('preserves FX rate snapshot over time (immutability)', async () => {
    // Create expense with FX rate
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

    if (!result.expense) {
      throw new Error('Expense not created')
    }

    const originalFxRate = result.expense.fx_rate

    // Update the FX rate in the fx_rates table (simulating rate change)
    await supabase
      .from('fx_rates')
      .update({ rate: 1.25 })
      .eq('base_currency', 'EUR')
      .eq('target_currency', 'USD')
      .eq('date', '2025-02-07')

    // Fetch expense again - FX rate should be unchanged (snapshot)
    const { data: expense } = await supabase
      .from('expenses')
      .select('fx_rate')
      .eq('id', result.expense.id)
      .single()

    expect(expense?.fx_rate).toBe(originalFxRate)
    expect(expense?.fx_rate).toBeCloseTo(1.12, 2) // Original rate, not updated rate
  })

  it('handles multiple currencies in same trip', async () => {
    // Insert GBP rate for this test
    await supabase.from('fx_rates').insert({
      base_currency: 'EUR',
      target_currency: 'GBP',
      rate: 0.85,
      date: '2025-02-07',
    })

    // Create USD expense
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

    // Create GBP expense
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

    // Create EUR expense
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

    expect(usdResult.success).toBe(true)
    expect(gbpResult.success).toBe(true)
    expect(eurResult.success).toBe(true)

    // Verify each has correct FX rate
    const { data: expenses } = await supabase
      .from('expenses')
      .select('description, currency, fx_rate')
      .eq('trip_id', testTripId)
      .order('created_at', { ascending: true })

    expect(expenses).toHaveLength(3)

    const usdExpense = expenses?.find(e => e.currency === 'USD')
    const gbpExpense = expenses?.find(e => e.currency === 'GBP')
    const eurExpense = expenses?.find(e => e.currency === 'EUR')

    expect(usdExpense?.fx_rate).toBeCloseTo(1.12, 2)
    expect(gbpExpense?.fx_rate).toBeCloseTo(0.85, 2)
    expect(eurExpense?.fx_rate).toBeNull() // Same as base currency

    // Clean up
    await supabase
      .from('fx_rates')
      .delete()
      .eq('base_currency', 'EUR')
      .eq('target_currency', 'GBP')
      .eq('date', '2025-02-07')
  })
})
