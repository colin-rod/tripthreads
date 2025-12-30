-- Migration: Add INSERT policy to media_files table
-- Description: Fixes security gap - media_files had no INSERT policy
--              Adds basic authentication check + trip participant verification
--              Adds free tier photo limit enforcement (25 photos)
-- Phase: 3.5 - Subscription Orchestration
-- Issue: CRO-813

-- ==========================================
-- PART 1: Basic INSERT Policy (Security Fix)
-- ==========================================

-- Security fix: media_files table was missing INSERT policy entirely
-- This allows authenticated trip participants to upload media
DROP POLICY IF EXISTS "trip_participants_can_upload_media" ON media_files;
CREATE POLICY "trip_participants_can_upload_media"
ON media_files
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND is_trip_participant(trip_id, auth.uid())
);

COMMENT ON POLICY "trip_participants_can_upload_media" ON media_files IS
  'Allows authenticated trip participants to upload media to their trips. Security fix for missing INSERT policy.';

-- ==========================================
-- PART 2: Free Tier Photo Limit Enforcement
-- ==========================================

-- Free tier limit policy: 25 photos total across all trips
DROP POLICY IF EXISTS "free_users_limited_photos" ON media_files;
CREATE POLICY "free_users_limited_photos"
ON media_files
FOR INSERT
TO authenticated
WITH CHECK (
  can_upload_photo(auth.uid())
);

COMMENT ON POLICY "free_users_limited_photos" ON media_files IS
  'Enforces free tier limit: 25 photos total. Pro users unlimited.';

-- ==========================================
-- PART 3: Photo Count Tracking Triggers
-- ==========================================

-- Function: Increment photo_count when photo uploaded
CREATE OR REPLACE FUNCTION increment_photo_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Increment the denormalized photo_count in profiles
  UPDATE profiles
  SET photo_count = photo_count + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION increment_photo_count() IS
  'Increments photo_count in profiles when photo uploaded. Used for free tier limit enforcement (25 photos).';

-- Trigger: Run increment function on INSERT
CREATE TRIGGER trigger_increment_photo_count
AFTER INSERT ON media_files
FOR EACH ROW
EXECUTE FUNCTION increment_photo_count();

COMMENT ON TRIGGER trigger_increment_photo_count ON media_files IS
  'Maintains denormalized photo_count in profiles table for efficient limit checking.';

-- Function: Decrement photo_count when photo deleted
CREATE OR REPLACE FUNCTION decrement_photo_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Decrement the denormalized photo_count in profiles
  -- Use GREATEST to prevent negative values
  UPDATE profiles
  SET photo_count = GREATEST(0, photo_count - 1)
  WHERE id = OLD.user_id;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION decrement_photo_count() IS
  'Decrements photo_count in profiles when photo deleted. Prevents negative values using GREATEST(0, count - 1).';

-- Trigger: Run decrement function on DELETE
CREATE TRIGGER trigger_decrement_photo_count
AFTER DELETE ON media_files
FOR EACH ROW
EXECUTE FUNCTION decrement_photo_count();

COMMENT ON TRIGGER trigger_decrement_photo_count ON media_files IS
  'Maintains denormalized photo_count when photos are deleted.';

-- ==========================================
-- PART 4: Grant Permissions
-- ==========================================

-- Grant execute permissions on trigger functions
GRANT EXECUTE ON FUNCTION increment_photo_count() TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_photo_count() TO authenticated;

-- ==========================================
-- Migration Complete
-- ==========================================

-- Migration summary:
-- ✅ Added trip_participants_can_upload_media INSERT policy (security fix)
-- ✅ Added free_users_limited_photos INSERT policy (25 photo limit)
-- ✅ Created increment_photo_count() trigger function
-- ✅ Created trigger_increment_photo_count trigger
-- ✅ Created decrement_photo_count() trigger function
-- ✅ Created trigger_decrement_photo_count trigger
-- ✅ Granted appropriate permissions
--
-- Security impact:
-- - Fixes critical security gap (missing INSERT policy on media_files)
-- - Enforces authentication requirement for photo uploads
-- - Enforces trip participant verification
-- - Enforces free tier photo limit (25 photos)
--
-- Performance impact:
-- - Denormalized photo_count updated via triggers (O(1) lookup)
-- - No need to COUNT(*) from media_files for limit checking
