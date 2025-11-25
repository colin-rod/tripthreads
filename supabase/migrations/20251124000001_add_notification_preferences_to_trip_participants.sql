-- Migration: Add notification preferences to trip_participants
-- Description: Adds per-trip notification preferences to allow users to control notifications for each trip individually
-- Author: System
-- Date: 2025-11-24

-- Add notification_preferences column to trip_participants table
-- NULL = inherit from global profiles.notification_preferences
-- Structure: { "invites": bool|null, "itinerary": bool|null, "expenses": bool|null, "photos": bool|null, "chat": bool|null, "settlements": bool|null }
ALTER TABLE public.trip_participants
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT NULL;

-- Create GIN index for efficient querying of notification preferences
-- GIN (Generalized Inverted Index) is optimal for JSONB columns
CREATE INDEX IF NOT EXISTS idx_trip_participants_notification_preferences
  ON public.trip_participants USING GIN (notification_preferences)
  WHERE notification_preferences IS NOT NULL;

-- Add comment to document the column purpose and structure
COMMENT ON COLUMN public.trip_participants.notification_preferences IS
  'Per-trip notification preferences. NULL inherits from profiles.notification_preferences. Structure: {"invites": bool|null, "itinerary": bool|null, "expenses": bool|null, "photos": bool|null, "chat": bool|null, "settlements": bool|null}. Event types: invites=trip invitations, itinerary=itinerary changes, expenses=expense updates, photos=photo uploads, chat=chat messages, settlements=settlement status changes. null=inherit from global, true=enable for this trip, false=disable for this trip.';

-- Example queries demonstrating preference inheritance:
--
-- Get effective preferences for a user on a trip:
-- SELECT
--   tp.notification_preferences as trip_prefs,
--   p.notification_preferences as global_prefs
-- FROM trip_participants tp
-- JOIN profiles p ON p.id = tp.user_id
-- WHERE tp.trip_id = '<trip_id>' AND tp.user_id = '<user_id>';
--
-- Check if user should be notified for expense update:
-- SELECT
--   COALESCE(
--     (tp.notification_preferences->>'expenses')::boolean,
--     (p.notification_preferences->>'email_expense_updates')::boolean
--   ) as should_notify
-- FROM trip_participants tp
-- JOIN profiles p ON p.id = tp.user_id
-- WHERE tp.trip_id = '<trip_id>' AND tp.user_id = '<user_id>';
