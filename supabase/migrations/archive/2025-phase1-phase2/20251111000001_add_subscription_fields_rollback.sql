-- Rollback Migration: Remove subscription tracking fields from profiles table
-- Phase: 3 (Stripe Integration)
-- Description: Removes currency and price_id columns added for subscription tracking
-- Created: 2025-11-11

-- Drop indexes first
DROP INDEX IF EXISTS idx_profiles_subscription_price_id;
DROP INDEX IF EXISTS idx_profiles_subscription_currency;

-- Remove subscription tracking columns from profiles table
ALTER TABLE profiles
  DROP COLUMN IF EXISTS subscription_price_id,
  DROP COLUMN IF EXISTS subscription_currency;
