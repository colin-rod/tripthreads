-- Migration: Fix RLS for create_trip_owner_participant trigger
-- Description: Allow trigger to bypass RLS when creating owner participant entry
-- Date: 2025-11-12
-- Issue: Trip creation fails with 403 because trigger can't insert into trip_participants

-- ============================================================================
-- PROBLEM ANALYSIS
-- ============================================================================
-- When a trip is created:
-- 1. User INSERTs into public.trips (passes "Users can create trips" policy)
-- 2. Trigger on_trip_created fires and calls create_trip_owner_participant()
-- 3. Trigger tries to INSERT into trip_participants
-- 4. RLS policy "Trip owners can add participants" checks is_trip_owner(trip_id, auth.uid())
-- 5. But auth.uid() is the authenticated user, NOT a system trigger
-- 6. This causes a 403 error because the check fails or isn't properly contextualized

-- ============================================================================
-- SOLUTION
-- ============================================================================
-- Update the trip_participants INSERT policy to allow:
-- 1. Regular trip owners (existing behavior)
-- 2. System triggers using a session variable flag (new behavior)

-- ============================================================================
-- STEP 1: UPDATE create_trip_owner_participant TO SET SESSION VARIABLE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_trip_owner_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Set session variable to indicate this is a system trigger
  PERFORM set_config('app.trigger_context', 'create_trip_owner_participant', true);

  RAISE LOG 'create_trip_owner_participant: Creating owner participant for trip_id=%, owner_id=%', NEW.id, NEW.owner_id;

  -- Insert owner as participant
  INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id)
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  RAISE LOG 'create_trip_owner_participant: Owner participant created successfully';

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'create_trip_owner_participant: ERROR - %, DETAIL - %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: UPDATE RLS POLICY TO ALLOW TRIGGER INSERTS
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Trip owners can add participants" ON public.trip_participants;

-- Recreate with trigger bypass
CREATE POLICY "Trip owners can add participants"
  ON public.trip_participants
  FOR INSERT
  WITH CHECK (
    -- Allow if user is trip owner
    public.is_trip_owner(trip_id, auth.uid())
    -- OR if this is the system trigger creating owner participant
    OR current_setting('app.trigger_context', true) = 'create_trip_owner_participant'
  );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.create_trip_owner_participant() IS
  'Automatically creates owner participant entry when trip is created. Sets session variable to bypass RLS.';

COMMENT ON POLICY "Trip owners can add participants" ON public.trip_participants IS
  'Allows trip owners to add participants, and system triggers to create owner participant';
