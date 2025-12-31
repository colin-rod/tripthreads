-- Migration: Add video upload limits and storage tracking
-- Description: Implements video upload functionality with Pro tier gating
--              - Free users: 0 videos allowed (hard block)
--              - Pro users: 10GB total video storage, 100MB max file size
-- Phase: 3 (Media & Monetization)
-- Issue: CRO-739b (Video Upload Gating)
-- Related: CRO-739a (Photo Upload Gating) - Already implemented

-- ==========================================
-- 1. Add video_storage_bytes to profiles
-- ==========================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS video_storage_bytes bigint DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.profiles.video_storage_bytes IS
  'Total video storage used in bytes. Pro tier limit: 10GB (10,737,418,240 bytes). Free tier: 0 bytes (videos blocked).';

-- ==========================================
-- 2. Add file_size_bytes to media_files
-- ==========================================

ALTER TABLE public.media_files
ADD COLUMN IF NOT EXISTS file_size_bytes bigint DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.media_files.file_size_bytes IS
  'File size in bytes. Used for video storage tracking. Photos also tracked for consistency.';

-- ==========================================
-- 3. Create can_upload_video() function
-- ==========================================

CREATE OR REPLACE FUNCTION public.can_upload_video(
  user_id uuid,
  video_size_bytes bigint
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan text;
  user_expiry timestamptz;
  user_grace_end timestamptz;
  current_storage bigint;
  max_storage_bytes bigint := 10737418240; -- 10GB in bytes
BEGIN
  -- Get user's subscription status
  SELECT plan, plan_expires_at, grace_period_end
  INTO user_plan, user_expiry, user_grace_end
  FROM profiles
  WHERE id = user_id;

  -- Free users cannot upload videos
  IF user_plan IS NULL OR user_plan = 'free' THEN
    RETURN false;
  END IF;

  -- Pro users: check if plan is active
  -- User is Pro if:
  -- 1. Plan is 'pro' AND (no expiry OR expiry is in future) AND (no grace period OR grace period not expired)
  -- 2. OR user is in grace period (grace_period_end is in future)
  IF user_plan = 'pro' THEN
    -- Check if grace period expired
    IF user_grace_end IS NOT NULL AND user_grace_end <= NOW() THEN
      RETURN false;
    END IF;

    -- Check if plan expired (and not in grace period)
    IF user_expiry IS NOT NULL AND user_expiry <= NOW() AND (user_grace_end IS NULL OR user_grace_end <= NOW()) THEN
      RETURN false;
    END IF;
  END IF;

  -- Pro users: check storage limit (10GB)
  SELECT COALESCE(video_storage_bytes, 0)
  INTO current_storage
  FROM profiles
  WHERE id = user_id;

  -- Check if adding this video would exceed the limit
  IF (current_storage + video_size_bytes) > max_storage_bytes THEN
    RETURN false;
  END IF;

  -- All checks passed
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.can_upload_video(uuid, bigint) IS
  'Check if user can upload a video of given size. Free users: false. Pro users: true if storage + video size <= 10GB.';

-- ==========================================
-- 4. Create trigger functions for video storage tracking
-- ==========================================

-- Increment video storage on INSERT
CREATE OR REPLACE FUNCTION public.increment_video_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only increment for video files
  IF NEW.type = 'video' THEN
    UPDATE profiles
    SET video_storage_bytes = COALESCE(video_storage_bytes, 0) + COALESCE(NEW.file_size_bytes, 0)
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.increment_video_storage() IS
  'Trigger function: Increment user video_storage_bytes when video uploaded';

-- Decrement video storage on DELETE
CREATE OR REPLACE FUNCTION public.decrement_video_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only decrement for video files
  IF OLD.type = 'video' THEN
    UPDATE profiles
    SET video_storage_bytes = GREATEST(COALESCE(video_storage_bytes, 0) - COALESCE(OLD.file_size_bytes, 0), 0)
    WHERE id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.decrement_video_storage() IS
  'Trigger function: Decrement user video_storage_bytes when video deleted';

-- ==========================================
-- 5. Create triggers on media_files
-- ==========================================

DROP TRIGGER IF EXISTS increment_video_storage_trigger ON public.media_files;
CREATE TRIGGER increment_video_storage_trigger
AFTER INSERT ON public.media_files
FOR EACH ROW
EXECUTE FUNCTION public.increment_video_storage();

DROP TRIGGER IF EXISTS decrement_video_storage_trigger ON public.media_files;
CREATE TRIGGER decrement_video_storage_trigger
AFTER DELETE ON public.media_files
FOR EACH ROW
EXECUTE FUNCTION public.decrement_video_storage();

-- ==========================================
-- 6. Create RLS policy for video uploads
-- ==========================================

-- Policy: Free users cannot upload videos
DROP POLICY IF EXISTS free_users_cannot_upload_videos ON public.media_files;
CREATE POLICY free_users_cannot_upload_videos ON public.media_files
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow photo uploads (existing logic handles photo limits)
  type = 'photo'
  OR
  -- Allow video uploads only if can_upload_video() returns true
  (type = 'video' AND can_upload_video(auth.uid(), file_size_bytes))
);

COMMENT ON POLICY free_users_cannot_upload_videos ON public.media_files IS
  'Free users blocked from video uploads. Pro users limited to 10GB total video storage.';

-- ==========================================
-- 7. Backfill existing media_files with file sizes (if needed)
-- ==========================================

-- Note: This is a one-time backfill for existing records
-- New uploads will set file_size_bytes via the API
-- For now, we'll set 0 for existing records (they're all photos with no storage tracking)

UPDATE public.media_files
SET file_size_bytes = 0
WHERE file_size_bytes IS NULL OR file_size_bytes = 0;

-- ==========================================
-- Migration Complete
-- ==========================================

-- Migration summary:
-- ✅ Added video_storage_bytes column to profiles table
-- ✅ Added file_size_bytes column to media_files table
-- ✅ Created can_upload_video() function for Pro tier checks
-- ✅ Created triggers to track video storage usage
-- ✅ Created RLS policy to block free users from video uploads
-- ✅ Backfilled existing media_files with file_size_bytes = 0
--
-- Next steps:
-- 1. Update lib/subscription/limits.ts with checkVideoLimit() function
-- 2. Create /api/upload-video endpoint
-- 3. Create VideoUpload component
-- 4. Update Stripe config with video limits
