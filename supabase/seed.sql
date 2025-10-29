-- Seed Data for Development
-- Description: Sample data for testing TripThreads locally with edge cases
-- Date: 2025-01-29
-- Updated: 2025-10-29 (Added edge case users)

-- Note: Updated with actual user IDs from Supabase Auth
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
  '0830afad-e40e-42b0-a606-983871772f67'::UUID,
  'temp@test.com',
  'Temp User',
  NULL,
  'free'
) ON CONFLICT (id) DO NOTHING;

-- User 2: alice@temp.com (Pro user, primary trip owner)
INSERT INTO public.users (id, email, full_name, avatar_url, plan, plan_expires_at)
VALUES (
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID,
  'alice@temp.com',
  'Alice Johnson',
  NULL,
  'pro',
  NOW() + INTERVAL '1 year'
) ON CONFLICT (id) DO NOTHING;

-- User 3: bob@temp.com (Free user, regular participant)
INSERT INTO public.users (id, email, full_name, avatar_url, plan)
VALUES (
  '16515a28-d4f3-4a5e-bda3-e0b4f941c3d1'::UUID,
  'bob@temp.com',
  'Bob Smith',
  NULL,
  'free'
) ON CONFLICT (id) DO NOTHING;

-- User 4: benji@temp.com (Free user, partial joiner - tests joined_at filtering)
INSERT INTO public.users (id, email, full_name, avatar_url, plan)
VALUES (
  '0af9094b-dedb-4472-8133-20577fbc8f98'::UUID,
  'benji@temp.com',
  'Benji Wilson',
  NULL,
  'free'
) ON CONFLICT (id) DO NOTHING;

-- User 5: maya@test.com (Free user, isolated - tests RLS isolation & empty states)
INSERT INTO public.users (id, email, full_name, avatar_url, plan)
VALUES (
  '7ad824d5-c519-4ded-923f-01db919955db'::UUID,
  'maya@test.com',
  'Maya Chen',
  NULL,
  'free'
) ON CONFLICT (id) DO NOTHING;

-- User 6: baylee@temp.com (Free user, viewer-only - tests read-only access)
INSERT INTO public.users (id, email, full_name, avatar_url, plan)
VALUES (
  '2297a0ab-b584-453c-81ea-c7bf9b9d37bd'::UUID,
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
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID  -- Alice
) ON CONFLICT (id) DO NOTHING;

-- Trip 2: Tokyo Experience (Owner: Bob) - Standard collaboration
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000002'::UUID,
  'Tokyo Experience',
  'Exploring Japanese culture and cuisine',
  '2025-09-01 00:00:00+00',
  '2025-09-10 00:00:00+00',
  '16515a28-d4f3-4a5e-bda3-e0b4f941c3d1'::UUID  -- Bob
) ON CONFLICT (id) DO NOTHING;

-- Trip 3: Barcelona Weekend (Owner: Alice) - Viewer-only testing
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000003'::UUID,
  'Barcelona Weekend',
  'Quick weekend getaway to Barcelona',
  '2025-04-05 00:00:00+00',
  '2025-04-07 00:00:00+00',
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID  -- Alice
) ON CONFLICT (id) DO NOTHING;

-- Trip 4: London Business Trip (Owner: Temp) - Cross-trip testing
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000004'::UUID,
  'London Business Trip',
  'Quick business trip to London',
  '2025-03-10 00:00:00+00',
  '2025-03-12 00:00:00+00',
  '0830afad-e40e-42b0-a606-983871772f67'::UUID  -- Temp
) ON CONFLICT (id) DO NOTHING;

-- Trip 5: Iceland Road Trip (Owner: Benji) - Partial joiner as owner
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000005'::UUID,
  'Iceland Road Trip',
  'Epic road trip around the Ring Road',
  '2025-07-01 00:00:00+00',
  '2025-07-14 00:00:00+00',
  '0af9094b-dedb-4472-8133-20577fbc8f98'::UUID  -- Benji
) ON CONFLICT (id) DO NOTHING;

