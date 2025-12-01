-- Rollback Migration: Remove auto-create user profile trigger
-- Description: Removes the trigger and function that auto-creates public.users profiles
-- Date: 2025-11-11

-- ============================================================================
-- STEP 1: DROP TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================================================
-- STEP 2: DROP FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================================
-- STEP 3: REMOVE DIRECT INSERT TRIGGER/FUNCTION SAFEGUARD
-- ============================================================================

DROP TRIGGER IF EXISTS before_insert_set_public_user_id ON public.users;
DROP FUNCTION IF EXISTS public.set_public_users_id_from_auth_context();

-- ============================================================================
-- STEP 4: REVERT USERS INSERT POLICY
-- ============================================================================

ALTER POLICY "Users can insert own profile"
  ON public.users
  WITH CHECK (auth.uid() = id);
