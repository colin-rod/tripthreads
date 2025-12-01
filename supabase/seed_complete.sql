-- TripThreads Comprehensive Seed Data
-- Description: Realistic trip data for colin.rods@gmail.com with authenticated users
-- Date: 2025-11-12
-- Main user: colin.rods@gmail.com (a439e5ca-4316-4179-94a5-a65c6f2fa175)

-- ============================================================================
-- USER IDS (from authenticated users in database)
-- ============================================================================
-- Colin Rodriguez:    a439e5ca-4316-4179-94a5-a65c6f2fa175
-- Colin (alt):        3af67dc9-7357-433c-bd94-c591b40376245
-- Colin (alt 2):      6393c95c-d146-4f3f-8690-187ef4d5b4ed
-- C:                  8758acbc-1dbe-4dd8-b7b4-f1dc81eab242
-- Colin (test):       bed7f4f7-8849-4296-99f8-0b8eeaaf4f86
-- Benji:              0ef09d9b-dedb-4e72-8f33-205f77bc8f98
-- temp@test:          0B30afad-e40a-42b0-a606-983877f72f67

-- ============================================================================
-- CLEAN UP EXISTING DATA (for fresh start)
-- ============================================================================

-- Delete in reverse order of dependencies
DELETE FROM public.message_reactions;
DELETE FROM public.chat_messages;
DELETE FROM public.settlements;
DELETE FROM public.expense_participants;
DELETE FROM public.expenses;
DELETE FROM public.itinerary_item_participants;
DELETE FROM public.itinerary_items;
DELETE FROM public.trip_invites;
DELETE FROM public.trip_participants;
DELETE FROM public.trips;

-- ============================================================================
-- ENSURE USERS EXIST IN public.users
-- ============================================================================
-- Note: These users should already exist in auth.users
-- This ensures they also exist in public.users with the foreign key relationship

INSERT INTO public.users (id, email, full_name, plan)
SELECT id, email, raw_user_meta_data->>'full_name', 'free'
FROM auth.users
WHERE id = 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TRIPS (5 diverse trips)
-- ============================================================================

-- Trip 1: Paris Weekend (Past - Completed)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id, base_currency, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111'::UUID,
  'Paris Weekend',
  'A wonderful weekend getaway to the City of Light! Exploring museums, cafes, and the Eiffel Tower.',
  '2024-10-15 00:00:00+00',
  '2024-10-18 00:00:00+00',
  'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID,
  'EUR',
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '20 days'
);

-- Trip 2: Japan Adventure 2025 (Upcoming - Most detailed)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id, base_currency, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222'::UUID,
  'Japan Adventure 2025',
  'Three weeks exploring Tokyo, Kyoto, Osaka, and the Japanese Alps. Cherry blossom season!',
  '2025-03-15 00:00:00+00',
  '2025-04-05 00:00:00+00',
  'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID,
  'JPY',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '1 day'
);

-- Trip 3: Barcelona Summer (Future - In Planning)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id, base_currency, created_at, updated_at)
VALUES (
  '33333333-3333-3333-3333-333333333333'::UUID,
  'Barcelona Summer',
  'Beach, tapas, and Gaudí architecture. A perfect summer escape!',
  '2025-06-10 00:00:00+00',
  '2025-06-17 00:00:00+00',
  'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID,
  'EUR',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '1 day'
);

-- Trip 4: Iceland Road Trip (Future)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id, base_currency, created_at, updated_at)
VALUES (
  '44444444-4444-4444-4444-444444444444'::UUID,
  'Iceland Road Trip',
  'Ring road adventure with waterfalls, glaciers, and the Northern Lights.',
  '2025-09-01 00:00:00+00',
  '2025-09-10 00:00:00+00',
  'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID,
  'ISK',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
);

