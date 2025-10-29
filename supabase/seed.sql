-- Seed Data for Development
-- Description: Sample data for testing TripThreads locally
-- Date: 2025-01-29

-- Note: This seed assumes you have test users in auth.users
-- You should create these users via Supabase Auth first, then update the UUIDs below

-- ============================================================================
-- SAMPLE USERS
-- ============================================================================

-- Insert sample user profiles
-- Replace these UUIDs with actual UUIDs from your auth.users table after creating test accounts

-- User 1: Alice (Pro user, trip owner)
INSERT INTO public.users (id, email, full_name, avatar_url, plan, plan_expires_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'alice@example.com',
  'Alice Johnson',
  NULL,
  'pro',
  NOW() + INTERVAL '1 year'
) ON CONFLICT (id) DO NOTHING;

-- User 2: Bob (Free user)
INSERT INTO public.users (id, email, full_name, avatar_url, plan)
VALUES (
  '00000000-0000-0000-0000-000000000002'::UUID,
  'bob@example.com',
  'Bob Smith',
  NULL,
  'free'
) ON CONFLICT (id) DO NOTHING;

-- User 3: Carol (Free user)
INSERT INTO public.users (id, email, full_name, avatar_url, plan)
VALUES (
  '00000000-0000-0000-0000-000000000003'::UUID,
  'carol@example.com',
  'Carol Davis',
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
  '00000000-0000-0000-0000-000000000001'::UUID
) ON CONFLICT (id) DO NOTHING;

-- Trip 2: Tokyo Trip (Owner: Bob)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000002'::UUID,
  'Tokyo Experience',
  'Exploring Japanese culture and cuisine',
  '2025-09-01 00:00:00+00',
  '2025-09-10 00:00:00+00',
  '00000000-0000-0000-0000-000000000002'::UUID
) ON CONFLICT (id) DO NOTHING;

-- Trip 3: Barcelona Weekend (Owner: Alice)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id)
VALUES (
  '10000000-0000-0000-0000-000000000003'::UUID,
  'Barcelona Weekend',
  'Quick weekend getaway to Barcelona',
  '2025-04-05 00:00:00+00',
  '2025-04-07 00:00:00+00',
  '00000000-0000-0000-0000-000000000001'::UUID
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
  '10000000-0000-0000-0000-000000000001'::UUID,
  '00000000-0000-0000-0000-000000000002'::UUID,
  'participant',
  '00000000-0000-0000-0000-000000000001'::UUID
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Add Carol as participant
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID,
  '00000000-0000-0000-0000-000000000003'::UUID,
  'participant',
  '00000000-0000-0000-0000-000000000001'::UUID
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Tokyo Trip Participants
-- Bob is already added as owner via trigger
-- Add Alice as participant
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000002'::UUID,
  '00000000-0000-0000-0000-000000000001'::UUID,
  'participant',
  '00000000-0000-0000-0000-000000000002'::UUID
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Barcelona Trip Participants
-- Alice is already added as owner via trigger
-- Add Carol as viewer (can see but not edit)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
VALUES (
  '10000000-0000-0000-0000-000000000003'::UUID,
  '00000000-0000-0000-0000-000000000003'::UUID,
  'viewer',
  '00000000-0000-0000-0000-000000000001'::UUID
) ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- To verify the seed data, run these queries:

-- SELECT * FROM public.users;
-- SELECT * FROM public.trips;
-- SELECT * FROM public.trip_participants;

-- To check trip participants with user details:
-- SELECT
--   t.name AS trip_name,
--   u.full_name AS participant_name,
--   tp.role,
--   tp.joined_at
-- FROM public.trip_participants tp
-- JOIN public.trips t ON tp.trip_id = t.id
-- JOIN public.users u ON tp.user_id = u.id
-- ORDER BY t.name, tp.role, u.full_name;
