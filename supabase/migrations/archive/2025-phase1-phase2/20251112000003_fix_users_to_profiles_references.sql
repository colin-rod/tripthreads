-- ============================================================================
-- Migration: Fix users → profiles table references in functions
-- Created: 2025-11-12
-- Description: Updates all functions that still reference public.users after
--              the table was renamed to public.profiles
-- ============================================================================

-- ============================================================================
-- STEP 1: Update handle_new_user() function
-- ============================================================================
-- This function creates a profile record when a new user signs up via auth.users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Set session variable to indicate this is a system-initiated insert
  -- This allows the RLS policy to permit the insert during signup
  PERFORM set_config('app.trigger_context', 'handle_new_user', true);

  RAISE LOG 'handle_new_user: Creating profile for user_id=%, email=%', NEW.id, NEW.email;

  -- FIX: Changed from public.users to public.profiles
  INSERT INTO public.profiles (id, email, full_name, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'free'
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE LOG 'handle_new_user: Profile created successfully for user_id=%', NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: ERROR - %, DETAIL - %, user_id=%', SQLERRM, SQLSTATE, NEW.id;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user IS
  'Trigger function that creates a profile record when a new user signs up';

-- ============================================================================
-- STEP 2: Update get_invite_with_trip_details() function
-- ============================================================================
-- This function retrieves invite details with trip and inviter info for the acceptance page

CREATE OR REPLACE FUNCTION public.get_invite_with_trip_details(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'invite', json_build_object(
      'id', ti.id,
      'token', ti.token,
      'role', ti.role,
      'invite_type', ti.invite_type,
      'status', ti.status,
      'created_at', ti.created_at
    ),
    'trip', json_build_object(
      'id', t.id,
      'name', t.name,
      'start_date', t.start_date,
      'end_date', t.end_date,
      'cover_image_url', t.cover_image_url,
      'description', t.description
    ),
    'inviter', json_build_object(
      'id', u.id,
      'full_name', u.full_name,
      'avatar_url', u.avatar_url
    )
  ) INTO v_result
  FROM public.trip_invites ti
  JOIN public.trips t ON t.id = ti.trip_id
  -- FIX: Changed from public.users to public.profiles
  JOIN public.profiles u ON u.id = ti.invited_by
  WHERE ti.token = p_token
  AND ti.status = 'pending';

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_invite_with_trip_details IS
  'Retrieve invite with associated trip and inviter details for acceptance page';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Log the migration completion
DO $$
BEGIN
  RAISE LOG 'Migration 20251112000003: Successfully updated functions to reference profiles table';
END $$;