-- Trip 5: NYC Long Weekend (Recent - with partial joiner demo)
INSERT INTO public.trips (id, name, description, start_date, end_date, owner_id, base_currency, created_at, updated_at)
VALUES (
  '55555555-5555-5555-5555-555555555555'::UUID,
  'New York City',
  'The Big Apple - Broadway shows, museums, and amazing food!',
  '2024-11-01 00:00:00+00',
  '2024-11-05 00:00:00+00',
  'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID,
  'USD',
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '6 days'
);

-- ============================================================================
-- TRIP PARTICIPANTS
-- ============================================================================
-- Note: Owners are auto-added via trigger. We only add additional participants.

-- Paris Weekend (4 people total)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by, joined_at) VALUES
  ('11111111-1111-1111-1111-111111111111'::UUID, '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, 'participant', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NOW() - INTERVAL '24 days'),
  ('11111111-1111-1111-1111-111111111111'::UUID, '6393c95c-d146-4f3f-8690-187ef4d5b4ed'::UUID, 'participant', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NOW() - INTERVAL '24 days'),
  ('11111111-1111-1111-1111-111111111111'::UUID, '8758acbc-1dbe-4dd8-b7b4-f1dc81eab242'::UUID, 'participant', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NOW() - INTERVAL '23 days');

-- Japan Adventure (5 people: 4 participants + 1 viewer)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by, joined_at) VALUES
  ('22222222-2222-2222-2222-222222222222'::UUID, '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, 'participant', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NOW() - INTERVAL '9 days'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'bed7f4f7-8849-4296-99f8-0b8eeaaf4f86'::UUID, 'participant', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NOW() - INTERVAL '9 days'),
  ('22222222-2222-2222-2222-222222222222'::UUID, '0B30afad-e40a-42b0-a606-983877f72f67'::UUID, 'participant', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NOW() - INTERVAL '8 days'),
  ('22222222-2222-2222-2222-222222222222'::UUID, '0ef09d9b-dedb-4e72-8f33-205f77bc8f98'::UUID, 'viewer', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NOW() - INTERVAL '7 days');

-- Barcelona Summer (3 people)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by, joined_at) VALUES
  ('33333333-3333-3333-3333-333333333333'::UUID, '6393c95c-d146-4f3f-8690-187ef4d5b4ed'::UUID, 'participant', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NOW() - INTERVAL '4 days'),
  ('33333333-3333-3333-3333-333333333333'::UUID, '8758acbc-1dbe-4dd8-b7b4-f1dc81eab242'::UUID, 'participant', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NOW() - INTERVAL '4 days');

-- Iceland Road Trip (2 people - small group)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by, joined_at) VALUES
  ('44444444-4444-4444-4444-444444444444'::UUID, '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, 'participant', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NOW() - INTERVAL '2 days');

-- NYC Long Weekend (4 people, with 1 partial joiner)
INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by, joined_at, join_start_date, join_end_date) VALUES
  ('55555555-5555-5555-5555-555555555555'::UUID, 'bed7f4f7-8849-4296-99f8-0b8eeaaf4f86'::UUID, 'participant', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NOW() - INTERVAL '11 days', NULL, NULL),
  ('55555555-5555-5555-5555-555555555555'::UUID, '0B30afad-e40a-42b0-a606-983877f72f67'::UUID, 'participant', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NOW() - INTERVAL '11 days', NULL, NULL),
  ('55555555-5555-5555-5555-555555555555'::UUID, '8758acbc-1dbe-4dd8-b7b4-f1dc81eab242'::UUID, 'participant', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NOW() - INTERVAL '10 days', '2024-11-03', '2024-11-05'); -- Partial joiner (last 2 days only)

-- ============================================================================
-- EXPENSES
-- ============================================================================

