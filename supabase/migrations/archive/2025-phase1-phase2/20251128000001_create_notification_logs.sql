-- Migration: Create notification_logs table
-- Description: Stores notification delivery attempts for testing, auditing, and debugging
-- Author: Claude (CRO-767)
-- Date: 2025-11-28

-- Create notification_logs table
-- Purpose: Track all notification attempts (sent, skipped, failed) with event metadata
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('invites', 'itinerary', 'expenses', 'photos', 'chat', 'settlements')),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'push')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'skipped', 'failed')),
  skip_reason TEXT, -- 'preferences_disabled', 'not_participant', 'rls_blocked', etc.
  error_message TEXT, -- For 'failed' status - capture error details
  metadata JSONB, -- Event-specific data (expense amount, itinerary item title, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notification_logs_trip_id
  ON public.notification_logs(trip_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id
  ON public.notification_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_event_type
  ON public.notification_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status
  ON public.notification_logs(status);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at
  ON public.notification_logs(created_at DESC);

-- Composite index for common query pattern (trip + event type + recent)
CREATE INDEX IF NOT EXISTS idx_notification_logs_trip_event_created
  ON public.notification_logs(trip_id, event_type, created_at DESC);

-- Add table comment
COMMENT ON TABLE public.notification_logs IS
  'Stores all notification delivery attempts for auditing and testing. Status: sent (successfully delivered), skipped (user preferences disabled), failed (delivery error). Used by edge functions to log notification activity.';

-- Add column comments
COMMENT ON COLUMN public.notification_logs.event_type IS
  'Type of event that triggered notification: invites, itinerary, expenses, photos, chat, settlements';

COMMENT ON COLUMN public.notification_logs.notification_type IS
  'Delivery channel: email (Resend), push (Expo/Web Push - Phase 4)';

COMMENT ON COLUMN public.notification_logs.status IS
  'Delivery status: sent (successfully sent), skipped (preferences disabled or RLS blocked), failed (delivery error)';

COMMENT ON COLUMN public.notification_logs.skip_reason IS
  'Reason for skipped status: preferences_disabled, not_participant, rls_blocked, viewer_role, etc.';

COMMENT ON COLUMN public.notification_logs.metadata IS
  'Event-specific data as JSONB: { "expense_amount": 50.00, "expense_description": "Dinner", "itinerary_title": "Flight to Paris", etc. }';

-- Row-Level Security (RLS) Policies
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notification logs
CREATE POLICY notification_logs_select_own
  ON public.notification_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can view notification logs for trips they're part of
CREATE POLICY notification_logs_select_trip_participant
  ON public.notification_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants
      WHERE trip_participants.trip_id = notification_logs.trip_id
        AND trip_participants.user_id = auth.uid()
    )
  );

-- Policy: Service role can insert notification logs (edge functions use service role)
CREATE POLICY notification_logs_insert_service
  ON public.notification_logs
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS, but explicit policy for clarity

-- Policy: No updates allowed (immutable audit log)
-- Notification logs are append-only for audit trail integrity

-- Policy: No deletes allowed (except CASCADE from trips/profiles)
-- Logs are automatically deleted when trip or user is deleted

-- Grant permissions
GRANT SELECT ON public.notification_logs TO authenticated;
GRANT INSERT ON public.notification_logs TO service_role;
