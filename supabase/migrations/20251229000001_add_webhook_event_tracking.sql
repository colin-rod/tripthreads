-- Migration: Add webhook event tracking for idempotency
-- This table stores processed Stripe webhook event IDs to prevent duplicate processing
-- Critical for payment processing integrity (CRO-813)

-- Create the processed_webhook_events table
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add index for efficient cleanup queries (remove old events)
CREATE INDEX IF NOT EXISTS idx_processed_events_created
ON processed_webhook_events(created_at);

-- Add index for event type queries (analytics/debugging)
CREATE INDEX IF NOT EXISTS idx_processed_events_type
ON processed_webhook_events(event_type);

-- Add comment for documentation
COMMENT ON TABLE processed_webhook_events IS 'Tracks processed Stripe webhook events to ensure idempotent processing and prevent duplicate charges.';
COMMENT ON COLUMN processed_webhook_events.event_id IS 'Unique Stripe event ID (e.g., evt_1234567890)';
COMMENT ON COLUMN processed_webhook_events.event_type IS 'Stripe event type (e.g., checkout.session.completed, charge.refunded)';
COMMENT ON COLUMN processed_webhook_events.processed_at IS 'Timestamp when webhook was successfully processed';
COMMENT ON COLUMN processed_webhook_events.created_at IS 'Timestamp when event record was created';

-- Enable Row Level Security (RLS)
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- Create policy: Only allow service role to access (webhook endpoints use service client)
CREATE POLICY "Service role can manage webhook events"
ON processed_webhook_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
