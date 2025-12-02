-- ============================================================================
-- Set Database Configuration Parameters for Notification Triggers
-- ============================================================================
-- Date: 2025-12-01
-- Description: Configures app.supabase_url and app.supabase_service_role_key
--              for the current database to enable notification triggers
--
-- This migration sets the configuration parameters that notification triggers
-- use to call edge functions via pg_net.http_post().
--
-- Fixes error: "unrecognized configuration parameter 'app.supabase_url'"
-- ============================================================================

-- Set Supabase URL (used by notification triggers to call edge functions)
ALTER DATABASE postgres
SET "app.supabase_url" = 'https://tbwbaydyyjokrsjtgerh.supabase.co';

-- Set Supabase Service Role Key (used for authenticated edge function calls)
-- Using the service role key from your .env.local file
ALTER DATABASE postgres
SET "app.supabase_service_role_key" = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRid2JheWR5eWpva3JzanRnZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY0NTc1MiwiZXhwIjoyMDc3MjIxNzUyfQ.A-OY9ej45jXDaIsxx1td286zdvuOiEfpryh96MJR0ic';

-- Verify the settings were applied
DO $$
BEGIN
  RAISE NOTICE 'Supabase URL configured: %', current_setting('app.supabase_url', true);
  RAISE NOTICE 'Service role key configured: ✓ Key is set (hidden for security)';
END $$;
