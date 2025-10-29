-- Rollback Migration: Drop users, trips, and trip_participants tables
-- Description: Rollback for initial database schema
-- Date: 2025-01-29

-- Drop triggers
DROP TRIGGER IF EXISTS update_trips_updated_at ON public.trips;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS on_trip_created ON public.trips;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.create_trip_owner_participant();

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS public.trip_participants CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
