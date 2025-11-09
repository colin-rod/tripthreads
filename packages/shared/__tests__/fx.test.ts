/**
 * Unit tests for FX (Foreign Exchange) utilities
 *
 * Tests currency conversion, rate lookups, and on-demand fetching logic.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import {
  getFxRateFromCache,
  fetchAndCacheFxRate,
  getFxRate,
  convertCurrency,
  calculateInverseRate,
  formatDateForFx,
} from '@tripthreads/core'

import * as SharedExports from '../src'

// Mock Supabase client
const createMockSupabase = (mockData: any) => {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve(mockData),
            }),
          }),
        }),
      }),
    }),
  } as any
}

describe('FX Utilities', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  it('re-exports FX helpers via @tripthreads/shared', () => {
    expect(SharedExports.getFxRateFromCache).toBe(getFxRateFromCache)
    expect(SharedExports.fetchAndCacheFxRate).toBe(fetchAndCacheFxRate)
    expect(SharedExports.getFxRate).toBe(getFxRate)
    expect(SharedExports.convertCurrency).toBe(convertCurrency)
    expect(SharedExports.calculateInverseRate).toBe(calculateInverseRate)
    expect(SharedExports.formatDateForFx).toBe(formatDateForFx)
  })

  describe('getFxRateFromCache', () => {
    it('returns 1.0 for same currency', async () => {
      const mockSupabase = createMockSupabase({ data: null, error: null })
      const rate = await getFxRateFromCache(mockSupabase, 'EUR', 'EUR', '2025-02-07')

      expect(rate).toBe(1.0)
    })

    it('returns rate from database when cached', async () => {
      const mockSupabase = createMockSupabase({
        data: { rate: 1.12 },
        error: null,
      })

      const rate = await getFxRateFromCache(mockSupabase, 'EUR', 'USD', '2025-02-07')

      expect(rate).toBeCloseTo(1.12, 2)
    })

    it('returns null if rate not in cache', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: null,
      })

      const rate = await getFxRateFromCache(mockSupabase, 'EUR', 'XYZ', '2025-02-07')

      expect(rate).toBeNull()
    })

    it('returns null on database error', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: { message: 'Database error' },
      })

      const rate = await getFxRateFromCache(mockSupabase, 'EUR', 'USD', '2025-02-07')

      expect(rate).toBeNull()
    })

    it('handles decimal precision correctly', async () => {
      const mockSupabase = createMockSupabase({
        data: { rate: 1.123456 },
        error: null,
      })

      const rate = await getFxRateFromCache(mockSupabase, 'EUR', 'USD', '2025-02-07')

      expect(rate).toBeCloseTo(1.123456, 6)
    })
  })

  describe('convertCurrency', () => {
    it('converts EUR to USD correctly', async () => {
      const mockSupabase = createMockSupabase({
        data: { rate: 1.12 },
        error: null,
      })

      const result = await convertCurrency(
        mockSupabase,
        10000, // €100.00 in cents
        'EUR',
        'USD',
        '2025-02-07'
      )

      expect(result).not.toBeNull()
      expect(result?.convertedAmount).toBe(11200) // $112.00 in cents
      expect(result?.rate).toBeCloseTo(1.12, 2)
    })

    it('returns null if rate unavailable', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: null,
      })

      const result = await convertCurrency(mockSupabase, 10000, 'EUR', 'INVALID', '2025-02-07')

      expect(result).toBeNull()
    })

    it('handles rounding correctly for odd amounts', async () => {
      const mockSupabase = createMockSupabase({
        data: { rate: 1.127 },
        error: null,
      })

      const result = await convertCurrency(
        mockSupabase,
        9999, // €99.99
        'EUR',
        'USD',
        '2025-02-07'
      )

      expect(result).not.toBeNull()
      // 9999 * 1.127 = 11268.873 → rounds to 11269
      expect(result?.convertedAmount).toBe(11269)
    })

    it('converts same currency (rate 1.0)', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: null,
      })

      const result = await convertCurrency(mockSupabase, 10000, 'EUR', 'EUR', '2025-02-07')

      expect(result).not.toBeNull()
      expect(result?.convertedAmount).toBe(10000)
      expect(result?.rate).toBe(1.0)
    })

    it('handles zero amount', async () => {
      const mockSupabase = createMockSupabase({
        data: { rate: 1.12 },
        error: null,
      })

      const result = await convertCurrency(mockSupabase, 0, 'EUR', 'USD', '2025-02-07')

      expect(result).not.toBeNull()
      expect(result?.convertedAmount).toBe(0)
    })

    it('handles large amounts without overflow', async () => {
      const mockSupabase = createMockSupabase({
        data: { rate: 1.12 },
        error: null,
      })

      const result = await convertCurrency(
        mockSupabase,
        1000000000, // €10,000,000.00
        'EUR',
        'USD',
        '2025-02-07'
      )

      expect(result).not.toBeNull()
      expect(result?.convertedAmount).toBe(1120000000) // $11,200,000.00
    })
  })

  describe('calculateInverseRate', () => {
    it('calculates inverse correctly for EUR→USD', () => {
      const eurToUsd = 1.12
      const usdToEur = calculateInverseRate(eurToUsd)

      expect(usdToEur).toBeCloseTo(0.8928571428571429, 6)
    })

    it('handles rate of 1.0', () => {
      const rate = calculateInverseRate(1.0)

      expect(rate).toBe(1.0)
    })

    it('throws error for zero rate', () => {
      expect(() => calculateInverseRate(0)).toThrow('Cannot calculate inverse of zero rate')
    })

    it('calculates inverse correctly for very small rates', () => {
      const rate = 0.01 // e.g., JPY to USD
      const inverse = calculateInverseRate(rate)

      expect(inverse).toBe(100)
    })

    it('calculates inverse correctly for very large rates', () => {
      const rate = 100 // e.g., USD to JPY
      const inverse = calculateInverseRate(rate)

      expect(inverse).toBe(0.01)
    })

    it('inverse of inverse equals original', () => {
      const originalRate = 1.12
      const inverse = calculateInverseRate(originalRate)
      const doubleInverse = calculateInverseRate(inverse)

      expect(doubleInverse).toBeCloseTo(originalRate, 10)
    })
  })

  describe('formatDateForFx', () => {
    it('formats Date object to YYYY-MM-DD', () => {
      const date = new Date('2025-02-07T12:30:45Z')
      const formatted = formatDateForFx(date)

      expect(formatted).toBe('2025-02-07')
    })

    it('extracts date from ISO string', () => {
      const isoString = '2025-02-07T12:30:45.123Z'
      const formatted = formatDateForFx(isoString)

      expect(formatted).toBe('2025-02-07')
    })

    it('handles date-only string (YYYY-MM-DD)', () => {
      const dateOnly = '2025-02-07'
      const formatted = formatDateForFx(dateOnly)

      expect(formatted).toBe('2025-02-07')
    })

    it('handles different timezones correctly', () => {
      const date = new Date('2025-02-07T23:59:59Z')
      const formatted = formatDateForFx(date)

      expect(formatted).toBe('2025-02-07')
    })

    it('handles midnight correctly', () => {
      const date = new Date('2025-02-07T00:00:00Z')
      const formatted = formatDateForFx(date)

      expect(formatted).toBe('2025-02-07')
    })
  })

  describe('Edge cases and error handling', () => {
    it('handles unexpected database structure gracefully', async () => {
      const mockSupabase = createMockSupabase({
        data: { unexpected: 'structure' },
        error: null,
      })

      const rate = await getFxRateFromCache(mockSupabase, 'EUR', 'USD', '2025-02-07')

      // Should handle gracefully and return null
      expect(rate).toBeNull()
    })

    it('handles missing rate property in response', async () => {
      const mockSupabase = createMockSupabase({
        data: {}, // Missing 'rate' property
        error: null,
      })

      const rate = await getFxRateFromCache(mockSupabase, 'EUR', 'USD', '2025-02-07')

      expect(rate).toBeNull()
    })
  })

  describe('Real-world scenarios', () => {
    it('EUR to USD conversion matches expected value', async () => {
      const mockSupabase = createMockSupabase({
        data: { rate: 1.0847 }, // Realistic EUR→USD rate
        error: null,
      })

      const result = await convertCurrency(
        mockSupabase,
        5000, // €50.00
        'EUR',
        'USD',
        '2025-02-07'
      )

      expect(result).not.toBeNull()
      expect(result?.convertedAmount).toBe(5424) // $54.24 (rounded from $54.235)
    })

    it('GBP to EUR conversion', async () => {
      const mockSupabase = createMockSupabase({
        data: { rate: 1.17 }, // Realistic GBP→EUR rate
        error: null,
      })

      const result = await convertCurrency(
        mockSupabase,
        10000, // £100.00
        'GBP',
        'EUR',
        '2025-02-07'
      )

      expect(result).not.toBeNull()
      expect(result?.convertedAmount).toBe(11700) // €117.00
    })

    it('handles JPY (no decimal places)', async () => {
      const mockSupabase = createMockSupabase({
        data: { rate: 163.5 }, // Realistic EUR→JPY rate
        error: null,
      })

      const result = await convertCurrency(
        mockSupabase,
        10000, // €100.00
        'EUR',
        'JPY',
        '2025-02-07'
      )

      expect(result).not.toBeNull()
      // JPY has no decimal places, so 10000 cents * 163.5 = 1,635,000 (¥16,350)
      expect(result?.convertedAmount).toBe(1635000)
    })
  })
})
