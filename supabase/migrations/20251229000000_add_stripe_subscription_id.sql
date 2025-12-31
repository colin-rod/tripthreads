-- Migration: Add stripe_subscription_id to profiles table
-- This field is required for Stripe webhook handling (CRO-752)
-- It stores the Stripe subscription ID for Pro subscribers

-- Add the stripe_subscription_id column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Add index for performance (queries filtering by subscription ID)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id
ON profiles(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe subscription ID for Pro plan subscribers. NULL for Free users or one-time purchases.';
