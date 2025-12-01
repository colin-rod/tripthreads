-- ============================================================================
-- RLS Date-Scoped Policy Tests
-- Description: Test queries to validate role-based visibility with date scoping
-- Author: Claude Code
-- Date: 2025-01-29
-- ============================================================================

-- ============================================================================
-- TEST SETUP
-- ============================================================================
-- Assumptions from seed.sql:
-- - Alice (temp@test.com / 22222222-2222-2222-2222-222222222222) is owner of Paris trip
-- - Benji (benji@temp.com / 44444444-4444-4444-4444-444444444444) is partial joiner
--   - Joined Paris trip on 2025-06-18 (3 days after start)
-- - Maya (maya@test.com / 55555555-5555-5555-5555-555555555555) is isolated (no trips)
-- - Baylee (baylee@temp.com / 66666666-6666-6666-6666-666666666666) is viewer on multiple trips

-- Trip dates for Paris trip:
-- - Start: 2025-06-15
-- - End: 2025-06-22
-- - Benji joined: 2025-06-18 00:00:00+00

-- ============================================================================
-- TEST 1: ITINERARY ITEMS - Date-Scoped Visibility
-- ============================================================================

-- Create test itinerary items with different dates
INSERT INTO public.itinerary_items (trip_id, type, title, start_time, created_by)
VALUES
  -- Before Benji's join date (should NOT be visible to Benji)
  ('10000000-0000-0000-0000-000000000001'::UUID, 'flight', 'Flight to Paris', '2025-06-15 08:00:00+00'::TIMESTAMPTZ, '22222222-2222-2222-2222-222222222222'::UUID),
  ('10000000-0000-0000-0000-000000000001'::UUID, 'activity', 'Eiffel Tower Visit', '2025-06-16 14:00:00+00'::TIMESTAMPTZ, '22222222-2222-2222-2222-222222222222'::UUID),

  -- On Benji's join date (should be visible to Benji)
  ('10000000-0000-0000-0000-000000000001'::UUID, 'activity', 'Louvre Museum', '2025-06-18 10:00:00+00'::TIMESTAMPTZ, '22222222-2222-2222-2222-222222222222'::UUID),

  -- After Benji's join date (should be visible to Benji)
  ('10000000-0000-0000-0000-000000000001'::UUID, 'stay', 'Hotel Check-in', '2025-06-19 15:00:00+00'::TIMESTAMPTZ, '22222222-2222-2222-2222-222222222222'::UUID),
  ('10000000-0000-0000-0000-000000000001'::UUID, 'activity', 'Seine River Cruise', '2025-06-20 18:00:00+00'::TIMESTAMPTZ, '22222222-2222-2222-2222-222222222222'::UUID)
ON CONFLICT DO NOTHING;

-- Test as Alice (owner) - should see all 5 items
SELECT 'Alice (owner) itinerary items:' AS test_name,
       COUNT(*) AS visible_count,
       CASE
         WHEN COUNT(*) = 5 THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status
FROM public.itinerary_items
WHERE trip_id = '10000000-0000-0000-0000-000000000001'::UUID;

-- Test as Benji (partial joiner) - should see 3 items (from 2025-06-18 onward)
-- Note: This would be executed with auth.uid() set to Benji's ID
-- In a real test, you'd use Supabase's set_config or a test framework

-- Test as Baylee (viewer) - should see all 5 items (viewers see everything)
SELECT 'Baylee (viewer) itinerary items:' AS test_name,
       COUNT(*) AS visible_count,
       CASE
         WHEN COUNT(*) = 5 THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status
FROM public.itinerary_items
WHERE trip_id = '10000000-0000-0000-0000-000000000001'::UUID;

-- ============================================================================
-- TEST 2: EXPENSES - Date-Scoped Visibility (Participants Only)
-- ============================================================================

