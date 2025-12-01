-- ============================================================================
-- Set Database Configuration Parameters for Edge Functions
-- ============================================================================
-- Date: 2025-12-01
-- Description: Sets app.supabase_url and app.supabase_service_role_key
--              configuration parameters required by notification triggers
--
-- The notification trigger functions use current_setting('app.supabase_url')
-- and current_setting('app.supabase_service_role_key') to call edge functions
-- via pg_net.http_post(). These parameters must be set at the database level.
--
-- This migration fixes the production error:
-- "unrecognized configuration parameter 'app.supabase_url'" when creating trips
--
-- IMPORTANT: This migration uses placeholder values that MUST be updated
-- manually in production via the Supabase Dashboard SQL Editor.
-- ============================================================================

-- Set Supabase URL (used by notification triggers to call edge functions)
-- REPLACE WITH YOUR PRODUCTION URL: https://tbwbaydyyjokrsjtgerh.supabase.co
ALTER DATABASE postgres
SET "app.supabase_url" = 'https://tbwbaydyyjokrsjtgerh.supabase.co';

-- Set Supabase Service Role Key (used for authenticated edge function calls)
-- IMPORTANT: Get this from Supabase Dashboard ’ Settings ’ API ’ service_role key
-- This is a PLACEHOLDER - you MUST replace it with your actual service role key
ALTER DATABASE postgres
SET "app.supabase_service_role_key" = 'YOUR_SERVICE_ROLE_KEY_HERE';

-- Verify the settings were applied
DO $$
BEGIN
  RAISE NOTICE 'Supabase URL configured: %', current_setting('app.supabase_url', true);
  RAISE NOTICE 'Service role key configured: %',
    CASE
      WHEN current_setting('app.supabase_service_role_key', true) = 'YOUR_SERVICE_ROLE_KEY_HERE'
      THEN '   WARNING: Still using placeholder! Update with real key!'
      ELSE ' Key appears to be set (hidden for security)'
    END;
END $$;
