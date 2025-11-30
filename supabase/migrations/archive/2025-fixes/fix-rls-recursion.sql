-- ============================================================================
-- FIX FOR: infinite recursion detected in policy for relation "trip_participants"
-- ============================================================================
-- Run this directly in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ============================================================================

-- Update the can_user_read_trip_participant function to include is_deleted check
CREATE OR REPLACE FUNCTION public.can_user_read_trip_participant(
  p_trip_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_participants tp
    JOIN public.profiles p ON tp.user_id = p.id
    WHERE tp.trip_id = p_trip_id
      AND tp.user_id = p_user_id
      AND p.is_deleted = false
  );
$$;

COMMENT ON FUNCTION public.can_user_read_trip_participant IS 'Check if user can read trip participants, respecting account deletion (bypasses RLS to avoid infinite recursion)';

-- ============================================================================
-- This fix updates the SECURITY DEFINER function that bypasses RLS to include
-- the is_deleted check, preventing infinite recursion while maintaining
-- proper access control for deleted accounts.
-- ============================================================================
