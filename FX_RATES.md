# TripThreads - FX Rate Integration Guide

## 🌍 Overview

TripThreads uses historical foreign exchange rates from **exchangerate.host** to handle multi-currency expense tracking. This ensures accurate conversions at the time expenses were incurred, not just current rates.

## 🎯 Strategy: Snapshot-on-Create

**We store FX rate snapshots with each expense, not in a separate table.**

### Why This Approach?

- ✅ **Simple** - No daily cron job, no separate table to maintain
- ✅ **Accurate** - Each expense remembers its exact conversion rate
- ✅ **Fast** - No additional joins or API calls when viewing expenses
- ✅ **Offline-friendly** - Stored rate works offline
- ❌ No daily sync job needed
- ❌ No `fx_rates` table

### When Rate is Fetched

1. **User creates expense** → Fetch rate from API → Store with expense
2. **User views expense** → Use stored `fx_rate` field (no API call)
3. **User settles debts** → Use stored rates for conversions

## 📡 API: exchangerate.host

**Base URL:** `https://api.exchangerate.host`

**Features:**
- ✅ Free tier (no API key required for basic usage)
- ✅ Historical rates dating back to 1999
- ✅ 170+ currencies
- ✅ Daily rate updates
- ✅ JSON response format
- ✅ 250 requests/month free (plenty for MVP)

### API Endpoints

#### 1. Latest Rates

```
GET https://api.exchangerate.host/latest?base=EUR&symbols=USD,GBP
```

**Response:**
```json
{
  "success": true,
  "base": "EUR",
  "date": "2025-10-28",
  "rates": {
    "USD": 1.0856,
    "GBP": 0.8342
  }
}
```

#### 2. Historical Rates

```
GET https://api.exchangerate.host/2025-10-15?base=EUR&symbols=USD
```

**Response:**
```json
{
  "success": true,
  "base": "EUR",
  "date": "2025-10-15",
  "rates": {
    "USD": 1.0923
  }
}
```

---

## 🗄️ Database Schema

### `expenses` Table (with FX snapshot)

```sql
-- Add fx_rate column to expenses table
ALTER TABLE expenses ADD COLUMN fx_rate DECIMAL(10, 6);

-- Optional: Add index if you filter by currency often
CREATE INDEX idx_expenses_currency ON expenses(currency);
```

### Example Expense with FX Snapshot

| id | trip_id | description | amount | currency | fx_rate | date | payer_id |
|----|---------|-------------|--------|----------|---------|------|----------|
| uuid-1 | trip-123 | Dinner | 6000 | EUR | NULL | 2025-10-28 | user-1 |
| uuid-2 | trip-123 | Taxi | 5000 | USD | 0.9211 | 2025-10-28 | user-2 |
| uuid-3 | trip-123 | Hotel | 15000 | GBP | 1.1982 | 2025-10-27 | user-1 |

**Note:** `fx_rate` is the rate to convert **to trip base currency** (e.g., USD → EUR rate stored as 0.9211)

---

## 🔧 Implementation

### 1. Client-Side Utility (Fetch Rate from API)

**File:** `packages/shared/utils/fx.ts`

