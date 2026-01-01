-- Add push token columns to profiles table for web and mobile push notifications
-- Migration: 20260102000000_add_push_tokens.sql
-- Phase 4: Push Notifications

-- Add push token columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS push_token_web TEXT,
ADD COLUMN IF NOT EXISTS push_token_mobile TEXT,
ADD COLUMN IF NOT EXISTS push_token_web_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS push_token_mobile_updated_at TIMESTAMP WITH TIME ZONE;

-- Create partial indexes for token lookups (only index non-null values)
CREATE INDEX IF NOT EXISTS idx_profiles_push_token_web
ON profiles(push_token_web)
WHERE push_token_web IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_push_token_mobile
ON profiles(push_token_mobile)
WHERE push_token_mobile IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.push_token_web IS 'Web Push subscription object (JSON string) for VAPID push notifications';
COMMENT ON COLUMN profiles.push_token_mobile IS 'Expo push token for mobile push notifications';
COMMENT ON COLUMN profiles.push_token_web_updated_at IS 'Timestamp of last web push token update';
COMMENT ON COLUMN profiles.push_token_mobile_updated_at IS 'Timestamp of last mobile push token update';