-- Paris Weekend Expenses (Completed trip - settled)
INSERT INTO public.expenses (trip_id, description, amount, currency, category, payer_id, date, created_by, fx_rate) VALUES
  ('11111111-1111-1111-1111-111111111111'::UUID, 'Eiffel Tower tickets', 7600, 'EUR', 'activity', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '2024-10-15 14:00:00+00', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NULL),
  ('11111111-1111-1111-1111-111111111111'::UUID, 'Dinner at Le Comptoir', 12800, 'EUR', 'food', '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, '2024-10-15 20:00:00+00', '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, NULL),
  ('11111111-1111-1111-1111-111111111111'::UUID, 'Uber to hotel', 2500, 'EUR', 'transport', '6393c95c-d146-4f3f-8690-187ef4d5b4ed'::UUID, '2024-10-15 22:30:00+00', '6393c95c-d146-4f3f-8690-187ef4d5b4ed'::UUID, NULL),
  ('11111111-1111-1111-1111-111111111111'::UUID, 'Louvre Museum tickets', 6800, 'EUR', 'activity', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '2024-10-16 10:00:00+00', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NULL),
  ('11111111-1111-1111-1111-111111111111'::UUID, 'Lunch at cafe', 5600, 'EUR', 'food', '8758acbc-1dbe-4dd8-b7b4-f1dc81eab242'::UUID, '2024-10-16 13:00:00+00', '8758acbc-1dbe-4dd8-b7b4-f1dc81eab242'::UUID, NULL),
  ('11111111-1111-1111-1111-111111111111'::UUID, 'Seine river cruise', 8000, 'EUR', 'activity', '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, '2024-10-16 19:00:00+00', '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, NULL),
  ('11111111-1111-1111-1111-111111111111'::UUID, 'Croissants and coffee', 1800, 'EUR', 'food', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '2024-10-17 08:00:00+00', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NULL),
  ('11111111-1111-1111-1111-111111111111'::UUID, 'Taxi to airport', 4500, 'EUR', 'transport', '6393c95c-d146-4f3f-8690-187ef4d5b4ed'::UUID, '2024-10-18 06:00:00+00', '6393c95c-d146-4f3f-8690-187ef4d5b4ed'::UUID, NULL);

-- Japan Adventure Expenses (Pre-trip bookings)
INSERT INTO public.expenses (trip_id, description, amount, currency, category, payer_id, date, created_by, fx_rate) VALUES
  ('22222222-2222-2222-2222-222222222222'::UUID, 'JR Pass (4 people)', 140000, 'JPY', 'transport', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NOW() - INTERVAL '5 days', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, 0.0067),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'Tokyo accommodation deposit', 45000, 'JPY', 'accommodation', '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, NOW() - INTERVAL '3 days', '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, 0.0067),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'Travel insurance (group)', 28000, 'JPY', 'other', 'bed7f4f7-8849-4296-99f8-0b8eeaaf4f86'::UUID, NOW() - INTERVAL '2 days', 'bed7f4f7-8849-4296-99f8-0b8eeaaf4f86'::UUID, 0.0067);

-- NYC Expenses (Demonstrating partial joiner expense proration)
INSERT INTO public.expenses (trip_id, description, amount, currency, category, payer_id, date, created_by, fx_rate) VALUES
  ('55555555-5555-5555-5555-555555555555'::UUID, 'Broadway tickets', 32000, 'USD', 'activity', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '2024-11-01 19:00:00+00', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NULL), -- Before C joined
  ('55555555-5555-5555-5555-555555555555'::UUID, 'Dinner at Katz Deli', 8500, 'USD', 'food', 'bed7f4f7-8849-4296-99f8-0b8eeaaf4f86'::UUID, '2024-11-02 18:00:00+00', 'bed7f4f7-8849-4296-99f8-0b8eeaaf4f86'::UUID, NULL),
  ('55555555-5555-5555-5555-555555555555'::UUID, 'MET Museum tickets', 10000, 'USD', 'activity', '0B30afad-e40a-42b0-a606-983877f72f67'::UUID, '2024-11-03 10:00:00+00', '0B30afad-e40a-42b0-a606-983877f72f67'::UUID, NULL), -- Day C joined
  ('55555555-5555-5555-5555-555555555555'::UUID, 'Times Square dinner', 15000, 'USD', 'food', '8758acbc-1dbe-4dd8-b7b4-f1dc81eab242'::UUID, '2024-11-03 20:00:00+00', '8758acbc-1dbe-4dd8-b7b4-f1dc81eab242'::UUID, NULL), -- C present
  ('55555555-5555-5555-5555-555555555555'::UUID, 'Uber to JFK', 6500, 'USD', 'transport', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '2024-11-05 05:00:00+00', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, NULL);

