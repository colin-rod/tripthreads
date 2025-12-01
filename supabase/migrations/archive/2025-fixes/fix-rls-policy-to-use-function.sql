-- ============================================================================
-- FIX: Update trip_participants policy to use the bypass function
-- ============================================================================
-- The policy was updated to include is_deleted check but is still using
-- self-referencing query instead of the SECURITY DEFINER bypass function.
-- This causes infinite recursion.
-- ============================================================================

-- First, ensure the bypass function includes is_deleted check
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

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can read participants of their trips" ON public.trip_participants;

-- Recreate the policy to USE THE BYPASS FUNCTION
CREATE POLICY "Users can read participants of their trips"
  ON public.trip_participants
  FOR SELECT
  USING (
    public.can_user_read_trip_participant(trip_id, auth.uid())
  );

-- ============================================================================
-- This fixes the infinite recursion by ensuring the policy uses the
-- SECURITY DEFINER function instead of directly querying trip_participants
-- ============================================================================
