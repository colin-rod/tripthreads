-- Seed Data for Development
-- Description: Sample data for testing TripThreads locally
-- Date: 2025-01-29

-- Note: Updated with actual user IDs from Supabase Auth
-- Users created: temp@test.com, alice@temp.com, bob@temp.com

-- ============================================================================
-- SAMPLE USERS
-- ============================================================================

-- Insert sample user profiles matching auth.users

-- User 1: temp@test.com (Free user)
INSERT INTO public.users (id, email, full_name, avatar_url, plan)
VALUES (
  '0830afad-e40e-42b0-a606-983871772f67'::UUID,
  'temp@test.com',
  'Temp User',
  NULL,
  'free'
) ON CONFLICT (id) DO NOTHING;

-- User 2: alice@temp.com (Pro user, trip owner)
INSERT INTO public.users (id, email, full_name, avatar_url, plan, plan_expires_at)
VALUES (
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID,
  'alice@temp.com',
  'Alice Johnson',
  NULL,
  'pro',
  NOW() + INTERVAL '1 year'
) ON CONFLICT (id) DO NOTHING;

-- User 3: bob@temp.com (Free user)
INSERT INTO public.users (id, email, full_name, avatar_url, plan)
VALUES (
  '16515a28-d4f3-4a5e-bda3-e0b4f941c3d1'::UUID,
  'bob@temp.com',
  'Bob Smith',
  NULL,
  'free'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE TRIPS
-- ============================================================================

-- Trip 1: Paris Trip (Owner: Alice)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID,
  'Paris Adventure 2025',
  'A week exploring the City of Light with friends',
  '2025-06-15 00:00:00+00',
  '2025-06-22 00:00:00+00',
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID  -- Alice
) ON CONFLICT (id) DO NOTHING;

-- Trip 2: Tokyo Trip (Owner: Bob)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000002'::UUID,
  'Tokyo Experience',
  'Exploring Japanese culture and cuisine',
  '2025-09-01 00:00:00+00',
  '2025-09-10 00:00:00+00',
  '16515a28-d4f3-4a5e-bda3-e0b4f941c3d1'::UUID  -- Bob
) ON CONFLICT (id) DO NOTHING;

-- Trip 3: Barcelona Weekend (Owner: Alice)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000003'::UUID,
  'Barcelona Weekend',
  'Quick weekend getaway to Barcelona',
  '2025-04-05 00:00:00+00',
  '2025-04-07 00:00:00+00',
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID  -- Alice
) ON CONFLICT (id) DO NOTHING;

-- Trip 4: London Business Trip (Owner: Temp User)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000004'::UUID,
  'London Business Trip',
  'Quick business trip to London',
  '2025-03-10 00:00:00+00',
  '2025-03-12 00:00:00+00',
  '0830afad-e40e-42b0-a606-983871772f67'::UUID  -- Temp
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE TRIP PARTICIPANTS
-- ============================================================================

-- Note: Trip owners are automatically added as participants via trigger
-- We only need to add additional participants here

-- Paris Trip Participants
-- Alice is already added as owner via trigger
-- Add Bob as participant
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID,  -- Paris trip
  '16515a28-d4f3-4a5e-bda3-e0b4f941c3d1'::UUID,  -- Bob
  'participant',
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Add Temp as participant
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID,  -- Paris trip
  '0830afad-e40e-42b0-a606-983871772f67'::UUID,  -- Temp
  'participant',
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Tokyo Trip Participants
-- Bob is already added as owner via trigger
-- Add Alice as participant
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000002'::UUID,  -- Tokyo trip
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID,  -- Alice
  'participant',
  '16515a28-d4f3-4a5e-bda3-e0b4f941c3d1'::UUID   -- Invited by Bob
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Barcelona Trip Participants
-- Alice is already added as owner via trigger
-- Add Temp as viewer (can see but not edit)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000003'::UUID,  -- Barcelona trip
  '0830afad-e40e-42b0-a606-983871772f67'::UUID,  -- Temp
  'viewer',
  'ea1854fb-b8f4-480f-899f-af1bcf0218b3'::UUID   -- Invited by Alice
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- London Trip Participants
-- Temp is already added as owner via trigger
-- Add Bob as participant
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000004'::UUID,  -- London trip
  '16515a28-d4f3-4a5e-bda3-e0b4f941c3d1'::UUID,  -- Bob
  'participant',
  '0830afad-e40e-42b0-a606-983871772f67'::UUID   -- Invited by Temp
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- To verify the seed data, run these queries:

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