-- ============================================================================
-- ITINERARY ITEMS (Japan Adventure - Most detailed)
-- ============================================================================

-- Tokyo (March 15-20)
INSERT INTO public.itinerary_items (trip_id, type, title, description, start_time, end_time, location, created_by, metadata) VALUES
  ('22222222-2222-2222-2222-222222222222'::UUID, 'transport', 'Flight to Tokyo', 'Lufthansa LH 714', '2025-03-15 10:30:00+00', '2025-03-16 06:45:00+09', 'Frankfurt → Haneda Airport', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{"booking_reference": "ABC123", "cost": 85000, "cost_currency": "JPY"}'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'accommodation', 'Hotel Gracery Shinjuku', 'Godzilla hotel! 5 nights', '2025-03-16 15:00:00+09', '2025-03-20 11:00:00+09', 'Shinjuku, Tokyo', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{"booking_reference": "GRACERY2025", "cost": 75000, "cost_currency": "JPY"}'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'activity', 'TeamLab Borderless', 'Digital art museum', '2025-03-17 14:00:00+09', '2025-03-17 17:00:00+09', 'Odaiba, Tokyo', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{"cost": 3200, "cost_currency": "JPY", "url": "https://borderless.teamlab.art/"}'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'sightseeing', 'Senso-ji Temple', 'Ancient Buddhist temple', '2025-03-18 09:00:00+09', '2025-03-18 11:00:00+09', 'Asakusa, Tokyo', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{}'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'dining', 'Sushi at Tsukiji', 'Fresh sushi breakfast', '2025-03-18 07:00:00+09', '2025-03-18 08:30:00+09', 'Tsukiji Market, Tokyo', '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, '{"cost": 5000, "cost_currency": "JPY"}'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'activity', 'Sumo tournament', 'Grand Sumo Tournament', '2025-03-19 16:00:00+09', '2025-03-19 18:00:00+09', 'Ryogoku Kokugikan, Tokyo', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{"cost": 8000, "cost_currency": "JPY", "booking_reference": "SUMO2025"}');

