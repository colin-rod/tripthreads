-- ============================================================================
-- Migration: Fix can_user_see_item recursion
-- Description: Recreate can_user_see_item to bypass RLS on trip_participants
-- Author: Claude Code
-- Date: 2025-01-29
-- ============================================================================

-- Drop and recreate the can_user_see_item function with proper SECURITY DEFINER
-- This was already SECURITY DEFINER but we need to ensure it's working correctly

-- The function is already SECURITY DEFINER in the previous migration
-- But let's verify it's truly bypassing RLS by checking if the user exists first

DROP FUNCTION IF EXISTS public.can_user_see_item(TIMESTAMPTZ, UUID, UUID);

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
BEGIN
  -- Check if user is the trip owner (bypass RLS)
  SELECT EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = p_trip_id AND owner_id = p_user_id
  ) INTO v_is_owner;

  IF v_is_owner THEN
    RETURN true;
  END IF;

  -- Get user's role and join date from trip_participants (bypass RLS with SECURITY DEFINER)
  SELECT role, joined_at
  INTO v_user_role, v_joined_at
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

  -- Participants see items from their join date forward
  IF v_user_role = 'participant' THEN
    RETURN p_item_date >= v_joined_at;
  END IF;

  -- Default: no access
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_user_see_item IS 'Checks if user can see item based on role and join date (bypasses RLS with SECURITY DEFINER to avoid infinite recursion)';
