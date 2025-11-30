-- ============================================================================
-- Migration: Fix missing INSERT policy on profiles table
-- Created: 2025-11-13
-- Description: Adds the missing INSERT policy that allows the handle_new_user()
--              trigger to create profile records during signup
-- ============================================================================

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create INSERT policy that allows:
-- 1. Users to insert their own profile (auth.uid() = id)
-- 2. The handle_new_user() trigger to insert profiles (trigger_context check)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id
    OR current_setting('app.trigger_context', true) = 'handle_new_user'
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Log the migration completion
DO $$
BEGIN
  RAISE LOG 'Migration 20251113000001: Successfully added INSERT policy to profiles table';
END $$;
