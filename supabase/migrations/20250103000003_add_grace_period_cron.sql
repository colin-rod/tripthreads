-- Migration: Schedule grace period cleanup cron job
-- Description: Runs cleanup_expired_grace_periods() daily at 3 AM UTC
--              to downgrade users whose 14-day grace period has expired
-- Phase: 3.5 - Subscription Orchestration
-- Issue: CRO-813

-- ==========================================
-- Enable pg_cron Extension
-- ==========================================

-- pg_cron is a simple cron-based job scheduler for PostgreSQL
-- It allows scheduling SQL commands to run at specific intervals
CREATE EXTENSION IF NOT EXISTS pg_cron;

COMMENT ON EXTENSION pg_cron IS
  'PostgreSQL job scheduler for periodic tasks (grace period cleanup).';

-- ==========================================
-- Schedule Daily Cleanup Job
-- ==========================================

-- Schedule cleanup to run daily at 3 AM UTC
-- Cron syntax: minute hour day-of-month month day-of-week
-- '0 3 * * *' = 3:00 AM every day
SELECT cron.schedule(
  'cleanup-expired-grace-periods', -- Job name (unique identifier)
  '0 3 * * *',                      -- Daily at 3 AM UTC
  $$SELECT cleanup_expired_grace_periods();$$ -- SQL command to execute
);

-- Note: pg_cron jobs are stored in cron.job table
-- The job will run daily at 3 AM UTC to downgrade users whose 14-day grace period has expired

-- ==========================================
-- Manual Execution Instructions
-- ==========================================

-- To manually trigger the cleanup (for testing):
-- SELECT cleanup_expired_grace_periods();
--
-- To view scheduled jobs:
-- SELECT * FROM cron.job;
--
-- To view job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- To unschedule the job:
-- SELECT cron.unschedule('cleanup-expired-grace-periods');

-- ==========================================
-- Migration Complete
-- ==========================================

-- Migration summary:
-- ✅ Enabled pg_cron extension
-- ✅ Scheduled cleanup_expired_grace_periods() to run daily at 3 AM UTC
-- ✅ Added documentation for manual execution and monitoring
--
-- Note: If pg_cron is not available in your Supabase instance, you can:
-- 1. Use an Edge Function + external cron service (Vercel Cron, GitHub Actions)
-- 2. Use Supabase's built-in cron feature (if available)
-- 3. Manually run the cleanup function periodically via SQL console
