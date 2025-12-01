-- Migration: Add subscription tracking fields to profiles table
-- Phase: 3 (Stripe Integration)
-- Description: Adds currency and price_id columns for tracking user subscriptions
-- Created: 2025-11-11

-- Add subscription tracking columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_currency text,
  ADD COLUMN IF NOT EXISTS subscription_price_id text;

-- Add comments for documentation
COMMENT ON COLUMN profiles.subscription_currency IS 'ISO 4217 currency code (EUR, USD, GBP) for the user''s subscription';
COMMENT ON COLUMN profiles.subscription_price_id IS 'Stripe Price ID that the user purchased (for webhook reconciliation)';

-- Add index for filtering by subscription currency (useful for reporting)
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_currency ON profiles(subscription_currency) WHERE subscription_currency IS NOT NULL;

-- Add index for looking up profiles by price_id (useful for webhook processing)
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_price_id ON profiles(subscription_price_id) WHERE subscription_price_id IS NOT NULL;
