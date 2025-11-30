-- Rollback Migration: Drop Access Requests Table
-- Description: Removes access_requests table and related objects
-- Date: 2025-01-31

-- Drop trigger
DROP TRIGGER IF EXISTS update_access_requests_updated_at ON access_requests;

-- Drop function
DROP FUNCTION IF EXISTS update_access_requests_updated_at();

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view own access requests" ON access_requests;
DROP POLICY IF EXISTS "Users can create access requests" ON access_requests;
DROP POLICY IF EXISTS "Owners can view trip access requests" ON access_requests;
DROP POLICY IF EXISTS "Owners can update access requests" ON access_requests;

-- Drop indexes (will be automatically dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS idx_access_requests_trip_id;
DROP INDEX IF EXISTS idx_access_requests_user_id;
DROP INDEX IF EXISTS idx_access_requests_status;
DROP INDEX IF EXISTS idx_access_requests_unique_pending;

-- Drop table
DROP TABLE IF EXISTS access_requests;