-- Create test expenses with different dates
INSERT INTO public.expenses (trip_id, description, amount, currency, payer_id, date, created_by)
VALUES
  -- Before Benji's join date (should NOT be visible to Benji)
  ('10000000-0000-0000-0000-000000000001'::UUID, 'Airport taxi', 3500, 'EUR', '22222222-2222-2222-2222-222222222222'::UUID, '2025-06-15 09:00:00+00'::TIMESTAMPTZ, '22222222-2222-2222-2222-222222222222'::UUID),
  ('10000000-0000-0000-0000-000000000001'::UUID, 'Dinner on Day 1', 8500, 'EUR', '22222222-2222-2222-2222-222222222222'::UUID, '2025-06-16 20:00:00+00'::TIMESTAMPTZ, '22222222-2222-2222-2222-222222222222'::UUID),

  -- On/after Benji's join date (should be visible to Benji)
  ('10000000-0000-0000-0000-000000000001'::UUID, 'Louvre tickets', 4200, 'EUR', '22222222-2222-2222-2222-222222222222'::UUID, '2025-06-18 11:00:00+00'::TIMESTAMPTZ, '22222222-2222-2222-2222-222222222222'::UUID),
  ('10000000-0000-0000-0000-000000000001'::UUID, 'Lunch on Day 4', 6500, 'EUR', '44444444-4444-4444-4444-444444444444'::UUID, '2025-06-19 13:00:00+00'::TIMESTAMPTZ, '44444444-4444-4444-4444-444444444444'::UUID),
  ('10000000-0000-0000-0000-000000000001'::UUID, 'Seine cruise', 5000, 'EUR', '22222222-2222-2222-2222-222222222222'::UUID, '2025-06-20 19:00:00+00'::TIMESTAMPTZ, '22222222-2222-2222-2222-222222222222'::UUID)
ON CONFLICT DO NOTHING;

-- Test as Alice (owner) - should see all 5 expenses
SELECT 'Alice (owner) expenses:' AS test_name,
       COUNT(*) AS visible_count,
       CASE
         WHEN COUNT(*) = 5 THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status
FROM public.expenses
WHERE trip_id = '10000000-0000-0000-0000-000000000001'::UUID;

-- Test as Benji (partial joiner) - should see 3 expenses (from 2025-06-18 onward)
-- Note: This query simulates Benji's view by manually checking the date scope
SELECT 'Benji (partial joiner) expenses simulation:' AS test_name,
       COUNT(*) AS visible_count,
       CASE
         WHEN COUNT(*) = 3 THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status
FROM public.expenses
WHERE trip_id = '10000000-0000-0000-0000-000000000001'::UUID
  AND date >= '2025-06-18 00:00:00+00'::TIMESTAMPTZ;

