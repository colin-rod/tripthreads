-- Rollback migration for settlements table
-- This reverses the changes made in 20250129000003_create_settlements_table.sql

-- Drop RLS policies
DROP POLICY IF EXISTS "Trip owners can delete settlements" ON public.settlements;
DROP POLICY IF EXISTS "Settlement parties can update status" ON public.settlements;
DROP POLICY IF EXISTS "Trip participants can create settlements" ON public.settlements;
DROP POLICY IF EXISTS "Users can view settlements for their trips" ON public.settlements;

-- Drop trigger
DROP TRIGGER IF EXISTS update_settlements_updated_at ON public.settlements;

-- Drop indexes
DROP INDEX IF EXISTS idx_settlements_trip_status;
DROP INDEX IF EXISTS idx_settlements_to_user;
DROP INDEX IF EXISTS idx_settlements_from_user;
DROP INDEX IF EXISTS idx_settlements_status;
DROP INDEX IF EXISTS idx_settlements_trip_id;

-- Drop table
DROP TABLE IF EXISTS public.settlements;
