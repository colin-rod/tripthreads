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
  INSERT INTO public.users (id, email, full_name, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'free'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
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
