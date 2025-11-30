-- Migration: Add detailed logging to create_trip_owner_participant trigger
-- Description: Improve logging output to help diagnose 403 errors during trip creation
-- Date: 2025-11-15

-- ============================================================================
-- UPDATE FUNCTION LOGGING
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_trip_owner_participant()
RETURNS TRIGGER AS $$
DECLARE
  previous_context text;
  insert_count integer := 0;
BEGIN
  previous_context := current_setting('app.trigger_context', true);
  RAISE LOG 'create_trip_owner_participant: starting. previous_context=%', COALESCE(previous_context, '<null>');

  PERFORM set_config('app.trigger_context', 'create_trip_owner_participant', true);
  RAISE LOG 'create_trip_owner_participant: set trigger context for trip_id=%, owner_id=%', NEW.id, NEW.owner_id;

  INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id)
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  GET DIAGNOSTICS insert_count = ROW_COUNT;
  RAISE LOG 'create_trip_owner_participant: insert finished with row_count=% for trip_id=%, owner_id=%', insert_count, NEW.id, NEW.owner_id;

  IF previous_context IS NULL THEN
    PERFORM set_config('app.trigger_context', '', true);
  ELSE
    PERFORM set_config('app.trigger_context', previous_context, true);
  END IF;
  RAISE LOG 'create_trip_owner_participant: restored trigger context to %', COALESCE(previous_context, '<null>');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'create_trip_owner_participant: ERROR - %, DETAIL - %, CONTEXT - trip_id=%, owner_id=%, previous_context=%',
      SQLERRM,
      SQLSTATE,
      NEW.id,
      NEW.owner_id,
      COALESCE(previous_context, '<null>');
    IF previous_context IS NULL THEN
      PERFORM set_config('app.trigger_context', '', true);
    ELSE
      PERFORM set_config('app.trigger_context', previous_context, true);
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
