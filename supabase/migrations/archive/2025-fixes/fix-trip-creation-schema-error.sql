-- ============================================================================
-- FIX: Add search_path to create_trip_owner_participant function
-- ============================================================================
-- Error 3F000 (INVALID SCHEMA NAME) occurs when SECURITY DEFINER functions
-- don't have an explicit search_path set. This is a security best practice.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_trip_owner_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Add explicit search_path
AS $$
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
$$;

-- ============================================================================
-- Also fix other SECURITY DEFINER functions to include search_path
-- ============================================================================

-- Update is_trip_owner
CREATE OR REPLACE FUNCTION public.is_trip_owner(
  p_trip_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = p_trip_id AND owner_id = p_user_id
  );
END;
$$;

-- Update is_trip_participant
CREATE OR REPLACE FUNCTION public.is_trip_participant(
  p_trip_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_participants
    WHERE trip_id = p_trip_id
      AND user_id = p_user_id
  );
$$;

-- Update is_trip_participant_with_role
CREATE OR REPLACE FUNCTION public.is_trip_participant_with_role(
  p_trip_id UUID,
  p_user_id UUID,
  p_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_participants
    WHERE trip_id = p_trip_id
      AND user_id = p_user_id
      AND role = ANY(p_roles)
  );
$$;

-- Update can_user_see_expense
CREATE OR REPLACE FUNCTION public.can_user_see_expense(
  p_expense_date TIMESTAMPTZ,
  p_trip_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
-- Summary: Added SET search_path = public to all SECURITY DEFINER functions
-- This is required for PostgreSQL security and prevents 3F000 errors
-- ============================================================================
