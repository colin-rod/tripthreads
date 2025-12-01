-- ============================================================================
-- Migration: Add FX rates table and base currency to trips
-- Description: Implements historical exchange rate caching and trip base currency
-- Author: Claude Code
-- Date: 2025-02-08
-- Related: CRO-809 [EPIC] E7 - Shared Ledger & FX
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE FX_RATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fx_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_currency TEXT NOT NULL DEFAULT 'EUR' CHECK (length(base_currency) = 3),
  target_currency TEXT NOT NULL CHECK (length(target_currency) = 3),
  rate DECIMAL(12, 6) NOT NULL CHECK (rate > 0),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one rate per currency pair per date
  CONSTRAINT unique_rate_per_day UNIQUE (base_currency, target_currency, date)
);

-- Indexes for fast lookups
CREATE INDEX idx_fx_rates_date ON public.fx_rates(date DESC);
CREATE INDEX idx_fx_rates_currencies ON public.fx_rates(base_currency, target_currency);
CREATE INDEX idx_fx_rates_lookup ON public.fx_rates(base_currency, target_currency, date);

-- ============================================================================
-- STEP 2: ADD BASE_CURRENCY TO TRIPS TABLE
-- ============================================================================

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS base_currency TEXT NOT NULL DEFAULT 'EUR'
  CHECK (length(base_currency) = 3);

CREATE INDEX idx_trips_base_currency ON public.trips(base_currency);

-- ============================================================================
-- STEP 3: ENABLE RLS ON FX_RATES TABLE
-- ============================================================================

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

-- RLS: fx_rates are public read-only for all authenticated users
CREATE POLICY "Authenticated users can read FX rates"
  ON public.fx_rates FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update rates (via Edge Function)
-- No INSERT/UPDATE policies = only service role key can modify

-- ============================================================================
-- STEP 4: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.fx_rates IS
  'Cached exchange rates fetched on-demand from exchangerate.host API.
   Rates are immutable once stored to ensure stable conversions over time.';

COMMENT ON COLUMN public.fx_rates.base_currency IS
  'Base currency code (ISO 4217, 3 letters) - typically EUR';

COMMENT ON COLUMN public.fx_rates.target_currency IS
  'Target currency code (ISO 4217, 3 letters)';

COMMENT ON COLUMN public.fx_rates.rate IS
  'Exchange rate with 6 decimal precision. Example: 1 EUR = 1.123456 USD';

COMMENT ON COLUMN public.fx_rates.date IS
  'Date for which this rate is valid (YYYY-MM-DD)';

COMMENT ON COLUMN public.trips.base_currency IS
  'Base currency for trip expenses and settlements. All expense conversions
   use this as the reference currency. Defaults to EUR.';

-- ============================================================================
-- USAGE NOTES
-- ============================================================================

-- To look up an FX rate:
-- SELECT rate FROM public.fx_rates
-- WHERE base_currency = 'EUR' AND target_currency = 'USD' AND date = '2025-02-07';

-- To convert expense to base currency:
-- SELECT amount * rate FROM public.expenses e
-- JOIN public.fx_rates fx ON fx.base_currency = (SELECT base_currency FROM trips WHERE id = e.trip_id)
--                        AND fx.target_currency = e.currency
--                        AND fx.date = e.date::date;

-- ============================================================================
