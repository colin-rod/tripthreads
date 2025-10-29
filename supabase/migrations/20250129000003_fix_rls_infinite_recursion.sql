-- ============================================================================
-- Migration: Fix RLS Infinite Recursion
-- Description: Fixes infinite recursion in RLS policies by using SECURITY DEFINER functions
-- Author: Claude Code
-- Date: 2025-01-29
-- ============================================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can read expenses based on join date" ON public.expenses;
DROP POLICY IF EXISTS "Participants can create expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

DROP POLICY IF EXISTS "Users can read expense participants" ON public.expense_participants;
DROP POLICY IF EXISTS "Expense creator can add participants" ON public.expense_participants;
DROP POLICY IF EXISTS "Expense creator can update participants" ON public.expense_participants;
DROP POLICY IF EXISTS "Expense creator can delete participants" ON public.expense_participants;

DROP POLICY IF EXISTS "Trip participants can read all media" ON public.media_files;
DROP POLICY IF EXISTS "Participants can upload media" ON public.media_files;
DROP POLICY IF EXISTS "Users can delete own media" ON public.media_files;

-- ============================================================================
-- Create helper functions that bypass RLS on trip_participants
-- ============================================================================

-- Function to check if user is trip participant (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_trip_participant(p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_participants
    WHERE trip_id = p_trip_id
      AND user_id = p_user_id
  );
$$;

-- Function to check if user is trip participant with specific role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_trip_participant_with_role(
  p_trip_id UUID,
  p_user_id UUID,
  p_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_participants
    WHERE trip_id = p_trip_id
      AND user_id = p_user_id
      AND role = ANY(p_roles)
  );
$$;

-- Function to check if user can see expense based on date (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_user_see_expense(
  p_expense_date TIMESTAMPTZ,
  p_trip_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_participants
    WHERE trip_id = p_trip_id
      AND user_id = p_user_id
      AND role IN ('owner', 'participant')
      AND p_expense_date >= joined_at
  );
$$;

-- ============================================================================
-- Recreate EXPENSES RLS policies with helper functions
-- ============================================================================

-- Participants and owners see expenses based on join date
CREATE POLICY "Users can read expenses based on join date"
  ON public.expenses
  FOR SELECT
  USING (
    public.can_user_see_expense(date, trip_id, auth.uid())
  );

-- Participants and owners can create expenses
CREATE POLICY "Participants can create expenses"
  ON public.expenses
  FOR INSERT
  WITH CHECK (
    public.is_trip_participant_with_role(
      trip_id,
      auth.uid(),
      ARRAY['owner', 'participant']::TEXT[]
    )
    AND auth.uid() = created_by
  );

-- Users can delete their own expenses OR owners can delete any
CREATE POLICY "Users can delete own expenses"
  ON public.expenses
  FOR DELETE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = expenses.trip_id
        AND trips.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- Recreate EXPENSE_PARTICIPANTS RLS policies with helper functions
-- ============================================================================

-- Users can read expense participants if they can see the expense
CREATE POLICY "Users can read expense participants"
  ON public.expense_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE expenses.id = expense_participants.expense_id
        AND public.can_user_see_expense(expenses.date, expenses.trip_id, auth.uid())
    )
  );

-- Expense creator can add participants
CREATE POLICY "Expense creator can add participants"
  ON public.expense_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE expenses.id = expense_participants.expense_id
        AND expenses.created_by = auth.uid()
    )
  );

-- Expense creator can update participants
CREATE POLICY "Expense creator can update participants"
  ON public.expense_participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE expenses.id = expense_participants.expense_id
        AND expenses.created_by = auth.uid()
    )
  );

-- Expense creator can delete participants
CREATE POLICY "Expense creator can delete participants"
  ON public.expense_participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE expenses.id = expense_participants.expense_id
        AND expenses.created_by = auth.uid()
    )
  );

-- ============================================================================
-- Recreate MEDIA_FILES RLS policies with helper functions
-- ============================================================================

-- All trip participants see all media (no date scoping)
CREATE POLICY "Trip participants can read all media"
  ON public.media_files
  FOR SELECT
  USING (
    public.is_trip_participant(trip_id, auth.uid())
  );

-- Participants and owners can upload media
CREATE POLICY "Participants can upload media"
  ON public.media_files
  FOR INSERT
  WITH CHECK (
    public.is_trip_participant_with_role(
      trip_id,
      auth.uid(),
      ARRAY['owner', 'participant']::TEXT[]
    )
    AND auth.uid() = user_id
  );

-- Users can delete their own media OR owners can delete any
CREATE POLICY "Users can delete own media"
  ON public.media_files
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = media_files.trip_id
        AND trips.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- Add comments
-- ============================================================================

COMMENT ON FUNCTION public.is_trip_participant IS 'Checks if user is a trip participant (bypasses RLS to avoid infinite recursion)';
COMMENT ON FUNCTION public.is_trip_participant_with_role IS 'Checks if user is a trip participant with specific role (bypasses RLS)';
COMMENT ON FUNCTION public.can_user_see_expense IS 'Checks if user can see expense based on date and role (bypasses RLS)';