```typescript
// In-memory cache for FX rates (per session, avoid duplicate API calls)
const fxCache = new Map<string, number>()

interface FxRateResponse {
  success: boolean
  base: string
  date: string
  rates: Record<string, number>
}

/**
 * Fetch FX rate from exchangerate.host API for a specific date
 * @param fromCurrency - Source currency (e.g., 'USD')
 * @param toCurrency - Target currency (e.g., 'EUR')
 * @param date - Date in YYYY-MM-DD format
 * @returns Exchange rate (e.g., 0.9211 for USD -> EUR)
 */
export async function fetchFxRate(
  fromCurrency: string,
  toCurrency: string,
  date: string // YYYY-MM-DD
): Promise<number> {
  // Same currency = 1.0
  if (fromCurrency === toCurrency) {
    return 1.0
  }

  // Check cache
  const cacheKey = `${fromCurrency}-${toCurrency}-${date}`
  if (fxCache.has(cacheKey)) {
    return fxCache.get(cacheKey)!
  }

  // Fetch from API
  const url = `https://api.exchangerate.host/${date}?base=${fromCurrency}&symbols=${toCurrency}`

  try {
    const response = await fetch(url)
    const data: FxRateResponse = await response.json()

    if (!data.success || !data.rates[toCurrency]) {
      throw new Error(`No rate found for ${fromCurrency} -> ${toCurrency} on ${date}`)
    }

    const rate = data.rates[toCurrency]

    // Cache and return
    fxCache.set(cacheKey, rate)
    return rate
  } catch (error) {
    console.error('Failed to fetch FX rate:', error)
    throw new Error(`Failed to fetch FX rate for ${fromCurrency} -> ${toCurrency}`)
  }
}

/**
 * Convert amount from one currency to another using a given rate
 * @param amount - Amount to convert (in major units, e.g., 100.00 for $100)
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @param rate - Exchange rate to use
 * @returns Converted amount, rounded to 2 decimal places
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rate: number
): number {
  if (fromCurrency === toCurrency) {
    return amount
  }

  const converted = amount * rate
  return Math.round(converted * 100) / 100 // Round to 2 decimals
}

/**
 * Get FX rate for today (uses 'latest' endpoint for better performance)
 */
export async function fetchLatestFxRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return 1.0
  }

  const url = `https://api.exchangerate.host/latest?base=${fromCurrency}&symbols=${toCurrency}`

  try {
    const response = await fetch(url)
    const data: FxRateResponse = await response.json()

    if (!data.success || !data.rates[toCurrency]) {
      throw new Error(`No rate found for ${fromCurrency} -> ${toCurrency}`)
    }

    return data.rates[toCurrency]
  } catch (error) {
    console.error('Failed to fetch latest FX rate:', error)
    throw new Error(`Failed to fetch latest FX rate for ${fromCurrency} -> ${toCurrency}`)
  }
}
```

### 2. TDD Tests for FX Utilities

**File:** `packages/shared/utils/__tests__/fx.test.ts`

```typescript
import { fetchFxRate, convertCurrency, fetchLatestFxRate } from '../fx'

// Mock global fetch
global.fetch = jest.fn()

describe('fetchFxRate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear cache between tests
    ;(fetchFxRate as any).fxCache?.clear()
  })

  it('should return 1.0 for same currency', async () => {
    const rate = await fetchFxRate('EUR', 'EUR', '2025-10-28')
    expect(rate).toBe(1.0)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should fetch rate from exchangerate.host API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        base: 'EUR',
        date: '2025-10-28',
        rates: { USD: 1.0856 }
      })
    })

    const rate = await fetchFxRate('EUR', 'USD', '2025-10-28')

    expect(rate).toBe(1.0856)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.exchangerate.host/2025-10-28?base=EUR&symbols=USD'
    )
  })

  it('should throw error if API returns failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false
      })
    })

    await expect(fetchFxRate('EUR', 'USD', '2025-10-28')).rejects.toThrow(
      'No rate found for EUR -> USD on 2025-10-28'
    )
  })

  it('should throw error if fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    await expect(fetchFxRate('EUR', 'USD', '2025-10-28')).rejects.toThrow(
      'Failed to fetch FX rate for EUR -> USD'
    )
  })

  it('should cache rates to avoid duplicate API calls', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        rates: { USD: 1.0856 }
      })
    })

    await fetchFxRate('EUR', 'USD', '2025-10-28')
    await fetchFxRate('EUR', 'USD', '2025-10-28') // Second call

    // Should only call API once (cached)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

