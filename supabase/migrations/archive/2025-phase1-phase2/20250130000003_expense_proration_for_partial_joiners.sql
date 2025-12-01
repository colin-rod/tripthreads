-- ============================================================================
-- Migration: Pro-rate expense splits for partial joiners
-- Description: Add functions to calculate pro-rated expense shares based on days joined
-- Author: Claude Code
-- Date: 2025-01-30
-- Related: CRO-837 - Partial joiner date range selector & filtered views
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS FOR EXPENSE PRORATION
-- ============================================================================

-- Get total days for a trip
CREATE OR REPLACE FUNCTION public.get_trip_total_days(
  p_trip_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  SELECT start_date, end_date
  INTO v_start_date, v_end_date
  FROM public.trips
  WHERE id = p_trip_id;

  IF v_start_date IS NULL OR v_end_date IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate days inclusive
  RETURN (v_end_date - v_start_date) + 1;
END;
$$;

COMMENT ON FUNCTION public.get_trip_total_days IS
  'Get the total number of days for a trip (inclusive)';

-- Calculate pro-rated share for a participant based on days joined
CREATE OR REPLACE FUNCTION public.calculate_prorated_share(
  p_expense_amount NUMERIC,
  p_participant_id UUID,
  p_total_participants INTEGER
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_days_joined INTEGER;
  v_total_trip_days INTEGER;
  v_trip_id UUID;
  v_equal_share NUMERIC;
  v_prorated_share NUMERIC;
BEGIN
  -- Get trip_id for the participant
  SELECT trip_id INTO v_trip_id
  FROM public.trip_participants
  WHERE id = p_participant_id;

  -- Get days joined for this participant
  v_days_joined := public.calculate_days_joined(p_participant_id);

  -- Get total trip days
  v_total_trip_days := public.get_trip_total_days(v_trip_id);

  -- If total trip days is 0 or participant joined for full trip, use equal split
  IF v_total_trip_days = 0 OR v_days_joined >= v_total_trip_days THEN
    RETURN p_expense_amount / p_total_participants;
  END IF;

  -- Calculate equal share per day
  v_equal_share := p_expense_amount / p_total_participants;

  -- Pro-rate based on days joined
  v_prorated_share := v_equal_share * (v_days_joined::NUMERIC / v_total_trip_days::NUMERIC);

  RETURN v_prorated_share;
END;
$$;

COMMENT ON FUNCTION public.calculate_prorated_share IS
  'Calculate a participant''s pro-rated share of an expense based on the number of days they are joining.
   For example, if a trip is 7 days and participant joins for 3 days, they pay 3/7 of their equal share.';

-- ============================================================================
-- VIEW: Expense shares with proration
-- ============================================================================

-- Create a view that calculates pro-rated expense shares
CREATE OR REPLACE VIEW public.expense_shares_prorated AS
SELECT
  ep.id,
  ep.expense_id,
  ep.user_id,
  ep.share_amount as original_share_amount,
  ep.share_type,
  ep.share_value,
  e.amount as expense_amount,
  e.trip_id,
  tp.id as participant_id,
  CASE
    -- If share_type is 'amount', use the custom amount (no proration)
    WHEN ep.share_type = 'amount' THEN ep.share_amount

    -- If share_type is 'equal', pro-rate based on days joined
    WHEN ep.share_type = 'equal' THEN
      public.calculate_prorated_share(
        e.amount,
        tp.id,
        (SELECT COUNT(*) FROM public.expense_participants WHERE expense_id = e.id)
      )

    -- If share_type is 'percentage', calculate from percentage (no proration for manual percentages)
    WHEN ep.share_type = 'percentage' THEN
      (e.amount * ep.share_value / 100)

    ELSE ep.share_amount
  END as prorated_share_amount,
  public.calculate_days_joined(tp.id) as days_joined,
  public.get_trip_total_days(e.trip_id) as total_trip_days,
  public.is_partial_joiner(tp.id) as is_partial_joiner
FROM public.expense_participants ep
JOIN public.expenses e ON e.id = ep.expense_id
JOIN public.trip_participants tp ON tp.user_id = ep.user_id AND tp.trip_id = e.trip_id;

COMMENT ON VIEW public.expense_shares_prorated IS
  'View that shows expense shares with pro-rated amounts for partial joiners.
   For equal splits, the share is pro-rated by (days_joined / total_trip_days).
   For custom amounts and percentages, the original share amount is used.';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.calculate_days_joined IS
  'Calculate the number of days a participant is joining the trip.
   Returns total trip days if participant has no date range set (full trip).
   Returns (join_end_date - join_start_date + 1) if date range is set.';

-- ============================================================================
-- USAGE NOTES
-- ============================================================================

-- To get pro-rated expense shares for a trip:
-- SELECT * FROM public.expense_shares_prorated WHERE trip_id = '<trip_id>';

-- To calculate settlements with proration:
-- Use the prorated_share_amount column instead of share_amount when calculating
-- who owes whom.

-- ============================================================================