-- Trip 6: Amsterdam Getaway (Owner: Alice) - Pro tier features testing
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000006'::UUID,
  'Amsterdam Getaway',
  'Art, culture, and canals',
  '2025-08-20 00:00:00+00',
  '2025-08-25 00:00:00+00',
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID  -- Alice
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
  '16515a28-d4f3-4a5e-bda3-e0b4f941c3d1'::UUID,  -- Bob
  'participant',
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Temp (participant)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID,
  '0830afad-e40e-42b0-a606-983871772f67'::UUID,  -- Temp
  'participant',
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Benji (participant) - PARTIAL JOINER: joined 3 days into trip
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by, joined_at)
VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID,
  '0af9094b-dedb-4472-8133-20577fbc8f98'::UUID,  -- Benji
  'participant',
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID,  -- Invited by Alice
  '2025-06-18 00:00:00+00'::TIMESTAMPTZ           -- Joined 3 days after start
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Baylee (viewer) - Read-only access to test viewer permissions
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID,
  '2297a0ab-b584-453c-81ea-c7bf9b9d37bd'::UUID,  -- Baylee
  'viewer',
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================================================
-- TOKYO TRIP PARTICIPANTS (Standard collaboration)
-- ============================================================================
-- Bob (owner) - auto-added via trigger
-- Alice (participant)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000002'::UUID,
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID,  -- Alice
  'participant',
  '16515a28-d4f3-4a5e-bda3-e0b4f941c3d1'::UUID   -- Invited by Bob
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Baylee (viewer) - Read-only access
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000002'::UUID,
  '2297a0ab-b584-453c-81ea-c7bf9b9d37bd'::UUID,  -- Baylee
  'viewer',
  '16515a28-d4f3-4a5e-bda3-e0b4f941c3d1'::UUID   -- Invited by Bob
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================================================
-- BARCELONA TRIP PARTICIPANTS (Viewer testing)
-- ============================================================================
-- Alice (owner) - auto-added via trigger
-- Baylee (viewer)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000003'::UUID,
  '2297a0ab-b584-453c-81ea-c7bf9b9d37bd'::UUID,  -- Baylee
  'viewer',
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================================================
-- LONDON TRIP PARTICIPANTS (Cross-trip testing)
-- ============================================================================
-- Temp (owner) - auto-added via trigger
-- Bob (participant)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000004'::UUID,
  '16515a28-d4f3-4a5e-bda3-e0b4f941c3d1'::UUID,  -- Bob
  'participant',
  '0830afad-e40e-42b0-a606-983871772f67'::UUID   -- Invited by Temp
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Baylee (viewer)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000004'::UUID,
  '2297a0ab-b584-453c-81ea-c7bf9b9d37bd'::UUID,  -- Baylee
  'viewer',
  '0830afad-e40e-42b0-a606-983871772f67'::UUID   -- Invited by Temp
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================================================
-- ICELAND TRIP PARTICIPANTS (Owner who joins other trips late)
-- ============================================================================
-- Benji (owner) - auto-added via trigger
-- Alice (participant)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000005'::UUID,
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID,  -- Alice
  'participant',
  '0af9094b-dedb-4472-8133-20577fbc8f98'::UUID   -- Invited by Benji
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Temp (participant)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000005'::UUID,
  '0830afad-e40e-42b0-a606-983871772f67'::UUID,  -- Temp
  'participant',
  '0af9094b-dedb-4472-8133-20577fbc8f98'::UUID   -- Invited by Benji
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================================================
-- AMSTERDAM TRIP PARTICIPANTS (Pro tier testing)
-- ============================================================================
-- Alice (owner, Pro user) - auto-added via trigger
-- Bob (participant)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000006'::UUID,
  '16515a28-d4f3-4a5e-bda3-e0b4f941c3d1'::UUID,  -- Bob
  'participant',
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Benji (participant)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000006'::UUID,
  '0af9094b-dedb-4472-8133-20577fbc8f98'::UUID,  -- Benji
  'participant',
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Baylee (viewer)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000006'::UUID,
  '2297a0ab-b584-453c-81ea-c7bf9b9d37bd'::UUID,  -- Baylee
  'viewer',
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID   -- Invited by Alice
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
-- SET request.jwt.claims.sub = '7ad824d5-c519-4ded-923f-01db919955db';
-- SELECT * FROM public.trips;  -- Should return 0 rows

-- Test 2: Verify Alice (owner) can see her trips
-- SET request.jwt.claims.sub = 'ea1854fb-b8f4-480f-899f-af1bcf0218b3';
-- SELECT name FROM public.trips;  -- Should return Paris, Barcelona, Amsterdam

-- Test 3: Verify Benji (partial joiner) shows correct joined_at date
-- SELECT
--   t.name,
--   tp.joined_at,
--   t.start_date
-- FROM public.trip_participants tp
-- JOIN public.trips t ON tp.trip_id = t.id
-- WHERE tp.user_id = '0af9094b-dedb-4472-8133-20577fbc8f98'  -- Benji
-- ORDER BY t.start_date;

-- Test 4: Verify Baylee (viewer) can see trips but not other users' profiles
-- SET request.jwt.claims.sub = '2297a0ab-b584-453c-81ea-c7bf9b9d37bd';
-- SELECT name FROM public.trips;  -- Should return Tokyo, Barcelona, London, Amsterdam
-- SELECT * FROM public.users WHERE id != '2297a0ab-b584-453c-81ea-c7bf9b9d37bd';  -- Should return 0 rows

-- Test 5: Count trips per user (to verify data distribution)
-- SELECT
--   u.email,
--   COUNT(DISTINCT tp.trip_id) AS trip_count,
--   STRING_AGG(DISTINCT tp.role, ', ') AS roles
-- FROM public.users u
-- LEFT JOIN public.trip_participants tp ON u.id = tp.user_id
-- GROUP BY u.id, u.email
-- ORDER BY trip_count DESC, u.email;