describe('convertCurrency', () => {
  it('should convert EUR to USD', () => {
    const result = convertCurrency(100, 'EUR', 'USD', 1.0856)
    expect(result).toBe(108.56)
  })

  it('should return same amount for same currency', () => {
    const result = convertCurrency(100, 'EUR', 'EUR', 1.0)
    expect(result).toBe(100)
  })

  it('should round to 2 decimal places', () => {
    const result = convertCurrency(33.333, 'EUR', 'USD', 1.1)
    expect(result).toBe(36.67)
  })

  it('should handle zero amount', () => {
    const result = convertCurrency(0, 'EUR', 'USD', 1.0856)
    expect(result).toBe(0)
  })

  it('should handle negative amounts (refunds)', () => {
    const result = convertCurrency(-50, 'EUR', 'USD', 1.1)
    expect(result).toBe(-55)
  })
})

describe('fetchLatestFxRate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch latest rate from API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        base: 'EUR',
        date: '2025-10-28',
        rates: { USD: 1.0900 }
      })
    })

    const rate = await fetchLatestFxRate('EUR', 'USD')

    expect(rate).toBe(1.0900)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.exchangerate.host/latest?base=EUR&symbols=USD'
    )
  })

  it('should return 1.0 for same currency', async () => {
    const rate = await fetchLatestFxRate('EUR', 'EUR')
    expect(rate).toBe(1.0)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
```

---

## 📊 Usage in Expenses

### Storing Expense with FX Snapshot

When an expense is created, fetch the rate and store it with the expense:

```typescript
// apps/web/lib/supabase/mutations.ts

import { fetchFxRate } from '@/packages/shared/utils/fx'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function createExpense(data: {
  tripId: string
  description: string
  amount: number // in minor units (cents)
  currency: string
  payerId: string
  date: string // ISO 8601
  participants: { userId: string; share: number }[]
}) {
  // Get trip's base currency (usually EUR, but could be USD, etc.)
  const { data: trip } = await supabase
    .from('trips')
    .select('base_currency')
    .eq('id', data.tripId)
    .single()

  const baseCurrency = trip?.base_currency || 'EUR'

  // Fetch FX rate for the expense date (snapshot)
  let fxRate: number | null = null
  if (data.currency !== baseCurrency) {
    try {
      fxRate = await fetchFxRate(data.currency, baseCurrency, data.date.split('T')[0])
    } catch (error) {
      console.error('Failed to fetch FX rate:', error)
      // Continue without rate (user can manually update later)
    }
  }

  // Insert expense with FX snapshot
  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      trip_id: data.tripId,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      payer_id: data.payerId,
      date: data.date,
      fx_rate: fxRate, // Store snapshot (null if same currency)
      created_by: data.payerId
    })
    .select()
    .single()

  if (error) throw error

  // Insert expense participants
  const participants = data.participants.map(p => ({
    expense_id: expense.id,
    user_id: p.userId,
    share_amount: p.share
  }))

  await supabase.from('expense_participants').insert(participants)

  return expense
}
```

### Converting Expenses for Settlements

```typescript
// packages/shared/utils/settlements.ts

import { convertCurrency } from './fx'

interface Expense {
  id: string
  amount: number // in cents
  currency: string
  fx_rate: number | null // Stored snapshot
  payer_id: string
  participants: { user_id: string; share_amount: number }[]
}

export function calculateSettlements(
  expenses: Expense[],
  baseCurrency: string = 'EUR'
) {
  // Convert all expenses to base currency using stored rates
  const balances = new Map<string, number>()

  for (const expense of expenses) {
    // Use stored fx_rate if available, otherwise assume same currency
    const rate = expense.fx_rate || 1.0

    const amountInBase = convertCurrency(
      expense.amount / 100, // Convert from cents to major units
      expense.currency,
      baseCurrency,
      rate // Use stored snapshot
    )

    // Update balances for payer
    const payerBalance = balances.get(expense.payer_id) || 0
    balances.set(expense.payer_id, payerBalance + amountInBase)

    // Update balances for participants
    for (const participant of expense.participants) {
      const shareInBase = convertCurrency(
        participant.share_amount / 100,
        expense.currency,
        baseCurrency,
        rate
      )
      const participantBalance = balances.get(participant.user_id) || 0
      balances.set(participant.user_id, participantBalance - shareInBase)
    }
  }

  return optimizeDebts(balances)
}

