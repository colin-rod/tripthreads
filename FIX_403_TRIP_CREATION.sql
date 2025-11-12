-- ============================================================================
-- FIX FOR 403 ERROR WHEN CREATING TRIPS
-- ============================================================================
-- This SQL fixes the issue where trip creation fails with a 403 error
-- because the trigger that creates the owner participant is blocked by RLS.
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard: https://app.supabase.com
-- 2. Select your project (tbwbaydyyjokrsjtgerh)
-- 3. Go to SQL Editor
-- 4. Copy and paste this entire SQL file
-- 5. Click "Run" to execute
--
-- This is the content from migration: 20251112000001_fix_trip_participant_trigger_rls.sql
-- ============================================================================

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
-- STEP 3: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.create_trip_owner_participant() IS
  'Automatically creates owner participant entry when trip is created. Sets session variable to bypass RLS.';

COMMENT ON POLICY "Trip owners can add participants" ON public.trip_participants IS
  'Allows trip owners to add participants, and system triggers to create owner participant';

-- ============================================================================
-- DONE! Trip creation should now work without 403 errors.
-- ============================================================================