-- Kyoto (March 20-25)
INSERT INTO public.itinerary_items (trip_id, type, title, description, start_time, end_time, location, created_by, metadata) VALUES
  ('22222222-2222-2222-2222-222222222222'::UUID, 'transport', 'Shinkansen to Kyoto', 'JR Pass', '2025-03-20 09:00:00+09', '2025-03-20 11:15:00+09', 'Tokyo → Kyoto', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{"booking_reference": "JR_PASS"}'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'accommodation', 'Traditional Ryokan', 'Hiiragiya Ryokan - traditional Japanese inn', '2025-03-20 15:00:00+09', '2025-03-25 11:00:00+09', 'Nakagyo Ward, Kyoto', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{"booking_reference": "RYO2025", "cost": 120000, "cost_currency": "JPY"}'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'sightseeing', 'Fushimi Inari Shrine', 'Thousands of red torii gates', '2025-03-21 08:00:00+09', '2025-03-21 11:00:00+09', 'Fushimi Ward, Kyoto', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{}'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'sightseeing', 'Arashiyama Bamboo Grove', 'Famous bamboo forest', '2025-03-22 09:00:00+09', '2025-03-22 12:00:00+09', 'Arashiyama, Kyoto', '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, '{}'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'activity', 'Tea Ceremony', 'Traditional Japanese tea ceremony', '2025-03-23 14:00:00+09', '2025-03-23 16:00:00+09', 'Gion District, Kyoto', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{"cost": 6000, "cost_currency": "JPY", "booking_reference": "TEA2025"}'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'sightseeing', 'Kinkaku-ji (Golden Pavilion)', 'Stunning golden temple', '2025-03-24 10:00:00+09', '2025-03-24 12:00:00+09', 'Kita Ward, Kyoto', 'bed7f4f7-8849-4296-99f8-0b8eeaaf4f86'::UUID, '{"cost": 500, "cost_currency": "JPY"}');

-- Osaka & Return (March 25-April 5)
INSERT INTO public.itinerary_items (trip_id, type, title, description, start_time, end_time, location, created_by, metadata) VALUES
  ('22222222-2222-2222-2222-222222222222'::UUID, 'transport', 'Train to Osaka', 'JR Pass', '2025-03-25 14:00:00+09', '2025-03-25 14:45:00+09', 'Kyoto → Osaka', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{}'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'accommodation', 'Hotel Nikko Osaka', 'Modern hotel in Shinsaibashi', '2025-03-25 15:00:00+09', '2025-04-04 11:00:00+09', 'Shinsaibashi, Osaka', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{"booking_reference": "NIKKO2025", "cost": 95000, "cost_currency": "JPY"}'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'dining', 'Dotonbori Street Food', 'Takoyaki and okonomiyaki!', '2025-03-25 19:00:00+09', '2025-03-25 21:00:00+09', 'Dotonbori, Osaka', '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, '{}'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'activity', 'Universal Studios Japan', 'Super Nintendo World!', '2025-03-27 09:00:00+09', '2025-03-27 20:00:00+09', 'Universal City, Osaka', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{"cost": 8900, "cost_currency": "JPY", "booking_reference": "USJ2025"}'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'activity', 'Day trip to Nara', 'See the deer and Todai-ji temple', '2025-03-29 09:00:00+09', '2025-03-29 18:00:00+09', 'Nara', 'bed7f4f7-8849-4296-99f8-0b8eeaaf4f86'::UUID, '{}'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'transport', 'Flight back home', 'ANA NH 209', '2025-04-05 10:30:00+09', '2025-04-05 14:45:00+00', 'Kansai Airport → Frankfurt', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{"booking_reference": "XYZ789", "cost": 90000, "cost_currency": "JPY"}');

-- Barcelona itinerary (simpler)
INSERT INTO public.itinerary_items (trip_id, type, title, description, start_time, end_time, location, created_by, metadata) VALUES
  ('33333333-3333-3333-3333-333333333333'::UUID, 'transport', 'Flight to Barcelona', 'Vueling VY 1234', '2025-06-10 08:00:00+00', '2025-06-10 10:15:00+02', 'Frankfurt → Barcelona', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{"booking_reference": "VY123", "cost": 15000, "cost_currency": "EUR"}'),
  ('33333333-3333-3333-3333-333333333333'::UUID, 'accommodation', 'Hotel Arts Barcelona', 'Beachfront hotel', '2025-06-10 15:00:00+02', '2025-06-17 11:00:00+02', 'Port Olímpic, Barcelona', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{"booking_reference": "ARTS2025", "cost": 180000, "cost_currency": "EUR"}'),
  ('33333333-3333-3333-3333-333333333333'::UUID, 'sightseeing', 'Sagrada Familia', 'Gaudí''s masterpiece', '2025-06-11 10:00:00+02', '2025-06-11 13:00:00+02', 'Eixample, Barcelona', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{"cost": 2600, "cost_currency": "EUR", "booking_reference": "SAGRADA2025"}'),
  ('33333333-3333-3333-3333-333333333333'::UUID, 'sightseeing', 'Park Güell', 'Colorful mosaic park', '2025-06-12 09:00:00+02', '2025-06-12 11:00:00+02', 'Gràcia, Barcelona', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, '{"cost": 1000, "cost_currency": "EUR"}'),
  ('33333333-3333-3333-3333-333333333333'::UUID, 'activity', 'Beach day', 'Barceloneta Beach', '2025-06-13 12:00:00+02', '2025-06-13 18:00:00+02', 'Barceloneta, Barcelona', '6393c95c-d146-4f3f-8690-187ef4d5b4ed'::UUID, '{}');

-- ============================================================================
-- CHAT MESSAGES
-- ============================================================================

-- Paris Weekend chat
INSERT INTO public.chat_messages (trip_id, user_id, message_type, content, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111'::UUID, 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, 'user', 'Hey everyone! So excited for this trip!', NOW() - INTERVAL '26 days'),
  ('11111111-1111-1111-1111-111111111111'::UUID, '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, 'user', 'Me too! Can''t wait to see the Eiffel Tower!', NOW() - INTERVAL '26 days'),
  ('11111111-1111-1111-1111-111111111111'::UUID, '6393c95c-d146-4f3f-8690-187ef4d5b4ed'::UUID, 'user', 'I''ve booked a table at Le Comptoir for Friday night', NOW() - INTERVAL '25 days'),
  ('11111111-1111-1111-1111-111111111111'::UUID, 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, 'user', 'Perfect! What time?', NOW() - INTERVAL '25 days'),
  ('11111111-1111-1111-1111-111111111111'::UUID, '6393c95c-d146-4f3f-8690-187ef4d5b4ed'::UUID, 'user', '8 PM!', NOW() - INTERVAL '25 days');

-- Japan Adventure chat (more active)
INSERT INTO public.chat_messages (trip_id, user_id, message_type, content, created_at) VALUES
  ('22222222-2222-2222-2222-222222222222'::UUID, 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, 'user', 'Japan trip planning has begun!', NOW() - INTERVAL '10 days'),
  ('22222222-2222-2222-2222-222222222222'::UUID, '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, 'user', 'I bought the JR passes for everyone!', NOW() - INTERVAL '9 days'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'bed7f4f7-8849-4296-99f8-0b8eeaaf4f86'::UUID, 'user', 'Thanks! How much do we owe you?', NOW() - INTERVAL '9 days'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, 'user', 'Check the expenses - it''s all logged there', NOW() - INTERVAL '8 days'),
  ('22222222-2222-2222-2222-222222222222'::UUID, NULL, 'bot', 'I can help you plan your itinerary! Just let me know what activities you''re interested in.', NOW() - INTERVAL '8 days'),
  ('22222222-2222-2222-2222-222222222222'::UUID, '0B30afad-e40a-42b0-a606-983877f72f67'::UUID, 'user', 'We should definitely visit TeamLab Borderless!', NOW() - INTERVAL '7 days'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, 'user', 'Added to the itinerary!', NOW() - INTERVAL '7 days'),
  ('22222222-2222-2222-2222-222222222222'::UUID, '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, 'user', 'Don''t forget to book the sumo tournament tickets', NOW() - INTERVAL '5 days'),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, 'user', 'Already done! March 19th at 4 PM', NOW() - INTERVAL '5 days');

-- Barcelona chat
INSERT INTO public.chat_messages (trip_id, user_id, message_type, content, created_at) VALUES
  ('33333333-3333-3333-3333-333333333333'::UUID, 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, 'user', 'Barcelona here we come!', NOW() - INTERVAL '5 days'),
  ('33333333-3333-3333-3333-333333333333'::UUID, '6393c95c-d146-4f3f-8690-187ef4d5b4ed'::UUID, 'user', 'Beach and tapas, what more could we want?', NOW() - INTERVAL '4 days'),
  ('33333333-3333-3333-3333-333333333333'::UUID, '8758acbc-1dbe-4dd8-b7b4-f1dc81eab242'::UUID, 'user', 'Don''t forget Sagrada Familia!', NOW() - INTERVAL '4 days');

-- ============================================================================
-- FX RATES (Sample historical rates)
-- ============================================================================

INSERT INTO public.fx_rates (base_currency, target_currency, rate, date) VALUES
  ('EUR', 'USD', 1.08, '2024-10-15'),
  ('EUR', 'GBP', 0.86, '2024-10-15'),
  ('EUR', 'JPY', 149.50, '2024-10-15'),
  ('EUR', 'USD', 1.09, '2024-11-01'),
  ('EUR', 'JPY', 151.20, NOW()::date),
  ('USD', 'EUR', 0.92, '2024-11-01'),
  ('JPY', 'EUR', 0.0067, NOW()::date),
  ('ISK', 'EUR', 0.0065, NOW()::date);

-- ============================================================================
-- SETTLEMENTS (For Paris trip - example settled debts)
-- ============================================================================

INSERT INTO public.settlements (trip_id, from_user_id, to_user_id, amount, currency, status, settled_at, settled_by, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111'::UUID, '6393c95c-d146-4f3f-8690-187ef4d5b4ed'::UUID, 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, 2500, 'EUR', 'settled', NOW() - INTERVAL '18 days', '6393c95c-d146-4f3f-8690-187ef4d5b4ed'::UUID, NOW() - INTERVAL '20 days'),
  ('11111111-1111-1111-1111-111111111111'::UUID, '8758acbc-1dbe-4dd8-b7b4-f1dc81eab242'::UUID, '3af67dc9-7357-433c-bd94-c591b40376245'::UUID, 3200, 'EUR', 'pending', NULL, NULL, NOW() - INTERVAL '20 days');

-- ============================================================================
-- TRIP INVITES (Some pending invites for future trips)
-- ============================================================================

INSERT INTO public.trip_invites (trip_id, token, email, invited_by, role, invite_type, status, created_at) VALUES
  ('22222222-2222-2222-2222-222222222222'::UUID, 'invite_japan_sarah', 'sarah@example.com', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, 'participant', 'email', 'pending', NOW() - INTERVAL '6 days'),
  ('33333333-3333-3333-3333-333333333333'::UUID, 'invite_barcelona_link', NULL, 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, 'viewer', 'link', 'pending', NOW() - INTERVAL '4 days'),
  ('44444444-4444-4444-4444-444444444444'::UUID, 'invite_iceland_dave', 'dave@example.com', 'a439e5ca-4316-4179-94a5-a65c6f2fa175'::UUID, 'participant', 'email', 'pending', NOW() - INTERVAL '2 days');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 'Trips created:' as info, COUNT(*) as count FROM public.trips;
SELECT 'Participants added:' as info, COUNT(*) as count FROM public.trip_participants;
SELECT 'Expenses logged:' as info, COUNT(*) as count FROM public.expenses;
SELECT 'Itinerary items:' as info, COUNT(*) as count FROM public.itinerary_items;
SELECT 'Chat messages:' as info, COUNT(*) as count FROM public.chat_messages;
SELECT 'FX rates:' as info, COUNT(*) as count FROM public.fx_rates;
SELECT 'Settlements:' as info, COUNT(*) as count FROM public.settlements;
SELECT 'Invites:' as info, COUNT(*) as count FROM public.trip_invites;

-- Show trips summary
SELECT
  t.name,
  t.start_date::date,
  t.end_date::date,
  t.base_currency,
  COUNT(DISTINCT tp.user_id) as participant_count,
  COUNT(DISTINCT e.id) as expense_count,
  COUNT(DISTINCT i.id) as itinerary_count
FROM public.trips t
LEFT JOIN public.trip_participants tp ON t.id = tp.trip_id
LEFT JOIN public.expenses e ON t.id = e.trip_id
LEFT JOIN public.itinerary_items i ON t.id = i.trip_id
GROUP BY t.id, t.name, t.start_date, t.end_date, t.base_currency
ORDER BY t.start_date;
