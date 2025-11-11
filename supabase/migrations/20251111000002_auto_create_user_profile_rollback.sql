-- Rollback: Auto-create user profile on signup
-- Description: Remove auto-create user profile trigger
-- Date: 2025-11-11

-- Drop trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop function
DROP FUNCTION IF EXISTS public.handle_new_user();
