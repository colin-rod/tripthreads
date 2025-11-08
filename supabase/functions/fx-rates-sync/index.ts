/**
 * FX Rates Sync Edge Function
 *
 * Fetches exchange rates from OpenExchangeRates API on-demand and caches them
 * in the fx_rates table. Supports fetching rates for specific dates and base currencies.
 *
 * Query Parameters:
 * - date: YYYY-MM-DD (defaults to today)
 * - base: Base currency code (defaults to EUR)
 *
 * Example Usage:
 * POST /functions/v1/fx-rates-sync
 * POST /functions/v1/fx-rates-sync?date=2025-02-01
 * POST /functions/v1/fx-rates-sync?date=2025-02-01&base=USD
 *
 * OpenExchangeRates API Docs:
 * - Latest rates: https://docs.openexchangerates.org/reference/latest-json
 * - Historical rates: https://docs.openexchangerates.org/reference/historical-json
 * - Free tier: 1,000 requests/month, USD base only
 * - Paid tier ($12/mo): 100,000 requests/month, any base currency
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async req => {
  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Parse query parameters
    const url = new URL(req.url)
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]
    const baseCurrency = url.searchParams.get('base') || 'EUR'

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate currency code (3 letters)
    if (!/^[A-Z]{3}$/.test(baseCurrency)) {
      return new Response(
        JSON.stringify({ error: 'Invalid base currency. Must be 3-letter code (e.g., EUR, USD)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetching FX rates for ${baseCurrency} on ${date}`)

    // Fetch rates from OpenExchangeRates
    const apiKey = Deno.env.get('OPENEXCHANGERATES_API_KEY')

    if (!apiKey) {
      throw new Error('OPENEXCHANGERATES_API_KEY environment variable is required')
    }

    // Determine if we're fetching latest or historical rates
    const isToday = date === new Date().toISOString().split('T')[0]

    // OpenExchangeRates API endpoints:
    // - Latest: https://openexchangerates.org/api/latest.json
    // - Historical: https://openexchangerates.org/api/historical/YYYY-MM-DD.json
    const endpoint = isToday
      ? 'https://openexchangerates.org/api/latest.json'
      : `https://openexchangerates.org/api/historical/${date}.json`

    // Note: Free tier only supports USD as base currency
    // Paid tier allows base parameter: ?base=EUR
    // For free tier, we'll convert from USD to desired base currency
    const apiUrl = `${endpoint}?app_id=${apiKey}`

    const response = await fetch(apiUrl)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `OpenExchangeRates API error: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const data = await response.json()

    // OpenExchangeRates response structure:
    // { base: "USD", rates: { EUR: 0.92, GBP: 0.79, ... } }
    if (!data.rates || typeof data.rates !== 'object') {
      throw new Error('OpenExchangeRates API returned invalid data structure')
    }

    let rates = data.rates
    const apiBaseCurrency = data.base || 'USD'

    // If requested base currency differs from API base (USD on free tier),
    // we need to convert all rates
    if (baseCurrency !== apiBaseCurrency) {
      const baseRate = data.rates[baseCurrency]

      if (!baseRate) {
        throw new Error(
          `Cannot convert to base currency ${baseCurrency}: rate not found in API response`
        )
      }

      // Convert all rates from USD-based to baseCurrency-based
      // Formula: To convert from USD to EUR-based rates:
      // If USD -> GBP = 0.79 and USD -> EUR = 0.92
      // Then EUR -> GBP = (USD -> GBP) / (USD -> EUR) = 0.79 / 0.92 = 0.859
      rates = Object.fromEntries(
        Object.entries(data.rates).map(([currency, usdRate]) => {
          const convertedRate = (usdRate as number) / baseRate
          return [currency, convertedRate]
        })
      )

      // Add the base currency itself with rate 1.0
      rates[baseCurrency] = 1.0
    }

    if (!rates || Object.keys(rates).length === 0) {
      throw new Error('FX API returned no rates')
    }

    // Transform rates into database records
    const rateRecords = Object.entries(rates).map(([currency, rate]) => ({
      base_currency: baseCurrency,
      target_currency: currency,
      rate: rate as number,
      date: date,
    }))

    console.log(`Upserting ${rateRecords.length} FX rates`)

    // Upsert rates into fx_rates table
    // Use upsert to handle case where rates already exist for this date
    const { error } = await supabase.from('fx_rates').upsert(rateRecords, {
      onConflict: 'base_currency,target_currency,date',
      ignoreDuplicates: false, // Update existing rates if they differ
    })

    if (error) {
      console.error('Database error:', error)
      throw new Error(`Failed to insert FX rates: ${error.message}`)
    }

    console.log(`Successfully cached ${rateRecords.length} FX rates`)

    return new Response(
      JSON.stringify({
        success: true,
        date,
        base: baseCurrency,
        count: rateRecords.length,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('FX sync error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
