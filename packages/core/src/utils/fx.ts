/**
 * Foreign Exchange (FX) Utilities for TripThreads
 *
 * Provides functions for fetching, caching, and converting currencies using
 * historical exchange rates from exchangerate.host API.
 *
 * Strategy: On-demand fetching with caching
 * - Check cache first (fx_rates table)
 * - If not found, fetch from API and cache
 * - If API fails, return null (graceful degradation)
 */

import * as Sentry from '@sentry/nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

/**
 * Get FX rate from cache (fx_rates table)
 * Returns null if not found
 *
 * @param supabase - Supabase client
 * @param fromCurrency - Base currency code (e.g., 'EUR')
 * @param toCurrency - Target currency code (e.g., 'USD')
 * @param date - Date in YYYY-MM-DD format
 * @returns Exchange rate or null if not cached
 *
 * @example
 * const rate = await getFxRateFromCache(supabase, 'EUR', 'USD', '2025-02-07')
 * // Returns: 1.12 (1 EUR = 1.12 USD)
 */
export async function getFxRateFromCache(
  supabase: SupabaseClient<Database>,
  fromCurrency: string,
  toCurrency: string,
  date: string
): Promise<number | null> {
  // Same currency always has rate of 1.0
  if (fromCurrency === toCurrency) {
    return 1.0
  }

  try {
    const { data, error } = await supabase
      .from('fx_rates')
      .select('rate')
      .eq('base_currency', fromCurrency)
      .eq('target_currency', toCurrency)
      .eq('date', date)
      .maybeSingle()

    if (error) {
      console.error('Error fetching FX rate from cache:', error)
      return null
    }

    if (!data || typeof data.rate !== 'number') {
      return null // Rate not in cache or malformed entry
    }

    return data.rate
  } catch (error) {
    console.error('Unexpected error in getFxRateFromCache:', error)
    return null
  }
}

/**
 * Fetch FX rates from API via Edge Function and cache them
 *
 * @param supabaseUrl - Supabase project URL
 * @param serviceRoleKey - Supabase service role key (for calling Edge Function)
 * @param fromCurrency - Base currency code
 * @param date - Date in YYYY-MM-DD format
 * @throws Error if API call fails
 *
 * @example
 * await fetchAndCacheFxRate(
 *   'https://xxx.supabase.co',
 *   'service_role_key',
 *   'EUR',
 *   '2025-02-07'
 * )
 */
export async function fetchAndCacheFxRate(
  supabaseUrl: string,
  serviceRoleKey: string,
  fromCurrency: string,
  date: string
): Promise<void> {
  const url = `${supabaseUrl}/functions/v1/fx-rates-sync?date=${date}&base=${fromCurrency}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(`Failed to fetch FX rates: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(`FX API returned error: ${data.error || 'Unknown error'}`)
  }
}

/**
 * Get FX rate with on-demand fallback
 *
 * Strategy:
 * 1. Check cache first
 * 2. If not found and credentials provided, fetch from API and cache
 * 3. If API fails or no credentials, return null
 *
 * @param supabase - Supabase client
 * @param fromCurrency - Base currency code (e.g., 'EUR')
 * @param toCurrency - Target currency code (e.g., 'USD')
 * @param date - Date in YYYY-MM-DD format
 * @param options - Optional Supabase URL and service role key for on-demand fetching
 * @returns Exchange rate or null if unavailable
 *
 * @example
 * // Cache-only lookup
 * const rate = await getFxRate(supabase, 'EUR', 'USD', '2025-02-07')
 *
 * // With on-demand fallback
 * const rate = await getFxRate(supabase, 'EUR', 'USD', '2025-02-07', {
 *   supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
 *   serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
 * })
 */
export async function getFxRate(
  supabase: SupabaseClient<Database>,
  fromCurrency: string,
  toCurrency: string,
  date: string,
  options?: {
    supabaseUrl?: string
    serviceRoleKey?: string
  }
): Promise<number | null> {
  // Try cache first
  let rate = await getFxRateFromCache(supabase, fromCurrency, toCurrency, date)

  if (rate !== null) {
    return rate
  }

  // Cache miss - try on-demand fetch if credentials provided
  if (options?.supabaseUrl && options?.serviceRoleKey) {
    try {
      console.log(
        `FX rate not in cache, fetching on-demand: ${fromCurrency}→${toCurrency} on ${date}`
      )

      await fetchAndCacheFxRate(options.supabaseUrl, options.serviceRoleKey, fromCurrency, date)

      // Retry cache lookup after fetching
      rate = await getFxRateFromCache(supabase, fromCurrency, toCurrency, date)

      if (rate !== null) {
        console.log(`Successfully fetched and cached FX rate: ${rate}`)
        return rate
      }
    } catch (error) {
      console.error('On-demand FX fetch failed:', error)

      // Log to Sentry
      Sentry.captureException(error, {
        tags: {
          feature: 'fx_rates',
          operation: 'on_demand_fetch',
        },
        contexts: {
          fx: {
            fromCurrency,
            toCurrency,
            date,
          },
        },
      })

      // Continue and return null (graceful degradation)
    }
  }

  // No rate available - log warning to Sentry
  console.warn(`FX rate unavailable for ${fromCurrency}→${toCurrency} on ${date}`)

  Sentry.captureMessage(`FX rate unavailable: ${fromCurrency}→${toCurrency} on ${date}`, {
    level: 'warning',
    tags: {
      feature: 'fx_rates',
      fromCurrency,
      toCurrency,
      date,
    },
  })

  return null
}

/**
 * Convert amount between currencies using FX rate
 *
 * @param supabase - Supabase client
 * @param amount - Amount in minor units (cents)
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param date - Date in YYYY-MM-DD format
 * @param options - Optional Supabase URL and service role key for on-demand fetching
 * @returns Converted amount and rate, or null if rate unavailable
 *
 * @example
 * const result = await convertCurrency(
 *   supabase,
 *   10000, // €100.00 in cents
 *   'EUR',
 *   'USD',
 *   '2025-02-07'
 * )
 * // Returns: { convertedAmount: 11200, rate: 1.12 } ($112.00)
 */
export async function convertCurrency(
  supabase: SupabaseClient<Database>,
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date: string,
  options?: {
    supabaseUrl?: string
    serviceRoleKey?: string
  }
): Promise<{ convertedAmount: number; rate: number } | null> {
  const rate = await getFxRate(supabase, fromCurrency, toCurrency, date, options)

  if (rate === null) {
    return null
  }

  return {
    convertedAmount: Math.round(amount * rate),
    rate: rate,
  }
}

/**
 * Calculate inverse rate for reverse conversions
 *
 * Example: If EUR→USD rate is 1.12, then USD→EUR rate is 1/1.12 = 0.893
 *
 * @param rate - Exchange rate
 * @returns Inverse rate
 *
 * @example
 * const eurToUsd = 1.12
 * const usdToEur = calculateInverseRate(eurToUsd)
 * // Returns: 0.8928571428571429
 */
export function calculateInverseRate(rate: number): number {
  if (rate === 0) {
    throw new Error('Cannot calculate inverse of zero rate')
  }
  return 1 / rate
}

/**
 * Format date to YYYY-MM-DD
 *
 * @param date - Date object or ISO string
 * @returns Date in YYYY-MM-DD format
 *
 * @example
 * formatDateForFx(new Date('2025-02-07T12:30:00Z'))
 * // Returns: '2025-02-07'
 */
export function formatDateForFx(date: Date | string): string {
  if (typeof date === 'string') {
    return date.split('T')[0]
  }
  return date.toISOString().split('T')[0]
}
