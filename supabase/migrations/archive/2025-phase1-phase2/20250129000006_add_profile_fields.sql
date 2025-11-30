-- ============================================================================
-- Migration: Add profile completion fields
-- Description: Modify users table to support profile completion flow
-- Author: Claude Code
-- Date: 2025-01-29
-- ============================================================================

-- Make full_name nullable to support OAuth users without names
ALTER TABLE public.users
  ALTER COLUMN full_name DROP NOT NULL;

-- Add notification preferences column
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
    "email_trip_invites": true,
    "email_expense_updates": true,
    "email_trip_updates": true,
    "push_trip_invites": true,
    "push_expense_updates": true,
    "push_trip_updates": true
  }'::jsonb;

-- Add profile_completed_at to track when profile was completed
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

-- Create index for notification preferences
CREATE INDEX IF NOT EXISTS idx_users_profile_completed
  ON public.users(profile_completed_at)
  WHERE profile_completed_at IS NULL;

-- ============================================================================
-- SUPABASE STORAGE BUCKET FOR AVATARS
-- ============================================================================

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS POLICIES FOR AVATAR STORAGE
-- ============================================================================

-- Allow users to upload their own avatars
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow everyone to read avatars (public bucket)
CREATE POLICY "Anyone can read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- ============================================================================
-- HELPER FUNCTION: Check if profile is complete
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_profile_complete(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_full_name TEXT;
BEGIN
  SELECT full_name INTO v_full_name
  FROM public.users
  WHERE id = p_user_id;

  -- Profile is complete if full_name is set
  RETURN v_full_name IS NOT NULL AND LENGTH(TRIM(v_full_name)) > 0;
END;
$$;

COMMENT ON FUNCTION public.is_profile_complete IS
  'Check if user profile has required fields (full_name) completed';
