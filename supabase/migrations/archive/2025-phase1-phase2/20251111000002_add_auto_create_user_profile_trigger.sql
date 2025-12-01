-- Migration: Add trigger to automatically create public.users profile on auth signup
-- Description: Fixes issue where OAuth users don't get a public.users record created
-- Date: 2025-11-11
-- Issue: Users signing up via Google OAuth don't get a profile in public.users,
--        causing 406 errors when trying to create trips

-- ============================================================================
-- STEP 1: CREATE FUNCTION TO HANDLE NEW USER CREATION
-- ============================================================================

-- Function to automatically create a public.users profile when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Set session variable to indicate this is a system-initiated insert
  -- This allows the RLS policy to permit the insert during signup
  PERFORM set_config('app.trigger_context', 'handle_new_user', true);

  RAISE LOG 'handle_new_user: Creating profile for user_id=%, email=%', NEW.id, NEW.email;

  INSERT INTO public.users (id, email, full_name, plan)
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

-- ============================================================================
-- STEP 2: CREATE TRIGGER ON auth.users
-- ============================================================================

-- Trigger to auto-create public.users profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STEP 3: BACKFILL EXISTING USERS (if any are missing)
-- ============================================================================

-- Insert profiles for any auth.users that don't have a public.users record
INSERT INTO public.users (id, email, full_name, plan)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'free'
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a public.users profile when a new auth.users record is created. Handles both email/password and OAuth signups.';

-- ============================================================================
-- STEP 4: ENFORCE auth.uid() FOR DIRECT INSERTS INTO public.users
-- ============================================================================

-- Ensure manually inserted profiles pick up the caller's auth UID when id is omitted
CREATE OR REPLACE FUNCTION public.set_public_users_id_from_auth_context()
RETURNS TRIGGER AS $$
DECLARE
  current_uid uuid := auth.uid();
BEGIN
  IF NEW.id IS NULL THEN
    IF current_uid IS NULL THEN
      RAISE EXCEPTION 'auth.uid() is null; cannot infer id for public.users insert';
    END IF;
    NEW.id := current_uid;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS before_insert_set_public_user_id ON public.users;
CREATE TRIGGER before_insert_set_public_user_id
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_public_users_id_from_auth_context();

-- Allow inserts from authenticated users OR from the handle_new_user trigger
ALTER POLICY "Users can insert own profile"
  ON public.users
  WITH CHECK (
    auth.uid() = id
    OR current_setting('app.trigger_context', true) = 'handle_new_user'
  );
