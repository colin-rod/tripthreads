-- ============================================================================
-- Migration: Fix remaining RLS infinite recursion issues
-- Description: Fix trip_participants and trips table RLS policies that cause infinite recursion
-- Author: Claude Code
-- Date: 2025-01-29
-- ============================================================================

-- The trip_participants table has a self-referencing RLS policy that causes infinite recursion.
-- The trips table also references trip_participants, creating a circular dependency.
-- We need to create SECURITY DEFINER functions to bypass RLS for these checks.

-- ============================================================================
-- STEP 1: Create SECURITY DEFINER bypass functions
-- ============================================================================

-- Function to check if user is trip owner (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_trip_owner(
  p_trip_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = p_trip_id AND owner_id = p_user_id
  );
END;
$$;

COMMENT ON FUNCTION public.is_trip_owner IS 'Check if user is the owner of a trip (bypasses RLS)';

-- Function to check if user can read trip participants (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_user_read_trip_participant(
  p_trip_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- User can read participants if they are a participant in the trip
  RETURN EXISTS (
    SELECT 1 FROM public.trip_participants
    WHERE trip_id = p_trip_id AND user_id = p_user_id
  );
END;
$$;

COMMENT ON FUNCTION public.can_user_read_trip_participant IS 'Check if user can read trip participants (bypasses RLS to avoid infinite recursion)';

-- ============================================================================
-- STEP 2: Fix trip_participants table policies
-- ============================================================================

-- Drop all trip_participants policies
DROP POLICY IF EXISTS "Users can read participants of their trips" ON public.trip_participants;
DROP POLICY IF EXISTS "Trip owners can add participants" ON public.trip_participants;
DROP POLICY IF EXISTS "Trip owners can update participant roles" ON public.trip_participants;
DROP POLICY IF EXISTS "Trip owners can remove participants" ON public.trip_participants;

-- Recreate policies using bypass functions

-- SELECT: Users can read participants of trips they're in
CREATE POLICY "Users can read participants of their trips"
  ON public.trip_participants
  FOR SELECT
  USING (
    public.can_user_read_trip_participant(trip_id, auth.uid())
  );

-- INSERT: Trip owners can add participants
CREATE POLICY "Trip owners can add participants"
  ON public.trip_participants
  FOR INSERT
  WITH CHECK (
    public.is_trip_owner(trip_id, auth.uid())
  );

-- UPDATE: Trip owners can update participant roles
CREATE POLICY "Trip owners can update participant roles"
  ON public.trip_participants
  FOR UPDATE
  USING (
    public.is_trip_owner(trip_id, auth.uid())
  );

-- DELETE: Trip owners can remove participants (but not themselves)
CREATE POLICY "Trip owners can remove participants"
  ON public.trip_participants
  FOR DELETE
  USING (
    public.is_trip_owner(trip_id, auth.uid())
    AND user_id <> auth.uid()
  );

-- ============================================================================
-- STEP 3: Fix trips table policies
-- ============================================================================

-- Drop and recreate trips SELECT policy
DROP POLICY IF EXISTS "Users can read trips they participate in" ON public.trips;

CREATE POLICY "Users can read trips they participate in"
  ON public.trips
  FOR SELECT
  USING (
    public.is_trip_participant(id, auth.uid())
  );

-- ============================================================================
-- STEP 4: Fix itinerary_items table policies
-- ============================================================================

-- Drop and recreate problematic itinerary_items policies
DROP POLICY IF EXISTS "Participants can create itinerary items" ON public.itinerary_items;
DROP POLICY IF EXISTS "Users can delete own itinerary items" ON public.itinerary_items;

-- INSERT: Participants can create itinerary items
CREATE POLICY "Participants can create itinerary items"
  ON public.itinerary_items
  FOR INSERT
  WITH CHECK (
    public.is_trip_participant_with_role(
      trip_id,
      auth.uid(),
      ARRAY['owner', 'participant']
    )
    AND auth.uid() = created_by
  );

-- DELETE: Users can delete own items or trip owners can delete any
CREATE POLICY "Users can delete own itinerary items"
  ON public.itinerary_items
  FOR DELETE
  USING (
    auth.uid() = created_by
    OR public.is_trip_owner(trip_id, auth.uid())
  );

-- ============================================================================
-- STEP 5: Fix expenses table DELETE policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

CREATE POLICY "Users can delete own expenses"
  ON public.expenses
  FOR DELETE
  USING (
    auth.uid() = created_by
    OR public.is_trip_owner(trip_id, auth.uid())
  );

-- ============================================================================
-- STEP 6: Fix media_files table DELETE policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own media" ON public.media_files;

CREATE POLICY "Users can delete own media"
  ON public.media_files
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR public.is_trip_owner(trip_id, auth.uid())
  );

-- ============================================================================
-- Summary of changes:
-- - Created is_trip_owner() to check trip ownership without RLS
-- - Created can_user_read_trip_participant() to check participant access without RLS
-- - Updated all trip_participants policies to use bypass functions
-- - Updated trips SELECT policy to use existing is_trip_participant()
-- - Updated itinerary_items INSERT/DELETE policies
-- - Updated expenses DELETE policy
-- - Updated media_files DELETE policy
-- ============================================================================
