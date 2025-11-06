-- Seed Data for Development
-- Description: Sample data for testing TripThreads locally with edge cases
-- Date: 2025-01-29
-- Updated: 2025-10-29 (Added edge case users)

-- Note: Uses deterministic placeholder user IDs for local testing only
-- Users: temp, alice, bob, benji, maya, baylee

-- ============================================================================
-- TEST COVERAGE MATRIX
-- ============================================================================
-- User          | Role Scenarios                    | Edge Cases
-- ------------- | --------------------------------- | ---------------------------
-- temp          | Multi-trip participant            | Cross-trip collaboration
-- alice         | Pro user, primary trip owner      | Plan tier testing
-- bob           | Regular participant               | Standard collaboration
-- benji         | Partial joiner (joins mid-trip)   | Historical data visibility
-- maya          | Isolated user (no trips)          | Empty state, RLS isolation
-- baylee        | Viewer-only across trips          | Read-only access testing

-- ============================================================================
-- SAMPLE USERS
-- ============================================================================

-- User 1: temp@test.com (Free user, multi-trip participant)
INSERT INTO public.users (id, email, full_name, avatar_url, plan)
VALUES (
  '11111111-1111-1111-1111-111111111111'::UUID,
  'temp@test.com',
  'Temp User',
  NULL,
  'free'
) ON CONFLICT (id) DO NOTHING;

-- User 2: alice@temp.com (Pro user, primary trip owner)
INSERT INTO public.users (id, email, full_name, avatar_url, plan, plan_expires_at)
VALUES (
  '22222222-2222-2222-2222-222222222222'::UUID,
  'alice@temp.com',
  'Alice Johnson',
  NULL,
  'pro',
  NOW() + INTERVAL '1 year'
) ON CONFLICT (id) DO NOTHING;

-- User 3: bob@temp.com (Free user, regular participant)
INSERT INTO public.users (id, email, full_name, avatar_url, plan)
VALUES (
  '33333333-3333-3333-3333-333333333333'::UUID,
  'bob@temp.com',
  'Bob Smith',
  NULL,
  'free'
) ON CONFLICT (id) DO NOTHING;

-- User 4: benji@temp.com (Free user, partial joiner - tests joined_at filtering)
INSERT INTO public.users (id, email, full_name, avatar_url, plan)
VALUES (
  '44444444-4444-4444-4444-444444444444'::UUID,
  'benji@temp.com',
  'Benji Wilson',
  NULL,
  'free'
) ON CONFLICT (id) DO NOTHING;

-- User 5: maya@test.com (Free user, isolated - tests RLS isolation & empty states)
INSERT INTO public.users (id, email, full_name, avatar_url, plan)
VALUES (
  '55555555-5555-5555-5555-555555555555'::UUID,
  'maya@test.com',
  'Maya Chen',
  NULL,
  'free'
) ON CONFLICT (id) DO NOTHING;

-- User 6: baylee@temp.com (Free user, viewer-only - tests read-only access)
INSERT INTO public.users (id, email, full_name, avatar_url, plan)
VALUES (
  '66666666-6666-6666-6666-666666666666'::UUID,
  'baylee@temp.com',
  'Baylee Martinez',
  NULL,
  'free'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE TRIPS
-- ============================================================================

-- Trip 1: Paris Adventure (Owner: Alice) - Multi-participant trip
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID,
  'Paris Adventure 2025',
  'A week exploring the City of Light with friends',
  '2025-06-15 00:00:00+00',
  '2025-06-22 00:00:00+00',
  '22222222-2222-2222-2222-222222222222'::UUID  -- Alice
) ON CONFLICT (id) DO NOTHING;

-- Trip 2: Tokyo Experience (Owner: Bob) - Standard collaboration
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000002'::UUID,
  'Tokyo Experience',
  'Exploring Japanese culture and cuisine',
  '2025-09-01 00:00:00+00',
  '2025-09-10 00:00:00+00',
  '33333333-3333-3333-3333-333333333333'::UUID  -- Bob
) ON CONFLICT (id) DO NOTHING;

-- Trip 3: Barcelona Weekend (Owner: Alice) - Viewer-only testing
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000003'::UUID,
  'Barcelona Weekend',
  'Quick weekend getaway to Barcelona',
  '2025-04-05 00:00:00+00',
  '2025-04-07 00:00:00+00',
  '22222222-2222-2222-2222-222222222222'::UUID  -- Alice
) ON CONFLICT (id) DO NOTHING;