function optimizeDebts(balances: Map<string, number>) {
  // Debt optimization algorithm (minimize number of transactions)
  // ... implementation
}
```

---

## 🚀 Deployment Checklist

- [ ] Add `fx_rate` column to `expenses` table in Supabase
- [ ] Deploy `fetchFxRate` utility to shared package
- [ ] Update `createExpense` mutation to fetch and store rates
- [ ] Test rate fetching in dev environment
- [ ] Test offline behavior (rate missing, use 1.0 or show warning)
- [ ] Add error handling for API failures
- [ ] Set up Sentry alerts for FX rate fetch failures

---

## 🔍 Monitoring & Error Handling

### Metrics to Track

1. **FX rate fetch success rate** - Should be >95%
2. **API response time** - Should be <1s
3. **Expenses created without rates** - Should be <5%
4. **Cache hit rate** - Track how often cache avoids API calls

### Error Handling Strategy

**When FX rate fetch fails:**

1. **Log error to Sentry** with context
2. **Store expense with `fx_rate: null`**
3. **Show warning to user**: "Exchange rate unavailable, balances may be inaccurate"
4. **Allow manual rate entry** (optional feature)

```typescript
// In createExpense mutation
try {
  fxRate = await fetchFxRate(data.currency, baseCurrency, date)
} catch (error) {
  Sentry.captureException(error, {
    tags: { service: 'fx-rate-fetch' },
    extra: {
      fromCurrency: data.currency,
      toCurrency: baseCurrency,
      date: date
    }
  })

  // Continue without rate
  fxRate = null

  // Optionally: Show toast to user
  toast.warning('Could not fetch exchange rate. Balances may be inaccurate.')
}
```

### Fallback Strategies

If API is down when creating expense:

1. **Option A:** Use `fetchLatestFxRate()` instead of historical (less accurate but works)
2. **Option B:** Store with `null` rate, fetch later via background job
3. **Option C:** Allow user to manually enter rate

---

## 📚 Resources

- [exchangerate.host Documentation](https://exchangerate.host/)
- [ISO 4217 Currency Codes](https://en.wikipedia.org/wiki/ISO_4217)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [GitHub Actions Cron Syntax](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)

---

## 🔮 Future Enhancements (Post-MVP)

If you later need a full `fx_rates` table (Phase 5+):

### Use Cases
- **Trip budget planning** - "What's my €1000 budget worth in USD?"
- **Currency trend charts** - Show rate fluctuations during trip
- **Offline expense creation** - Pre-cache rates for common currencies
- **Bulk backfill** - Fix expenses missing rates

### Implementation
- Add daily cron job (via Supabase Edge Function)
- Create `fx_rates` table with unique constraint
- Update `fetchFxRate()` to check database first, then API
- Keep snapshot approach (don't remove `fx_rate` from expenses)

---

## ✅ Summary

**What we're doing (MVP):**
- ✅ Fetch rate from API when expense is created
- ✅ Store rate snapshot in `expenses.fx_rate` column
- ✅ Use stored rate for conversions and settlements
- ✅ Cache rates in-memory to avoid duplicate API calls
- ✅ Handle API failures gracefully

**What we're NOT doing (yet):**
- ❌ No daily cron job
- ❌ No separate `fx_rates` table
- ❌ No pre-caching of rates
- ❌ No bulk historical backfills

This keeps things simple for MVP while ensuring accurate multi-currency tracking!

---

**Next Steps:**
1. Add `fx_rate DECIMAL(10, 6)` column to `expenses` table
2. Implement `fetchFxRate()` utility with tests
3. Update `createExpense()` mutation to fetch and store rates
4. Test with multiple currencies
5. Add error handling and Sentry alerts
