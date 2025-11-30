-- ============================================================================
-- Migration: Update RLS policies to respect partial joiner date ranges
-- Description: Update can_user_see_item function to check join_start_date/join_end_date
-- Author: Claude Code
-- Date: 2025-01-30
-- Related: CRO-837 - Partial joiner date range selector & filtered views
-- ============================================================================

-- Update can_user_see_item function to respect partial joiner date ranges
CREATE OR REPLACE FUNCTION public.can_user_see_item(
  p_item_date TIMESTAMPTZ,
  p_trip_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_user_role TEXT;
  v_joined_at TIMESTAMPTZ;
  v_join_start_date DATE;
  v_join_end_date DATE;
  v_item_date_only DATE;
BEGIN
  -- Check if user is the trip owner (bypass RLS)
  SELECT EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = p_trip_id AND owner_id = p_user_id
  ) INTO v_is_owner;

  IF v_is_owner THEN
    RETURN true;
  END IF;

  -- Get user's role, join date, and partial joiner date range from trip_participants
  SELECT role, joined_at, join_start_date, join_end_date
  INTO v_user_role, v_joined_at, v_join_start_date, v_join_end_date
  FROM public.trip_participants
  WHERE trip_id = p_trip_id AND user_id = p_user_id
  LIMIT 1;

  -- If user not found in trip_participants, return false
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Viewers see everything
  IF v_user_role = 'viewer' THEN
    RETURN true;
  END IF;

  -- Participants: check partial joiner date range if set
  IF v_user_role = 'participant' THEN
    -- If partial joiner (has date range set)
    IF v_join_start_date IS NOT NULL AND v_join_end_date IS NOT NULL THEN
      -- Extract date from timestamp for comparison
      v_item_date_only := p_item_date::DATE;

      -- Item must be within the participant's date range
      RETURN v_item_date_only >= v_join_start_date
         AND v_item_date_only <= v_join_end_date;
    ELSE
      -- Not a partial joiner: see items from their join date forward (legacy behavior)
      RETURN p_item_date >= v_joined_at;
    END IF;
  END IF;

  -- Default: no access
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_user_see_item IS
  'Check if a user can see an itinerary item based on their role and partial joiner date range.
   Owners see all items. Viewers see all items. Participants see items within their date range
   (join_start_date to join_end_date) if they are partial joiners, or from their joined_at date
   forward if they are full trip participants.';

-- ============================================================================
-- Create function to check if user can see expense on a date
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_user_see_expense(
  p_expense_date DATE,
  p_trip_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_user_role TEXT;
  v_join_start_date DATE;
  v_join_end_date DATE;
  v_joined_at TIMESTAMPTZ;
BEGIN
  -- Check if user is the trip owner
  SELECT EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = p_trip_id AND owner_id = p_user_id
  ) INTO v_is_owner;

  IF v_is_owner THEN
    RETURN true;
  END IF;

  -- Get user's role and date range from trip_participants
  SELECT role, join_start_date, join_end_date, joined_at
  INTO v_user_role, v_join_start_date, v_join_end_date, v_joined_at
  FROM public.trip_participants
  WHERE trip_id = p_trip_id AND user_id = p_user_id
  LIMIT 1;

  -- If user not found in trip_participants, return false
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Viewers cannot see expenses (as per PRD)
  IF v_user_role = 'viewer' THEN
    RETURN false;
  END IF;

  -- Participants: check partial joiner date range if set
  IF v_user_role = 'participant' THEN
    -- If partial joiner (has date range set)
    IF v_join_start_date IS NOT NULL AND v_join_end_date IS NOT NULL THEN
      -- Expense must be within the participant's date range
      RETURN p_expense_date >= v_join_start_date
         AND p_expense_date <= v_join_end_date;
    ELSE
      -- Not a partial joiner: see all expenses (legacy behavior)
      RETURN true;
    END IF;
  END IF;

  -- Default: no access
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_user_see_expense IS
  'Check if a user can see an expense based on their role and partial joiner date range.
   Owners see all expenses. Viewers cannot see expenses. Participants see expenses within
   their date range (join_start_date to join_end_date) if they are partial joiners, or
   all expenses if they are full trip participants.';

-- ============================================================================
-- Update expenses RLS policy to use can_user_see_expense
-- ============================================================================

-- Drop existing SELECT policy for expenses
DROP POLICY IF EXISTS "Users can read expenses based on trip participation" ON public.expenses;

-- Create new policy using can_user_see_expense function
CREATE POLICY "Users can read expenses based on trip participation"
  ON public.expenses FOR SELECT
  USING (
    public.can_user_see_expense(date, trip_id, auth.uid())
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can read expenses based on trip participation" ON public.expenses IS
  'Participants can only see expenses within their partial joiner date range if set.
   Owners see all expenses. Viewers cannot see expenses.';
