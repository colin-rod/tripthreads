-- Migration: Add missing subscription tracking fields
-- Description: Adds subscription_currency and subscription_price_id fields
--              referenced by cleanup_expired_grace_periods() function
-- Phase: 3.5 - Subscription Orchestration
-- Issue: CRO-813
-- Fixes: Database schema gap from baseline consolidation

-- ==========================================
-- Add Missing Subscription Fields
-- ==========================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_currency text,
ADD COLUMN IF NOT EXISTS subscription_price_id text;

-- ==========================================
-- Add Documentation
-- ==========================================

COMMENT ON COLUMN profiles.subscription_currency IS
  'Currency of active subscription (EUR, USD, GBP). Cleared on cancellation.';

COMMENT ON COLUMN profiles.subscription_price_id IS
  'Stripe price ID of active subscription. Cleared on cancellation.';

-- ==========================================
-- Add Index for Performance
-- ==========================================

-- Index for querying active subscriptions by currency
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_currency
ON profiles(subscription_currency)
WHERE subscription_currency IS NOT NULL;

COMMENT ON INDEX idx_profiles_subscription_currency IS
  'Index for efficient queries on active subscriptions by currency.';

-- ==========================================
-- Migration Complete
-- ==========================================

-- Migration summary:
-- ✅ Added subscription_currency field to profiles
-- ✅ Added subscription_price_id field to profiles
-- ✅ Added documentation comments
-- ✅ Created performance index for subscription_currency
--
-- These fields are required by cleanup_expired_grace_periods() function
-- to properly clean up subscription metadata when grace periods expire.
