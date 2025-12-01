-- ============================================================================
-- MANUAL SETUP: Database Configuration for Edge Function Triggers
-- ============================================================================
-- DO NOT RUN VIA CLI - Run this manually in Supabase Dashboard SQL Editor
--
-- Steps:
-- 1. Get your service_role key from:
--    Supabase Dashboard → Settings → API → service_role (secret)
-- 2. Replace YOUR_SERVICE_ROLE_KEY_HERE below with the actual key
-- 3. Run this SQL in: https://supabase.com/dashboard/project/tbwbaydyyjokrsjtgerh/sql
-- ============================================================================

-- Set Supabase URL (used by notification triggers)
ALTER DATABASE postgres
SET "app.supabase_url" = 'https://tbwbaydyyjokrsjtgerh.supabase.co';

-- Set Service Role Key (REPLACE WITH YOUR ACTUAL KEY!)
ALTER DATABASE postgres
SET "app.supabase_service_role_key" = 'YOUR_SERVICE_ROLE_KEY_HERE';

-- Verify settings
SELECT
  current_setting('app.supabase_url') as supabase_url,
  CASE
    WHEN current_setting('app.supabase_service_role_key') = 'YOUR_SERVICE_ROLE_KEY_HERE'
    THEN '⚠️ ERROR: Still using placeholder - update with real key!'
    ELSE '✓ Service role key is set'
  END as service_role_key_status;
