-- ============================================================================
-- Enable pg_net Extension for Edge Function Triggers
-- ============================================================================
-- Date: 2025-12-01
-- Description: Enables pg_net extension required for email notification triggers
--
-- The baseline schema (20251201000000_baseline_schema.sql) includes trigger
-- functions that use net.http_post() to invoke edge functions for email
-- notifications, but the pg_net extension was not enabled in the migration.
--
-- This migration fixes the production deployment error:
-- "schema 'net' does not exist" when creating trips
-- ============================================================================

-- Enable pg_net extension
-- This provides the net.http_post() function used by email notification triggers
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
