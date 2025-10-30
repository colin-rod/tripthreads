-- ============================================================================
-- Migration: Add partial joiner date range support
-- Description: Add join_start_date and join_end_date to trip_participants
-- Author: Claude Code
-- Date: 2025-01-30
-- Related: CRO-837 - Partial joiner date range selector & filtered views
-- ============================================================================

-- Add date range columns to trip_participants
ALTER TABLE public.trip_participants
  ADD COLUMN IF NOT EXISTS join_start_date DATE,
  ADD COLUMN IF NOT EXISTS join_end_date DATE;

-- Add check constraint: join_start_date must be <= join_end_date
ALTER TABLE public.trip_participants
  ADD CONSTRAINT valid_join_date_range
    CHECK (
      (join_start_date IS NULL AND join_end_date IS NULL) OR
      (join_start_date IS NOT NULL AND join_end_date IS NOT NULL AND join_start_date <= join_end_date)
    );

-- Add check constraint: join dates must be within trip dates
ALTER TABLE public.trip_participants
  ADD CONSTRAINT join_dates_within_trip_dates
    CHECK (
      (join_start_date IS NULL AND join_end_date IS NULL) OR
      (
        join_start_date >= (SELECT start_date FROM public.trips WHERE id = trip_id) AND
        join_end_date <= (SELECT end_date FROM public.trips WHERE id = trip_id)
      )
    );

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_trip_participants_join_dates
  ON public.trip_participants(trip_id, join_start_date, join_end_date)
  WHERE join_start_date IS NOT NULL;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if participant is present on a specific date
CREATE OR REPLACE FUNCTION public.is_participant_present_on_date(
  p_participant_id UUID,
  p_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  SELECT join_start_date, join_end_date
  INTO v_start_date, v_end_date
  FROM public.trip_participants
  WHERE id = p_participant_id;

  -- If no date range set, participant is present for entire trip
  IF v_start_date IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if date is within range
  RETURN p_date >= v_start_date AND p_date <= v_end_date;
END;
$$;

COMMENT ON FUNCTION public.is_participant_present_on_date IS
  'Check if a participant is present on a specific date based on their join date range';

-- Calculate days a participant is joining
CREATE OR REPLACE FUNCTION public.calculate_days_joined(
  p_participant_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_trip_start DATE;
  v_trip_end DATE;
BEGIN
  SELECT
    tp.join_start_date,
    tp.join_end_date,
    t.start_date,
    t.end_date
  INTO
    v_start_date,
    v_end_date,
    v_trip_start,
    v_trip_end
  FROM public.trip_participants tp
  JOIN public.trips t ON t.id = tp.trip_id
  WHERE tp.id = p_participant_id;

  -- If no date range, participant is joining for entire trip
  IF v_start_date IS NULL THEN
    RETURN (v_trip_end - v_trip_start) + 1;
  END IF;

  -- Calculate days in date range (inclusive)
  RETURN (v_end_date - v_start_date) + 1;
END;
$$;

COMMENT ON FUNCTION public.calculate_days_joined IS
  'Calculate the number of days a participant is joining the trip';

-- Check if participant is a partial joiner
CREATE OR REPLACE FUNCTION public.is_partial_joiner(
  p_participant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_trip_start DATE;
  v_trip_end DATE;
BEGIN
  SELECT
    tp.join_start_date,
    tp.join_end_date,
    t.start_date,
    t.end_date
  INTO
    v_start_date,
    v_end_date,
    v_trip_start,
    v_trip_end
  FROM public.trip_participants tp
  JOIN public.trips t ON t.id = tp.trip_id
  WHERE tp.id = p_participant_id;

  -- If no date range, not a partial joiner
  IF v_start_date IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Partial joiner if dates don't match trip dates exactly
  RETURN v_start_date > v_trip_start OR v_end_date < v_trip_end;
END;
$$;

COMMENT ON FUNCTION public.is_partial_joiner IS
  'Check if a participant is only joining for part of the trip';

-- ============================================================================
-- UPDATE EXISTING RLS POLICIES
-- ============================================================================

-- Drop and recreate the itinerary items SELECT policy to include date filtering
-- (This will be done when itinerary feature is implemented)

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.trip_participants.join_start_date IS
  'Start date for partial joiners. NULL means joining from trip start.';

COMMENT ON COLUMN public.trip_participants.join_end_date IS
  'End date for partial joiners. NULL means joining until trip end.';
