-- Migration: Add Subscription Limits and Grace Period Support
-- Description: Implements database-level enforcement for free tier limits (1 trip, 5 participants, 25 photos)
--              and adds grace period support for failed payments.
-- Phase: 3.5 - Subscription Orchestration
-- Issue: CRO-813

-- ==========================================
-- PART 1: Add New Fields to Profiles
-- ==========================================

-- Add grace_period_end for failed payment handling (14-day grace period)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS grace_period_end timestamp with time zone;

-- Add denormalized photo_count for efficient limit checking (will be incremented via trigger later)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS photo_count integer NOT NULL DEFAULT 0;

-- Add comment documentation
COMMENT ON COLUMN profiles.grace_period_end IS
  'Timestamp when grace period ends after first payment failure. User retains Pro features until this date.';

COMMENT ON COLUMN profiles.photo_count IS
  'Denormalized count of total photos uploaded by user across all trips. Used for free tier limit enforcement (25 photos).';

-- ==========================================
-- PART 2: RLS Helper Functions
-- ==========================================

-- Function: Check if user is on Pro plan (active subscription or in grace period)
CREATE OR REPLACE FUNCTION is_pro_user(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_plan text;
  plan_expiry timestamp with time zone;
  grace_end timestamp with time zone;
BEGIN
  SELECT plan, plan_expires_at, grace_period_end
  INTO user_plan, plan_expiry, grace_end
  FROM profiles
  WHERE id = user_id;

  -- Pro user if:
  -- 1. Plan is 'pro' AND (no expiry OR expiry is in future)
  -- 2. OR user is in grace period (grace_period_end is in future)
  RETURN (
    user_plan = 'pro' AND (plan_expiry IS NULL OR plan_expiry > NOW())
  ) OR (
    grace_end IS NOT NULL AND grace_end > NOW()
  );
END;
$$;

COMMENT ON FUNCTION is_pro_user(uuid) IS
  'Returns true if user has active Pro subscription or is in grace period after payment failure.';

-- Function: Check if user can create a trip (Free: 1 trip, Pro: unlimited)
CREATE OR REPLACE FUNCTION can_create_trip(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  trip_count integer;
BEGIN
  -- Pro users have unlimited trips
  IF is_pro_user(user_id) THEN
    RETURN TRUE;
  END IF;

  -- Free users limited to 1 active trip
  SELECT COUNT(*)
  INTO trip_count
  FROM trips
  WHERE owner_id = user_id;

  RETURN trip_count < 1;
END;
$$;

COMMENT ON FUNCTION can_create_trip(uuid) IS
  'Returns true if user can create a new trip. Free tier: 1 trip max, Pro: unlimited.';

-- Function: Check if trip owner can add participant (Free: 5 participants, Pro: unlimited)
CREATE OR REPLACE FUNCTION can_add_participant(trip_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  owner_id uuid;
  participant_count integer;
BEGIN
  -- Get trip owner
  SELECT owner_id
  INTO owner_id
  FROM trips
  WHERE id = trip_id_param;

  IF owner_id IS NULL THEN
    RETURN FALSE; -- Trip doesn't exist
  END IF;

  -- Pro trip owners have unlimited participants
  IF is_pro_user(owner_id) THEN
    RETURN TRUE;
  END IF;

  -- Free users limited to 5 participants per trip
  SELECT COUNT(*)
  INTO participant_count
  FROM trip_participants
  WHERE trip_id = trip_id_param;

  RETURN participant_count < 5;
END;
$$;

COMMENT ON FUNCTION can_add_participant(uuid) IS
  'Returns true if trip owner can add another participant. Free tier: 5 max, Pro: unlimited.';

-- Function: Check if user can upload photo (Free: 25 photos total, Pro: unlimited)
CREATE OR REPLACE FUNCTION can_upload_photo(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  total_photos integer;
BEGIN
  -- Pro users have unlimited photos
  IF is_pro_user(user_id) THEN
    RETURN TRUE;
  END IF;

  -- Free users limited to 25 photos total across all trips
  SELECT photo_count
  INTO total_photos
  FROM profiles
  WHERE id = user_id;

  RETURN COALESCE(total_photos, 0) < 25;
END;
$$;

COMMENT ON FUNCTION can_upload_photo(uuid) IS
  'Returns true if user can upload another photo. Free tier: 25 total, Pro: unlimited.';

-- ==========================================
-- PART 3: RLS Policies for Limit Enforcement
-- ==========================================

-- Policy: Free users can only create 1 trip
DROP POLICY IF EXISTS "free_users_limited_to_1_trip" ON trips;
CREATE POLICY "free_users_limited_to_1_trip"
ON trips
FOR INSERT
TO authenticated
WITH CHECK (
  can_create_trip(auth.uid())
);

COMMENT ON POLICY "free_users_limited_to_1_trip" ON trips IS
  'Enforces free tier limit: 1 trip maximum. Pro users unlimited.';

-- Policy: Free users can only add 5 participants per trip
DROP POLICY IF EXISTS "free_users_limited_participants" ON trip_participants;
CREATE POLICY "free_users_limited_participants"
ON trip_participants
FOR INSERT
TO authenticated
WITH CHECK (
  can_add_participant(trip_id)
);

COMMENT ON POLICY "free_users_limited_participants" ON trip_participants IS
  'Enforces free tier limit: 5 participants per trip. Pro users unlimited.';

-- Note: Photo upload policy will be added when media_files table is created in Phase 3
-- For now, we add the helper function only

-- ==========================================
-- PART 4: Indexes for Performance
-- ==========================================

-- Index on grace_period_end for cleanup queries
CREATE INDEX IF NOT EXISTS idx_profiles_grace_period_end
ON profiles(grace_period_end)
WHERE grace_period_end IS NOT NULL;

COMMENT ON INDEX idx_profiles_grace_period_end IS
  'Index for efficient grace period cleanup queries (find expired grace periods).';

-- Index on photo_count for free tier limit queries
CREATE INDEX IF NOT EXISTS idx_profiles_photo_count
ON profiles(photo_count)
WHERE plan = 'free';

COMMENT ON INDEX idx_profiles_photo_count IS
  'Index for efficient photo limit checking for free tier users.';

-- ==========================================
-- PART 5: Grace Period Cleanup Function
-- ==========================================

-- Function: Cleanup expired grace periods and downgrade users to free tier
CREATE OR REPLACE FUNCTION cleanup_expired_grace_periods()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  downgraded_count integer;
BEGIN
  -- Downgrade users whose grace period has expired
  WITH downgraded AS (
    UPDATE profiles
    SET
      plan = 'free',
      grace_period_end = NULL,
      stripe_subscription_id = NULL,
      stripe_customer_id = NULL,
      subscription_currency = NULL,
      subscription_price_id = NULL,
      plan_expires_at = NULL
    WHERE
      grace_period_end IS NOT NULL
      AND grace_period_end < NOW()
      AND plan = 'pro'
    RETURNING id
  )
  SELECT COUNT(*) INTO downgraded_count FROM downgraded;

  -- Log the cleanup action
  RAISE NOTICE 'Grace period cleanup: downgraded % users to free tier', downgraded_count;

  RETURN downgraded_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_grace_periods() IS
  'Downgrades users to free tier after grace period expires. Should be called daily via cron.';

-- ==========================================
-- PART 6: Grant Permissions
-- ==========================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION is_pro_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_create_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_add_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_upload_photo(uuid) TO authenticated;

-- Only service role can run cleanup function
GRANT EXECUTE ON FUNCTION cleanup_expired_grace_periods() TO service_role;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

-- Migration summary:
-- ✅ Added grace_period_end and photo_count fields to profiles
-- ✅ Created RLS helper functions: is_pro_user, can_create_trip, can_add_participant, can_upload_photo
-- ✅ Added RLS policies for trip and participant limits
-- ✅ Created indexes for performance
-- ✅ Created grace period cleanup function
-- ✅ Granted appropriate permissions

-- Next steps:
-- 1. Add photo upload trigger when media_files table is created (Phase 3)
-- 2. Set up cron job to call cleanup_expired_grace_periods() daily
-- 3. Update server actions to use limit check functions
