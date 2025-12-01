-- ============================================================================
-- COMPLETE FIX: All RLS and SECURITY DEFINER issues
-- ============================================================================
-- This file fixes:
-- 1. Infinite recursion in trip_participants SELECT policy
-- 2. 3F000 errors from missing search_path in SECURITY DEFINER functions
-- ============================================================================

-- ============================================================================
-- PART 1: Fix infinite recursion - Update bypass function and policy
-- ============================================================================

-- Update can_user_read_trip_participant to include is_deleted check
CREATE OR REPLACE FUNCTION public.can_user_read_trip_participant(
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
    SELECT 1
    FROM public.trip_participants tp
    JOIN public.profiles p ON tp.user_id = p.id
    WHERE tp.trip_id = p_trip_id
      AND tp.user_id = p_user_id
      AND p.is_deleted = false
  );
$$;

-- Drop and recreate the policy to use the bypass function
DROP POLICY IF EXISTS "Users can read participants of their trips" ON public.trip_participants;

CREATE POLICY "Users can read participants of their trips"
  ON public.trip_participants
  FOR SELECT
  USING (
    public.can_user_read_trip_participant(trip_id, auth.uid())
  );

-- ============================================================================
-- PART 2: Add search_path to ALL SECURITY DEFINER functions
-- ============================================================================

-- Trip owner participant trigger
CREATE OR REPLACE FUNCTION public.create_trip_owner_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- RLS helper functions
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

CREATE OR REPLACE FUNCTION public.can_user_see_item(
  p_item_date TIMESTAMPTZ,
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
      AND role IN ('owner', 'participant', 'viewer')
      AND p_item_date >= joined_at
  );
$$;

-- Update anonymize_user_account
CREATE OR REPLACE FUNCTION public.anonymize_user_account(
  p_user_id UUID,
  p_trip_deletion_strategy TEXT DEFAULT 'transfer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_record RECORD;
  v_new_owner_id UUID;
  v_deleted_email TEXT;
  v_trips_deleted INT := 0;
  v_trips_transferred INT := 0;
BEGIN
  -- Check if user exists and is not already deleted
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND is_deleted = FALSE
  ) THEN
    RAISE EXCEPTION 'User does not exist or is already deleted';
  END IF;

  -- Generate unique deleted email
  v_deleted_email := 'deleted_' || p_user_id || '@tripthreads.deleted';

  -- Handle owned trips
  FOR v_trip_record IN
    SELECT t.id, t.name
    FROM public.trips t
    WHERE t.owner_id = p_user_id
  LOOP
    IF p_trip_deletion_strategy = 'delete' THEN
      DELETE FROM public.trips WHERE id = v_trip_record.id;
      v_trips_deleted := v_trips_deleted + 1;
    ELSE
      SELECT tp.user_id INTO v_new_owner_id
      FROM public.trip_participants tp
      INNER JOIN public.profiles p ON tp.user_id = p.id
      WHERE tp.trip_id = v_trip_record.id
        AND tp.user_id != p_user_id
        AND p.is_deleted = FALSE
      ORDER BY tp.joined_at ASC
      LIMIT 1;

      IF v_new_owner_id IS NOT NULL THEN
        UPDATE public.trips
        SET owner_id = v_new_owner_id
        WHERE id = v_trip_record.id;

        UPDATE public.trip_participants
        SET role = 'owner'
        WHERE trip_id = v_trip_record.id
          AND user_id = v_new_owner_id;

        v_trips_transferred := v_trips_transferred + 1;
      ELSE
        DELETE FROM public.trips WHERE id = v_trip_record.id;
        v_trips_deleted := v_trips_deleted + 1;
      END IF;
    END IF;
  END LOOP;

  -- Anonymize profile data
  UPDATE public.profiles
  SET
    full_name = 'Deleted User',
    email = v_deleted_email,
    avatar_url = NULL,
    stripe_customer_id = NULL,
    notification_preferences = NULL,
    deleted_at = NOW(),
    is_deleted = TRUE,
    updated_at = NOW()
  WHERE id = p_user_id;

  DELETE FROM public.trip_invites WHERE invited_by = p_user_id;
  DELETE FROM public.access_requests WHERE user_id = p_user_id;
  DELETE FROM public.message_reactions WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Account anonymized successfully',
    'tripsDeleted', v_trips_deleted,
    'tripsTransferred', v_trips_transferred,
    'userId', p_user_id,
    'deletedAt', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to anonymize account: %', SQLERRM;
END;
$$;

-- ============================================================================
-- Summary:
-- - Fixed infinite recursion by using bypass function in policy
-- - Added SET search_path = public to all SECURITY DEFINER functions
-- - Both issues should now be resolved
-- ============================================================================
