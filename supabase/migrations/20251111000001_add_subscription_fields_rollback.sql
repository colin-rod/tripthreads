-- Rollback Migration: Remove subscription tracking fields from users table
-- Phase: 3 (Stripe Integration)
-- Description: Removes currency and price_id columns added for subscription tracking
-- Created: 2025-11-11

-- Drop indexes first
DROP INDEX IF EXISTS idx_users_subscription_price_id;
DROP INDEX IF EXISTS idx_users_subscription_currency;

-- Remove subscription tracking columns from users table
ALTER TABLE users
  DROP COLUMN IF EXISTS subscription_price_id,
  DROP COLUMN IF EXISTS subscription_currency;
