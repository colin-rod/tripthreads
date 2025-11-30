-- Rollback Migration: Remove account deletion support
-- Description: Reverts changes from 20251124000002_add_account_deletion_support.sql
-- Date: 2025-11-24

-- ============================================================================
-- STEP 1: DROP FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_owned_trips_for_deletion(UUID);
DROP FUNCTION IF EXISTS public.anonymize_user_account(UUID, TEXT);

-- ============================================================================
-- STEP 2: RESTORE ORIGINAL RLS POLICIES
-- ============================================================================

-- Drop policies with deleted user filtering
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read participants of their trips" ON public.trip_participants;

-- Recreate original policies (without deleted user filtering)
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

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

-- ============================================================================
-- STEP 3: DROP INDEXES
-- ============================================================================

DROP INDEX IF EXISTS public.idx_profiles_is_deleted;
DROP INDEX IF EXISTS public.idx_profiles_deleted_at;

-- ============================================================================
-- STEP 4: REMOVE COLUMNS
-- ============================================================================

-- Note: Only drop columns if no data exists, otherwise keep for safety
-- In production, you may want to keep these columns and just deprecate them

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS is_deleted;

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS deleted_at;