-- Trip 4: London Business Trip (Owner: Temp) - Cross-trip testing
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000004'::UUID,
  'London Business Trip',
  'Quick business trip to London',
  '2025-03-10 00:00:00+00',
  '2025-03-12 00:00:00+00',
  '11111111-1111-1111-1111-111111111111'::UUID  -- Temp
) ON CONFLICT (id) DO NOTHING;

-- Trip 5: Iceland Road Trip (Owner: Benji) - Partial joiner as owner
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000005'::UUID,
  'Iceland Road Trip',
  'Epic road trip around the Ring Road',
  '2025-07-01 00:00:00+00',
  '2025-07-14 00:00:00+00',
  '44444444-4444-4444-4444-444444444444'::UUID  -- Benji
) ON CONFLICT (id) DO NOTHING;

-- Trip 6: Amsterdam Getaway (Owner: Alice) - Pro tier features testing
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000006'::UUID,
  'Amsterdam Getaway',
  'Art, culture, and canals',
  '2025-08-20 00:00:00+00',
  '2025-08-25 00:00:00+00',
  '22222222-2222-2222-2222-222222222222'::UUID  -- Alice
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE TRIP PARTICIPANTS
-- ============================================================================

-- Note: Trip owners are automatically added as participants via trigger
-- We only need to add additional participants here

-- ============================================================================
-- PARIS TRIP PARTICIPANTS (Multi-participant scenario)
-- ============================================================================
-- Alice (owner) - auto-added via trigger
-- Bob (participant)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID,
  '33333333-3333-3333-3333-333333333333'::UUID,  -- Bob
  'participant',
  '22222222-2222-2222-2222-222222222222'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Temp (participant)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID,
  '11111111-1111-1111-1111-111111111111'::UUID,  -- Temp
  'participant',
  '22222222-2222-2222-2222-222222222222'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Benji (participant) - PARTIAL JOINER: joined 3 days into trip
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by, joined_at)
VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID,
  '44444444-4444-4444-4444-444444444444'::UUID,  -- Benji
  'participant',
  '22222222-2222-2222-2222-222222222222'::UUID,  -- Invited by Alice
  '2025-06-18 00:00:00+00'::TIMESTAMPTZ           -- Joined 3 days after start
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Baylee (viewer) - Read-only access to test viewer permissions
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID,
  '66666666-6666-6666-6666-666666666666'::UUID,  -- Baylee
  'viewer',
  '22222222-2222-2222-2222-222222222222'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================================================
-- TOKYO TRIP PARTICIPANTS (Standard collaboration)
-- ============================================================================
-- Bob (owner) - auto-added via trigger
-- Alice (participant)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000002'::UUID,
  '22222222-2222-2222-2222-222222222222'::UUID,  -- Alice
  'participant',
  '33333333-3333-3333-3333-333333333333'::UUID   -- Invited by Bob
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Baylee (viewer) - Read-only access
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000002'::UUID,
  '66666666-6666-6666-6666-666666666666'::UUID,  -- Baylee
  'viewer',
  '33333333-3333-3333-3333-333333333333'::UUID   -- Invited by Bob
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================================================
-- BARCELONA TRIP PARTICIPANTS (Viewer testing)
-- ============================================================================
-- Alice (owner) - auto-added via trigger
-- Baylee (viewer)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000003'::UUID,
  '66666666-6666-6666-6666-666666666666'::UUID,  -- Baylee
  'viewer',
  '22222222-2222-2222-2222-222222222222'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================================================
