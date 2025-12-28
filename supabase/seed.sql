-- TripThreads Seed Data
-- Description: Realistic trip data for colin.rods@gmail.com with authenticated users
-- Date: 2025-11-12
-- Last Updated: 2025-11-12

-- Main user: colin.rods@gmail.com (a439e5ca-4316-4179-94a5-a65c6f2fa1757)
-- Uses real authenticated user IDs from the database

-- ============================================================================
-- NOTE: This seed file assumes users already exist in auth.users
-- If you need to create test users, do so through the Supabase Auth system first
-- ============================================================================

-- ============================================================================
-- USER IDS (from authenticated users in database)
-- ============================================================================
-- Colin Rodriguez:    a439e5ca-4316-4179-94a5-a65c6f2fa1757
-- Colin (alt):        3af67dc9-7357-433c-bd94-c591b40376245
-- Colin (alt 2):      6393c95c-d146-4f3f-8690-187ef4d5b4ed
-- C:                  8758acbc-1dbe-4dd8-b7b4-f1dc81eab242
-- Colin (test):       bed7f4f7-8849-4296-99f8-0b8eeaaf4f86
-- Benji:              0ef09d9b-dedb-4e72-8f33-205f77bc8f98
-- (temp@test):        0B30afad-e40a-42b0-a606-983877f72f67

-- ============================================================================
-- TRIPS
-- ============================================================================

-- Trip 1: Paris Weekend (Recent - Completed)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id, base_currency, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111'::UUID,
  'Paris Weekend',
  'A wonderful weekend getaway to the City of Light! Exploring museums, cafes, and the Eiffel Tower.',
  '2024-10-15 00:00:00+00',
  '2024-10-18 00:00:00+00',
  'a439e5ca-4316-4179-94a5-a65c6f2fa1757'::UUID, -- colin.rods@gmail.com
  'EUR',
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '25 days'
) ON CONFLICT (id) DO NOTHING;

-- Trip 2: Japan Adventure (Upcoming - Detailed)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id, base_currency, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222'::UUID,
  'Japan Adventure 2025',
  'Three weeks exploring Tokyo, Kyoto, Osaka, and the Japanese Alps. Cherry blossom season!',
  '2025-03-15 00:00:00+00',
  '2025-04-05 00:00:00+00',
  'a439e5ca-4316-4179-94a5-a65c6f2fa1757'::UUID, -- colin.rods@gmail.com
  'JPY',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '2 days'
) ON CONFLICT (id) DO NOTHING;

-- Trip 3: Barcelona Summer (In Planning)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id, base_currency, created_at, updated_at)
VALUES (
  '33333333-3333-3333-3333-333333333333'::UUID,
  'Barcelona Summer',
  'Beach, tapas, and Gaudí architecture. A perfect summer escape!',
  '2025-06-10 00:00:00+00',
  '2025-06-17 00:00:00+00',
  'a439e5ca-4316-4179-94a5-a65c6f2fa1757'::UUID, -- colin.rods@gmail.com
  'EUR',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

-- Trip 4: Iceland Road Trip (Future)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id, base_currency, created_at, updated_at)
VALUES (
  '44444444-4444-4444-4444-444444444444'::UUID,
  'Iceland Road Trip',
  'Ring road adventure with waterfalls, glaciers, and the Northern Lights.',
  '2025-09-01 00:00:00+00',
  '2025-09-10 00:00:00+00',
  'a439e5ca-4316-4179-94a5-a65c6f2fa1757'::UUID, -- colin.rods@gmail.com
  'ISK',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
) ON CONFLICT (id) DO NOTHING;

-- Trip 5: NYC Long Weekend (Recent - with partial joiner)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id, base_currency, created_at, updated_at)
VALUES (
  '55555555-5555-5555-5555-555555555555'::UUID,
  'New York City',
  'The Big Apple - Broadway shows, museums, and amazing food!',
  '2024-11-01 00:00:00+00',
  '2024-11-05 00:00:00+00',
  'a439e5ca-4316-4179-94a5-a65c6f2fa1757'::UUID, -- colin.rods@gmail.com
  'USD',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TRIP PARTICIPANTS
-- ============================================================================
-- Note: Trip owners are automatically added via trigger, so we only add additional participants

-- Paris Weekend Participants (4 people total including owner)
-- Colin Rodriguez (owner) - auto-added via trigger
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by, joined_at)
VALUES
  ('11111111-1111-1111-1111-111111111111'::UUID, '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, 'participant', 'a439e5ca-4316-4179-94a5-a65c6f2fa1757'::UUID, NOW() - INTERVAL '24 days'),
  ('11111111-1111-1111-1111-111111111111'::UUID, '6393c95c-d146-4f3f-8690-187ef4d5b4ed'::UUID, 'participant', 'a439e5ca-4316-4179-94a5-a65c6f2fa1757'::UUID, NOW() - INTERVAL '24 days'),
  ('11111111-1111-1111-1111-111111111111'::UUID, '8758acbc-1dbe-4dd8-b7b4-f1dc81eab242'::UUID, 'participant', 'a439e5ca-4316-4179-94a5-a65c6f2fa1757'::UUID, NOW() - INTERVAL '23 days')
ON CONFLICT (trip_id, user_id) DO NOTHING;

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
-- E2E TEST DATA (for Mobile & Web E2E Tests)
-- ============================================================================

-- Test user for E2E tests
-- NOTE: This assumes the user exists in auth.users via Supabase Auth
-- For CI/CD, create this user with email: test-mobile@tripthreads.test
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
VALUES (
  'test-user-1-id'::UUID,
  'test-mobile@tripthreads.test',
  'Mobile Test User',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Test trip for deep linking tests
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id, base_currency, created_at, updated_at)
VALUES (
  'test-trip-deep-link'::UUID,
  'Deep Link Test Trip',
  'Test trip for E2E deep linking tests',
  '2025-01-01 00:00:00+00',
  '2025-01-07 00:00:00+00',
  'test-user-1-id'::UUID,
  'USD',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Test invite for deep linking tests
INSERT INTO public.trip_invites (token, trip_id, inviter_id, email, role, status, created_at)
VALUES (
  'test-invite-token-123',
  'test-trip-deep-link'::UUID,
  'test-user-1-id'::UUID,
  'invitee@test.com',
  'participant',
  'pending',
  NOW()
) ON CONFLICT (token) DO NOTHING;

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
