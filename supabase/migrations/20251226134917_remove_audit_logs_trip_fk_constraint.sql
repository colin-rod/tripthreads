-- Fix audit log foreign key constraint issue when deleting trips
--
-- Problem: When a trip is deleted, the cascade deletion of trip_participants
-- triggers the audit log, but the trip_id foreign key constraint fails because
-- the trip has already been deleted.
--
-- Solution: Remove the foreign key constraint on audit_logs.trip_id to allow
-- audit logs to preserve historical data even after trips are deleted.
-- The trip_id will still be stored for reference, but won't enforce referential integrity.

-- Drop the foreign key constraint on trip_id
ALTER TABLE audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_trip_id_fkey;

-- Add a comment explaining why there's no FK constraint
COMMENT ON COLUMN audit_logs.trip_id IS
  'Trip ID for context (nullable). No FK constraint to preserve audit history even after trip deletion.';