-- LONDON TRIP PARTICIPANTS (Cross-trip testing)
-- ============================================================================
-- Temp (owner) - auto-added via trigger
-- Bob (participant)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000004'::UUID,
  '33333333-3333-3333-3333-333333333333'::UUID,  -- Bob
  'participant',
  '11111111-1111-1111-1111-111111111111'::UUID   -- Invited by Temp
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Baylee (viewer)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000004'::UUID,
  '66666666-6666-6666-6666-666666666666'::UUID,  -- Baylee
  'viewer',
  '11111111-1111-1111-1111-111111111111'::UUID   -- Invited by Temp
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================================================
-- ICELAND TRIP PARTICIPANTS (Owner who joins other trips late)
-- ============================================================================
-- Benji (owner) - auto-added via trigger
-- Alice (participant)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000005'::UUID,
  '22222222-2222-2222-2222-222222222222'::UUID,  -- Alice
  'participant',
  '44444444-4444-4444-4444-444444444444'::UUID   -- Invited by Benji
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Temp (participant)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000005'::UUID,
  '11111111-1111-1111-1111-111111111111'::UUID,  -- Temp
  'participant',
  '44444444-4444-4444-4444-444444444444'::UUID   -- Invited by Benji
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================================================
-- AMSTERDAM TRIP PARTICIPANTS (Pro tier testing)
-- ============================================================================
-- Alice (owner, Pro user) - auto-added via trigger
-- Bob (participant)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000006'::UUID,
  '33333333-3333-3333-3333-333333333333'::UUID,  -- Bob
  'participant',
  '22222222-2222-2222-2222-222222222222'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Benji (participant)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000006'::UUID,
  '44444444-4444-4444-4444-444444444444'::UUID,  -- Benji
  'participant',
  '22222222-2222-2222-2222-222222222222'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Baylee (viewer)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000006'::UUID,
  '66666666-6666-6666-6666-666666666666'::UUID,  -- Baylee
  'viewer',
  '22222222-2222-2222-2222-222222222222'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================================================
-- EDGE CASE: Maya has NO trips (tests RLS isolation & empty states)
-- ============================================================================
-- No participants entries for Maya - she's completely isolated

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check all users
-- SELECT id, email, full_name, plan FROM public.users ORDER BY email;

-- Check all trips with owner info
-- SELECT
--   t.name AS trip_name,
--   t.start_date,
--   t.end_date,
--   u.email AS owner_email
-- FROM public.trips t
-- JOIN public.users u ON t.owner_id = u.id
-- ORDER BY t.start_date;

-- Check all trip participants with details
-- SELECT
--   t.name AS trip_name,
--   u.email AS participant_email,
--   u.full_name AS participant_name,
--   tp.role,
--   tp.joined_at
-- FROM public.trip_participants tp
-- JOIN public.trips t ON tp.trip_id = t.id
-- JOIN public.users u ON tp.user_id = u.id
-- ORDER BY t.name, tp.role, u.email;

-- Count participants per trip
-- SELECT
--   t.name AS trip_name,
--   COUNT(tp.user_id) AS participant_count
-- FROM public.trips t
-- LEFT JOIN public.trip_participants tp ON t.id = tp.trip_id
-- GROUP BY t.id, t.name
-- ORDER BY t.name;

-- ============================================================================
-- RLS POLICY TESTING QUERIES
-- ============================================================================

-- Test 1: Verify Maya (isolated user) can't see any trips
-- SET request.jwt.claims.sub = '55555555-5555-5555-5555-555555555555';
-- SELECT * FROM public.trips;  -- Should return 0 rows

-- Test 2: Verify Alice (owner) can see her trips
-- SET request.jwt.claims.sub = '22222222-2222-2222-2222-222222222222';
-- SELECT name FROM public.trips;  -- Should return Paris, Barcelona, Amsterdam

-- Test 3: Verify Benji (partial joiner) shows correct joined_at date
-- SELECT
--   t.name,
--   tp.joined_at,
--   t.start_date
-- FROM public.trip_participants tp
-- JOIN public.trips t ON tp.trip_id = t.id
-- WHERE tp.user_id = '44444444-4444-4444-4444-444444444444'  -- Benji
-- ORDER BY t.start_date;

-- Test 4: Verify Baylee (viewer) can see trips but not other users' profiles
-- SET request.jwt.claims.sub = '66666666-6666-6666-6666-666666666666';
-- SELECT name FROM public.trips;  -- Should return Tokyo, Barcelona, London, Amsterdam
-- SELECT * FROM public.users WHERE id != '66666666-6666-6666-6666-666666666666';  -- Should return 0 rows

-- Test 5: Count trips per user (to verify data distribution)
-- SELECT
--   u.email,
--   COUNT(DISTINCT tp.trip_id) AS trip_count,
--   STRING_AGG(DISTINCT tp.role, ', ') AS roles
-- FROM public.users u
-- LEFT JOIN public.trip_participants tp ON u.id = tp.user_id
-- GROUP BY u.id, u.email
-- ORDER BY trip_count DESC, u.email;
