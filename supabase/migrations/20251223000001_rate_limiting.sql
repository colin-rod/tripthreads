-- Rate Limiting System
-- This migration adds comprehensive rate limiting infrastructure to prevent abuse
-- across all critical endpoints (expenses, chat, photos, API calls)

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,  -- 'expense', 'chat_message', 'photo_upload', 'api_call', 'access_request'
  resource_key TEXT NOT NULL,   -- trip_id or endpoint name
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT rate_limits_unique_key UNIQUE(user_id, resource_type, resource_key, window_start)
);

-- Indexes for efficient rate limit lookups
CREATE INDEX idx_rate_limits_user_resource ON rate_limits(user_id, resource_type, window_start);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only read/write their own rate limits
CREATE POLICY "Users can view their own rate limits"
  ON rate_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits"
  ON rate_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits"
  ON rate_limits FOR UPDATE
  USING (auth.uid() = user_id);

-- Cleanup function for old rate limit records (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to check and increment rate limit
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_user_id UUID,
  p_resource_type TEXT,
  p_resource_key TEXT,
  p_window_start TIMESTAMPTZ,
  p_limit INTEGER
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Attempt to insert or update the rate limit record
  INSERT INTO rate_limits (user_id, resource_type, resource_key, window_start, request_count)
  VALUES (p_user_id, p_resource_type, p_resource_key, p_window_start, 1)
  ON CONFLICT (user_id, resource_type, resource_key, window_start)
  DO UPDATE SET
    request_count = rate_limits.request_count + 1,
    updated_at = NOW()
  RETURNING request_count INTO v_count;

  -- Return whether the request is allowed and the current count
  RETURN QUERY SELECT (v_count <= p_limit), v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Grant execute permissions on the RPC function
GRANT EXECUTE ON FUNCTION check_and_increment_rate_limit(UUID, TEXT, TEXT, TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits() TO authenticated;

-- Add comment explaining the rate limiting system
COMMENT ON TABLE rate_limits IS 'Tracks API and resource usage to prevent abuse. Limits: Expenses (50/hr per trip), Chat (30/min per user), Photos (10/hr per user), Access Requests (5/hr per trip)';
COMMENT ON FUNCTION check_and_increment_rate_limit IS 'Atomically checks if a request is within rate limits and increments the counter. Returns allowed status and current count.';
COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Removes rate limit records older than 24 hours. Should be run periodically via cron job.';
