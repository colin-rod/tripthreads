-- ============================================================================
-- Migration: Rename set_public_users_id_from_auth_context to use profiles naming
-- Created: 2025-11-13
-- Description: Renames the function to match the profiles table name for consistency
-- ============================================================================

-- Rename the function
ALTER FUNCTION public.set_public_users_id_from_auth_context()
  RENAME TO set_public_profiles_id_from_auth_context;

-- Update the comment
COMMENT ON FUNCTION public.set_public_profiles_id_from_auth_context IS
  'Trigger function that sets the id from auth.uid() for profiles inserts when id is null';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Log the migration completion
DO $$
BEGIN
  RAISE LOG 'Migration 20251113000001: Successfully renamed set_public_users_id_from_auth_context to set_public_profiles_id_from_auth_context';
END $$;
