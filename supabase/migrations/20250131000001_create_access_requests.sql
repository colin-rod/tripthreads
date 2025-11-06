-- Migration: Create Access Requests Table
-- Description: Table for tracking viewer requests to upgrade to participant role
-- Date: 2025-01-31

-- Create access_requests table
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_access_requests_trip_id ON access_requests(trip_id);
CREATE INDEX idx_access_requests_user_id ON access_requests(user_id);
CREATE INDEX idx_access_requests_status ON access_requests(status);

-- Add unique constraint to prevent duplicate pending requests
CREATE UNIQUE INDEX idx_access_requests_unique_pending
  ON access_requests(trip_id, user_id)
  WHERE status = 'pending';

-- Add comments for documentation
COMMENT ON TABLE access_requests IS 'Tracks viewer requests to upgrade to participant role';
COMMENT ON COLUMN access_requests.status IS 'Request status: pending, approved, rejected';
COMMENT ON COLUMN access_requests.requested_at IS 'When the request was made';
COMMENT ON COLUMN access_requests.responded_at IS 'When organizer responded to the request';
COMMENT ON COLUMN access_requests.responded_by IS 'Which organizer approved/rejected the request';

-- Enable RLS
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Users can view their own access requests
CREATE POLICY "Users can view own access requests"
  ON access_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Users can create access requests for trips they're viewers of
CREATE POLICY "Users can create access requests"
  ON access_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM trip_participants
      WHERE trip_id = access_requests.trip_id
        AND user_id = auth.uid()
        AND role = 'viewer'
    )
  );

-- 3. Trip owners can view all access requests for their trips
CREATE POLICY "Owners can view trip access requests"
  ON access_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants
      WHERE trip_id = access_requests.trip_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- 4. Trip owners can update access requests (approve/reject)
CREATE POLICY "Owners can update access requests"
  ON access_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants
      WHERE trip_id = access_requests.trip_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_participants
      WHERE trip_id = access_requests.trip_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_access_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_access_requests_updated_at
  BEFORE UPDATE ON access_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_access_requests_updated_at();
