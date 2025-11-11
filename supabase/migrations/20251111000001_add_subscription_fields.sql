-- Migration: Add subscription tracking fields to users table
-- Phase: 3 (Stripe Integration)
-- Description: Adds currency and price_id columns for tracking user subscriptions
-- Created: 2025-11-11

-- Add subscription tracking columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_currency text,
  ADD COLUMN IF NOT EXISTS subscription_price_id text;

-- Add comments for documentation
COMMENT ON COLUMN users.subscription_currency IS 'ISO 4217 currency code (EUR, USD, GBP) for the user''s subscription';
COMMENT ON COLUMN users.subscription_price_id IS 'Stripe Price ID that the user purchased (for webhook reconciliation)';

-- Add index for filtering by subscription currency (useful for reporting)
CREATE INDEX IF NOT EXISTS idx_users_subscription_currency ON users(subscription_currency) WHERE subscription_currency IS NOT NULL;

-- Add index for looking up users by price_id (useful for webhook processing)
CREATE INDEX IF NOT EXISTS idx_users_subscription_price_id ON users(subscription_price_id) WHERE subscription_price_id IS NOT NULL;
