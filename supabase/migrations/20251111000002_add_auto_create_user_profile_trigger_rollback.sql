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
