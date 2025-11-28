-- Rollback Migration: Drop notification_logs table
-- Description: Removes notification_logs table and all associated indexes and policies
-- Author: Claude (CRO-767)
-- Date: 2025-11-28

-- Drop RLS policies
DROP POLICY IF EXISTS notification_logs_select_own ON public.notification_logs;
DROP POLICY IF EXISTS notification_logs_select_trip_participant ON public.notification_logs;
DROP POLICY IF EXISTS notification_logs_insert_service ON public.notification_logs;

-- Drop indexes (will be automatically dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS public.idx_notification_logs_trip_id;
DROP INDEX IF EXISTS public.idx_notification_logs_user_id;
DROP INDEX IF EXISTS public.idx_notification_logs_event_type;
DROP INDEX IF EXISTS public.idx_notification_logs_status;
DROP INDEX IF EXISTS public.idx_notification_logs_created_at;
DROP INDEX IF EXISTS public.idx_notification_logs_trip_event_created;

-- Drop table
DROP TABLE IF EXISTS public.notification_logs CASCADE;
