-- Audit Logging System
-- This migration adds comprehensive audit logging for sensitive operations
-- to support security monitoring, compliance, and incident response

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  action TEXT NOT NULL,  -- 'create', 'update', 'delete', 'role_change', 'status_change'
  resource_type TEXT NOT NULL,  -- 'trip', 'expense', 'participant', 'settlement', 'media'
  resource_id UUID,
  details JSONB,  -- Action-specific details (old_value, new_value, etc.)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient audit log queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_trip_id ON audit_logs(trip_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action_resource ON audit_logs(action, resource_type);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view audit logs for their trips
CREATE POLICY "Users can view audit logs for their trips"
  ON audit_logs FOR SELECT
  USING (
    trip_id IS NULL  -- System-level logs (visible to all)
    OR EXISTS (
      SELECT 1 FROM trip_participants
      WHERE trip_id = audit_logs.trip_id
      AND user_id = auth.uid()
    )
  );

-- Only authenticated users can insert audit logs (via application)
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger function to automatically log participant role changes
CREATE OR REPLACE FUNCTION log_participant_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if role actually changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO audit_logs (
      user_id,
      trip_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      auth.uid(),  -- User making the change
      NEW.trip_id,
      'role_change',
      'participant',
      NEW.id,
      jsonb_build_object(
        'target_user_id', NEW.user_id,
        'old_role', OLD.role,
        'new_role', NEW.role
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Attach trigger to trip_participants table
CREATE TRIGGER audit_participant_role_changes
  AFTER UPDATE OF role ON trip_participants
  FOR EACH ROW
  EXECUTE FUNCTION log_participant_role_change();

-- Trigger function to log participant removals
CREATE OR REPLACE FUNCTION log_participant_removal()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    trip_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),  -- User performing the deletion
    OLD.trip_id,
    'delete',
    'participant',
    OLD.id,
    jsonb_build_object(
      'removed_user_id', OLD.user_id,
      'role', OLD.role,
      'joined_at', OLD.joined_at
    )
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Attach trigger to trip_participants table
CREATE TRIGGER audit_participant_removals
  BEFORE DELETE ON trip_participants
  FOR EACH ROW
  EXECUTE FUNCTION log_participant_removal();

-- Trigger function to log trip deletions
CREATE OR REPLACE FUNCTION log_trip_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    trip_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    OLD.id,
    'delete',
    'trip',
    OLD.id,
    jsonb_build_object(
      'trip_name', OLD.name,
      'start_date', OLD.start_date,
      'end_date', OLD.end_date,
      'owner_id', OLD.owner_id
    )
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Attach trigger to trips table
CREATE TRIGGER audit_trip_deletions
  BEFORE DELETE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION log_trip_deletion();

-- Trigger function to log expense deletions
CREATE OR REPLACE FUNCTION log_expense_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    trip_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    OLD.trip_id,
    'delete',
    'expense',
    OLD.id,
    jsonb_build_object(
      'description', OLD.description,
      'amount', OLD.amount,
      'currency', OLD.currency,
      'payer_id', OLD.payer_id,
      'date', OLD.date
    )
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Attach trigger to expenses table
CREATE TRIGGER audit_expense_deletions
  BEFORE DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION log_expense_deletion();

-- Trigger function to log settlement status changes
CREATE OR REPLACE FUNCTION log_settlement_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (
      user_id,
      trip_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      auth.uid(),
      NEW.trip_id,
      'status_change',
      'settlement',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'from_user_id', NEW.from_user_id,
        'to_user_id', NEW.to_user_id,
        'amount', NEW.amount,
        'currency', NEW.currency
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Attach trigger to settlements table
CREATE TRIGGER audit_settlement_status_changes
  AFTER UPDATE OF status ON settlements
  FOR EACH ROW
  EXECUTE FUNCTION log_settlement_status_change();

-- Function to manually log audit events (for application use)
CREATE OR REPLACE FUNCTION create_audit_log(
  p_trip_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_details JSONB,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    trip_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_trip_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_audit_log(UUID, TEXT, TEXT, UUID, JSONB, INET, TEXT) TO authenticated;

-- Cleanup function for old audit logs (keep 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs() TO authenticated;

-- Add comments explaining the audit logging system
COMMENT ON TABLE audit_logs IS 'Audit trail for sensitive operations. Tracks role changes, deletions, and status changes for compliance and security monitoring.';
COMMENT ON FUNCTION create_audit_log IS 'Manually create an audit log entry. Used by application code for operations not covered by triggers.';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Removes audit logs older than 1 year. Should be run periodically via cron job.';

-- Example queries for common audit scenarios:
--
-- 1. View all role changes for a trip:
-- SELECT * FROM audit_logs
-- WHERE trip_id = 'xxx' AND action = 'role_change'
-- ORDER BY created_at DESC;
--
-- 2. View all deletions by a user:
-- SELECT * FROM audit_logs
-- WHERE user_id = 'xxx' AND action = 'delete'
-- ORDER BY created_at DESC;
--
-- 3. View settlement status changes:
-- SELECT * FROM audit_logs
-- WHERE resource_type = 'settlement' AND action = 'status_change'
-- ORDER BY created_at DESC;
