-- Migration: Create users, trips, and trip_participants tables
-- Description: Initial database schema for TripThreads MVP
-- Date: 2025-01-29

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 1: CREATE ALL TABLES (without RLS policies that reference other tables)
-- ============================================================================

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Note: Supabase Auth already creates an auth.users table
-- This is a public.users table that extends auth.users with app-specific fields

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  plan_expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_plan ON public.users(plan);

-- ============================================================================
-- TRIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Validation: end_date must be after start_date
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Indexes for faster lookups
CREATE INDEX idx_trips_owner_id ON public.trips(owner_id);
CREATE INDEX idx_trips_start_date ON public.trips(start_date);
CREATE INDEX idx_trips_created_at ON public.trips(created_at);

-- ============================================================================
-- TRIP_PARTICIPANTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trip_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'participant', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique user per trip
  CONSTRAINT unique_trip_user UNIQUE (trip_id, user_id)
);

-- Indexes for faster lookups
CREATE INDEX idx_trip_participants_trip_id ON public.trip_participants(trip_id);
CREATE INDEX idx_trip_participants_user_id ON public.trip_participants(user_id);
CREATE INDEX idx_trip_participants_role ON public.trip_participants(role);

-- ============================================================================
-- STEP 2: CREATE FUNCTIONS (before triggers)
-- ============================================================================

-- Function to automatically create trip participant entry for trip owner
CREATE OR REPLACE FUNCTION public.create_trip_owner_participant()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: CREATE TRIGGERS
-- ============================================================================

-- Trigger to auto-create owner participant
CREATE TRIGGER on_trip_created
  AFTER INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trip_owner_participant();

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 4: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_participants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: CREATE RLS POLICIES (now all tables exist)
-- ============================================================================

-- ============================================================================
-- USERS TABLE RLS POLICIES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- TRIPS TABLE RLS POLICIES
-- ============================================================================

-- Users can read trips they're participants in
CREATE POLICY "Users can read trips they participate in"
  ON public.trips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants
      WHERE trip_participants.trip_id = trips.id
        AND trip_participants.user_id = auth.uid()
    )
  );

-- Users can create trips (they become the owner)
CREATE POLICY "Users can create trips"
  ON public.trips
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Users can update trips they own
CREATE POLICY "Users can update own trips"
  ON public.trips
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Users can delete trips they own
CREATE POLICY "Users can delete own trips"
  ON public.trips
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- TRIP_PARTICIPANTS TABLE RLS POLICIES
-- ============================================================================

-- Users can read participants of trips they're in
CREATE POLICY "Users can read participants of their trips"
  ON public.trip_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants AS tp
      WHERE tp.trip_id = trip_participants.trip_id
        AND tp.user_id = auth.uid()
    )
  );

-- Trip owners can add participants
CREATE POLICY "Trip owners can add participants"
  ON public.trip_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_participants.trip_id
        AND trips.owner_id = auth.uid()
    )
  );

-- Trip owners can update participant roles
CREATE POLICY "Trip owners can update participant roles"
  ON public.trip_participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_participants.trip_id
        AND trips.owner_id = auth.uid()
    )
  );

-- Trip owners can remove participants (except themselves)
CREATE POLICY "Trip owners can remove participants"
  ON public.trip_participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_participants.trip_id
        AND trips.owner_id = auth.uid()
    )
    AND trip_participants.user_id != auth.uid()
  );

-- ============================================================================
-- STEP 6: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.users IS 'User profiles extending auth.users';
COMMENT ON TABLE public.trips IS 'Trip entities with basic metadata';
COMMENT ON TABLE public.trip_participants IS 'Many-to-many relationship between users and trips with roles';

COMMENT ON COLUMN public.users.plan IS 'Subscription plan: free or pro';
COMMENT ON COLUMN public.users.plan_expires_at IS 'When the pro plan expires (null for free plan)';
COMMENT ON COLUMN public.users.stripe_customer_id IS 'Stripe customer ID for billing';

COMMENT ON COLUMN public.trips.start_date IS 'Trip start date (ISO 8601)';
COMMENT ON COLUMN public.trips.end_date IS 'Trip end date (ISO 8601)';
COMMENT ON COLUMN public.trips.cover_image_url IS 'URL to cover image in Supabase Storage';

COMMENT ON COLUMN public.trip_participants.role IS 'User role: owner, participant, or viewer';
COMMENT ON COLUMN public.trip_participants.joined_at IS 'When user joined trip (for partial joiners)';
COMMENT ON COLUMN public.trip_participants.invited_by IS 'User who invited this participant';
