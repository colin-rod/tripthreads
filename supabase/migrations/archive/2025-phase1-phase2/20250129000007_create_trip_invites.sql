-- ============================================================================
-- Migration: Create trip invites system
-- Description: Add trip_invites table for shareable links and email invitations
-- Author: Claude Code
-- Date: 2025-01-29
-- Related: CRO-706 - Invite via link & email (pending participant records)
-- ============================================================================

-- ============================================================================
-- TRIP INVITES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trip_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT, -- Nullable: set for email invites, null for shareable links
  invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('participant', 'viewer')),
  invite_type TEXT NOT NULL CHECK (invite_type IN ('link', 'email')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT email_required_for_email_invites
    CHECK (invite_type = 'link' OR (invite_type = 'email' AND email IS NOT NULL))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_invites_token ON public.trip_invites(token);
CREATE INDEX IF NOT EXISTS idx_trip_invites_trip_id ON public.trip_invites(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_invites_email ON public.trip_invites(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trip_invites_status ON public.trip_invites(status) WHERE status = 'pending';

-- ============================================================================
-- RLS POLICIES FOR TRIP INVITES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;

-- Trip owners can create invites for their trips
CREATE POLICY "Trip owners can create invites"
  ON public.trip_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_invites.trip_id
      AND trips.owner_id = auth.uid()
    )
  );

-- Trip owners can view all invites for their trips
CREATE POLICY "Trip owners can view trip invites"
  ON public.trip_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_invites.trip_id
      AND trips.owner_id = auth.uid()
    )
  );

-- Anyone can view invite by valid token (for acceptance page)
CREATE POLICY "Anyone can view invite by token"
  ON public.trip_invites FOR SELECT
  USING (
    status = 'pending'
  );

-- Trip owners can update (revoke) invites
CREATE POLICY "Trip owners can update invites"
  ON public.trip_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_invites.trip_id
      AND trips.owner_id = auth.uid()
    )
  );

-- Trip owners can delete invites
CREATE POLICY "Trip owners can delete invites"
  ON public.trip_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_invites.trip_id
      AND trips.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Generate a cryptographically secure invite token
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_token TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Generate token until we get a unique one
  LOOP
    -- Generate 32-character hex token
    v_token := encode(gen_random_bytes(16), 'hex');

    -- Check if token already exists
    SELECT EXISTS(
      SELECT 1 FROM public.trip_invites WHERE token = v_token
    ) INTO v_exists;

    -- Exit loop if token is unique
    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_token;
END;
$$;

COMMENT ON FUNCTION public.generate_invite_token IS
  'Generate a cryptographically secure unique invite token';

-- Get invite details with trip information for acceptance page
CREATE OR REPLACE FUNCTION public.get_invite_with_trip_details(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'invite', json_build_object(
      'id', ti.id,
      'token', ti.token,
      'role', ti.role,
      'invite_type', ti.invite_type,
      'status', ti.status,
      'created_at', ti.created_at
    ),
    'trip', json_build_object(
      'id', t.id,
      'name', t.name,
      'start_date', t.start_date,
      'end_date', t.end_date,
      'cover_image_url', t.cover_image_url,
      'description', t.description
    ),
    'inviter', json_build_object(
      'id', u.id,
      'full_name', u.full_name,
      'avatar_url', u.avatar_url
    )
  ) INTO v_result
  FROM public.trip_invites ti
  JOIN public.trips t ON t.id = ti.trip_id
  JOIN public.users u ON u.id = ti.invited_by
  WHERE ti.token = p_token
  AND ti.status = 'pending';

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_invite_with_trip_details IS
  'Retrieve invite with associated trip and inviter details for acceptance page';

-- ============================================================================
-- ABUSE PREVENTION: Rate limiting trigger
-- ============================================================================

-- Track daily invite creation per trip
CREATE TABLE IF NOT EXISTS public.invite_rate_limits (
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  invite_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (trip_id, date)
);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_invite_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
  v_max_per_day INTEGER := 100; -- Max 100 invites per trip per day
BEGIN
  -- Get current count for today
  SELECT invite_count INTO v_count
  FROM public.invite_rate_limits
  WHERE trip_id = NEW.trip_id
  AND date = CURRENT_DATE;

  -- If no record exists, create one
  IF v_count IS NULL THEN
    INSERT INTO public.invite_rate_limits (trip_id, date, invite_count)
    VALUES (NEW.trip_id, CURRENT_DATE, 1);
    RETURN NEW;
  END IF;

  -- Check if limit exceeded
  IF v_count >= v_max_per_day THEN
    RAISE EXCEPTION 'Daily invite limit exceeded for this trip (max: %)', v_max_per_day;
  END IF;

  -- Increment count
  UPDATE public.invite_rate_limits
  SET invite_count = invite_count + 1
  WHERE trip_id = NEW.trip_id
  AND date = CURRENT_DATE;

  RETURN NEW;
END;
$$;

-- Trigger to enforce rate limiting
CREATE TRIGGER enforce_invite_rate_limit
  BEFORE INSERT ON public.trip_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.check_invite_rate_limit();

COMMENT ON TRIGGER enforce_invite_rate_limit ON public.trip_invites IS
  'Enforce daily invite creation rate limit per trip (100/day)';
