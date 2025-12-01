-- ============================================================================
-- Migration: Fix trip_participants RLS infinite recursion with is_deleted check
-- Description: Updates can_user_read_trip_participant() to include is_deleted check
-- Author: Claude Code
-- Date: 2025-11-30
-- ============================================================================

-- The can_user_read_trip_participant() function was missing the is_deleted check
-- that was added to the RLS policy later. This caused the policy to not use the
-- SECURITY DEFINER bypass function, leading to infinite recursion.

-- Update the function to include is_deleted check, matching the current policy logic
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
-- Summary:
-- - Updated can_user_read_trip_participant() to include is_deleted = false check
-- - This ensures the SECURITY DEFINER function matches the RLS policy logic
-- - Fixes infinite recursion error when querying trips with trip_participants
-- ============================================================================