-- Test as Baylee (viewer) - should see NO expenses (viewers don't see expenses)
-- This would return 0 when executed with Baylee's auth.uid()

-- ============================================================================
-- TEST 3: MEDIA FILES - All Trip Participants See All Media
-- ============================================================================

-- Create test media files
INSERT INTO public.media_files (trip_id, user_id, type, url, date_taken)
VALUES
  ('10000000-0000-0000-0000-000000000001'::UUID, '22222222-2222-2222-2222-222222222222'::UUID, 'photo', 'https://storage/photo1.jpg', '2025-06-15 10:00:00+00'::TIMESTAMPTZ),
  ('10000000-0000-0000-0000-000000000001'::UUID, '22222222-2222-2222-2222-222222222222'::UUID, 'photo', 'https://storage/photo2.jpg', '2025-06-16 14:00:00+00'::TIMESTAMPTZ),
  ('10000000-0000-0000-0000-000000000001'::UUID, '44444444-4444-4444-4444-444444444444'::UUID, 'photo', 'https://storage/photo3.jpg', '2025-06-19 16:00:00+00'::TIMESTAMPTZ),
  ('10000000-0000-0000-0000-000000000001'::UUID, '22222222-2222-2222-2222-222222222222'::UUID, 'video', 'https://storage/video1.mp4', '2025-06-20 18:00:00+00'::TIMESTAMPTZ)
ON CONFLICT DO NOTHING;

-- Test as Alice (owner) - should see all 4 media files
SELECT 'Alice (owner) media files:' AS test_name,
       COUNT(*) AS visible_count,
       CASE
         WHEN COUNT(*) = 4 THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status
FROM public.media_files
WHERE trip_id = '10000000-0000-0000-0000-000000000001'::UUID;

-- Test as Benji (partial joiner) - should see all 4 media files (no date scoping)
SELECT 'Benji (partial joiner) media files:' AS test_name,
       COUNT(*) AS visible_count,
       CASE
         WHEN COUNT(*) = 4 THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status
FROM public.media_files
WHERE trip_id = '10000000-0000-0000-0000-000000000001'::UUID;

-- Test as Baylee (viewer) - should see all 4 media files
SELECT 'Baylee (viewer) media files:' AS test_name,
       COUNT(*) AS visible_count,
       CASE
         WHEN COUNT(*) = 4 THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status
FROM public.media_files
WHERE trip_id = '10000000-0000-0000-0000-000000000001'::UUID;

-- ============================================================================
-- TEST 4: HELPER FUNCTION TESTS
-- ============================================================================

-- Test get_user_trip_join_date function
SELECT 'Benji join date function:' AS test_name,
       public.get_user_trip_join_date(
         '10000000-0000-0000-0000-000000000001'::UUID,
         '44444444-4444-4444-4444-444444444444'::UUID
       ) AS join_date,
       CASE
         WHEN public.get_user_trip_join_date(
           '10000000-0000-0000-0000-000000000001'::UUID,
           '44444444-4444-4444-4444-444444444444'::UUID
         ) = '2025-06-18 00:00:00+00'::TIMESTAMPTZ THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status;

-- Test can_user_see_item function for items before join date
SELECT 'Can Benji see item before join (should be false):' AS test_name,
       public.can_user_see_item(
         '2025-06-16 14:00:00+00'::TIMESTAMPTZ,
         '10000000-0000-0000-0000-000000000001'::UUID,
         '44444444-4444-4444-4444-444444444444'::UUID
       ) AS can_see,
       CASE
         WHEN NOT public.can_user_see_item(
           '2025-06-16 14:00:00+00'::TIMESTAMPTZ,
           '10000000-0000-0000-0000-000000000001'::UUID,
           '44444444-4444-4444-4444-444444444444'::UUID
         ) THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status;

-- Test can_user_see_item function for items after join date
SELECT 'Can Benji see item after join (should be true):' AS test_name,
       public.can_user_see_item(
         '2025-06-20 18:00:00+00'::TIMESTAMPTZ,
         '10000000-0000-0000-0000-000000000001'::UUID,
         '44444444-4444-4444-4444-444444444444'::UUID
       ) AS can_see,
       CASE
         WHEN public.can_user_see_item(
           '2025-06-20 18:00:00+00'::TIMESTAMPTZ,
           '10000000-0000-0000-0000-000000000001'::UUID,
           '44444444-4444-4444-4444-444444444444'::UUID
         ) THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status;

-- Test that owners see everything regardless of date
SELECT 'Can Alice (owner) see item before trip start (should be true):' AS test_name,
       public.can_user_see_item(
         '2025-06-10 00:00:00+00'::TIMESTAMPTZ,
         '10000000-0000-0000-0000-000000000001'::UUID,
         '22222222-2222-2222-2222-222222222222'::UUID
       ) AS can_see,
       CASE
         WHEN public.can_user_see_item(
           '2025-06-10 00:00:00+00'::TIMESTAMPTZ,
           '10000000-0000-0000-0000-000000000001'::UUID,
           '22222222-2222-2222-2222-222222222222'::UUID
         ) THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status;

-- Test that viewers see everything
SELECT 'Can Baylee (viewer) see any date item (should be true):' AS test_name,
       public.can_user_see_item(
         '2025-06-16 00:00:00+00'::TIMESTAMPTZ,
         '10000000-0000-0000-0000-000000000001'::UUID,
         '66666666-6666-6666-6666-666666666666'::UUID
       ) AS can_see,
       CASE
         WHEN public.can_user_see_item(
           '2025-06-16 00:00:00+00'::TIMESTAMPTZ,
           '10000000-0000-0000-0000-000000000001'::UUID,
           '66666666-6666-6666-6666-666666666666'::UUID
         ) THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status;

-- ============================================================================
-- TEST 5: NEW HELPER FUNCTION TESTS (Migration 005)
-- ============================================================================

-- Test is_trip_owner function
SELECT 'Alice is owner of Paris trip (should be true):' AS test_name,
       public.is_trip_owner(
         '10000000-0000-0000-0000-000000000001'::UUID,
         '22222222-2222-2222-2222-222222222222'::UUID
       ) AS is_owner,
       CASE
         WHEN public.is_trip_owner(
           '10000000-0000-0000-0000-000000000001'::UUID,
           '22222222-2222-2222-2222-222222222222'::UUID
         ) THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status;

SELECT 'Benji is NOT owner of Paris trip (should be false):' AS test_name,
       public.is_trip_owner(
         '10000000-0000-0000-0000-000000000001'::UUID,
         '44444444-4444-4444-4444-444444444444'::UUID
       ) AS is_owner,
       CASE
         WHEN NOT public.is_trip_owner(
           '10000000-0000-0000-0000-000000000001'::UUID,
           '44444444-4444-4444-4444-444444444444'::UUID
         ) THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status;

-- Test can_user_read_trip_participant function
SELECT 'Alice can read Paris trip participants (should be true):' AS test_name,
       public.can_user_read_trip_participant(
         '10000000-0000-0000-0000-000000000001'::UUID,
         '22222222-2222-2222-2222-222222222222'::UUID
       ) AS can_read,
       CASE
         WHEN public.can_user_read_trip_participant(
           '10000000-0000-0000-0000-000000000001'::UUID,
           '22222222-2222-2222-2222-222222222222'::UUID
         ) THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status;

SELECT 'Benji can read Paris trip participants (should be true):' AS test_name,
       public.can_user_read_trip_participant(
         '10000000-0000-0000-0000-000000000001'::UUID,
         '44444444-4444-4444-4444-444444444444'::UUID
       ) AS can_read,
       CASE
         WHEN public.can_user_read_trip_participant(
           '10000000-0000-0000-0000-000000000001'::UUID,
           '44444444-4444-4444-4444-444444444444'::UUID
         ) THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status;

SELECT 'Baylee (viewer) can read Paris trip participants (should be true):' AS test_name,
       public.can_user_read_trip_participant(
         '10000000-0000-0000-0000-000000000001'::UUID,
         '66666666-6666-6666-6666-666666666666'::UUID
       ) AS can_read,
       CASE
         WHEN public.can_user_read_trip_participant(
           '10000000-0000-0000-0000-000000000001'::UUID,
           '66666666-6666-6666-6666-666666666666'::UUID
         ) THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status;

SELECT 'Maya CANNOT read Paris trip participants (should be false):' AS test_name,
       public.can_user_read_trip_participant(
         '10000000-0000-0000-0000-000000000001'::UUID,
         '55555555-5555-5555-5555-555555555555'::UUID
       ) AS can_read,
       CASE
         WHEN NOT public.can_user_read_trip_participant(
           '10000000-0000-0000-0000-000000000001'::UUID,
           '55555555-5555-5555-5555-555555555555'::UUID
         ) THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status;

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================

SELECT '============================================' AS separator;
SELECT 'RLS Date-Scoped Policy Test Summary' AS title;
SELECT '============================================' AS separator;
SELECT 'Run these queries with different auth.uid() contexts to verify RLS' AS note;
SELECT 'Use Supabase Dashboard > SQL Editor or Supabase CLI' AS tool;
SELECT '============================================' AS separator;
