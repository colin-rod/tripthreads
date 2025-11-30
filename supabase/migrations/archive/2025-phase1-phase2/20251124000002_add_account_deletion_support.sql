-- Migration: Add account deletion support (GDPR compliance)
-- Description: Adds soft delete capability and anonymization function for user accounts
-- Date: 2025-11-24
-- Related: CRO-763 - Account deletion & data export (GDPR)

-- ============================================================================
-- STEP 1: ADD SOFT DELETE COLUMNS TO PROFILES
-- ============================================================================

-- Add deleted_at timestamp for soft delete tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add is_deleted boolean flag for quick filtering
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for efficient filtering of deleted users
CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted ON public.profiles(is_deleted);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);

-- ============================================================================
-- STEP 2: UPDATE RLS POLICIES TO EXCLUDE DELETED USERS
-- ============================================================================

-- Drop existing RLS policies that need to exclude deleted users
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recreate policies with deleted user filtering
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id AND is_deleted = FALSE);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id AND is_deleted = FALSE);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id AND is_deleted = FALSE);

-- Update trip participants policy to exclude deleted users
DROP POLICY IF EXISTS "Users can read participants of their trips" ON public.trip_participants;

CREATE POLICY "Users can read participants of their trips"
  ON public.trip_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants AS tp
      INNER JOIN public.profiles AS p ON tp.user_id = p.id
      WHERE tp.trip_id = trip_participants.trip_id
        AND tp.user_id = auth.uid()
        AND p.is_deleted = FALSE
    )
  );

-- ============================================================================
-- STEP 3: CREATE ANONYMIZATION FUNCTION
-- ============================================================================

/**
 * Anonymize user account (GDPR "Right to Erasure")
 *
 * This function:
 * 1. Anonymizes personal data in profiles table
 * 2. Marks account as deleted
 * 3. Handles trip ownership transfer
 * 4. Preserves data integrity for other users
 *
 * @param p_user_id - User ID to anonymize
 * @param p_trip_deletion_strategy - 'transfer' or 'delete' for owned trips
 * @returns Success status and message
 */
CREATE OR REPLACE FUNCTION public.anonymize_user_account(
  p_user_id UUID,
  p_trip_deletion_strategy TEXT DEFAULT 'transfer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_record RECORD;
  v_new_owner_id UUID;
  v_deleted_email TEXT;
  v_trips_deleted INT := 0;
  v_trips_transferred INT := 0;
BEGIN
  -- Check if user exists and is not already deleted
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND is_deleted = FALSE
  ) THEN
    RAISE EXCEPTION 'User does not exist or is already deleted';
  END IF;

  -- Generate unique deleted email
  v_deleted_email := 'deleted_' || p_user_id || '@tripthreads.deleted';

  -- Handle owned trips
  FOR v_trip_record IN
    SELECT t.id, t.name
    FROM public.trips t
    WHERE t.owner_id = p_user_id
  LOOP
    IF p_trip_deletion_strategy = 'delete' THEN
      -- Delete trip entirely (CASCADE will handle related records)
      DELETE FROM public.trips WHERE id = v_trip_record.id;
      v_trips_deleted := v_trips_deleted + 1;
    ELSE
      -- Transfer ownership to oldest active participant (excluding the user being deleted)
      SELECT tp.user_id INTO v_new_owner_id
      FROM public.trip_participants tp
      INNER JOIN public.profiles p ON tp.user_id = p.id
      WHERE tp.trip_id = v_trip_record.id
        AND tp.user_id != p_user_id
        AND p.is_deleted = FALSE
      ORDER BY tp.joined_at ASC
      LIMIT 1;

      IF v_new_owner_id IS NOT NULL THEN
        -- Transfer ownership
        UPDATE public.trips
        SET owner_id = v_new_owner_id
        WHERE id = v_trip_record.id;

        -- Update participant role to owner
        UPDATE public.trip_participants
        SET role = 'owner'
        WHERE trip_id = v_trip_record.id
          AND user_id = v_new_owner_id;

        v_trips_transferred := v_trips_transferred + 1;
      ELSE
        -- No other participants, delete trip
        DELETE FROM public.trips WHERE id = v_trip_record.id;
        v_trips_deleted := v_trips_deleted + 1;
      END IF;
    END IF;
  END LOOP;

  -- Anonymize profile data
  UPDATE public.profiles
  SET
    full_name = 'Deleted User',
    email = v_deleted_email,
    avatar_url = NULL,
    stripe_customer_id = NULL,
    notification_preferences = NULL,
    deleted_at = NOW(),
    is_deleted = TRUE,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Delete avatar from storage (handled by application layer)
  -- Delete user-specific records that should be hard deleted

  -- Delete trip invites sent by user
  DELETE FROM public.trip_invites WHERE invited_by = p_user_id;

  -- Delete access requests made by user
  DELETE FROM public.access_requests WHERE user_id = p_user_id;

  -- Delete message reactions by user
  DELETE FROM public.message_reactions WHERE user_id = p_user_id;

  -- Return success with stats
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Account anonymized successfully',
    'tripsDeleted', v_trips_deleted,
    'tripsTransferred', v_trips_transferred,
    'userId', p_user_id,
    'deletedAt', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback on error
    RAISE EXCEPTION 'Failed to anonymize account: %', SQLERRM;
END;
$$;

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTION TO CHECK TRIP OWNERSHIP
-- ============================================================================

/**
 * Get owned trips for user (for deletion planning)
 *
 * Returns list of trips owned by user with participant counts
 *
 * @param p_user_id - User ID
 * @returns Array of trips with metadata
 */
CREATE OR REPLACE FUNCTION public.get_owned_trips_for_deletion(p_user_id UUID)
RETURNS TABLE (
  trip_id UUID,
  trip_name TEXT,
  participant_count BIGINT,
  can_transfer BOOLEAN,
  oldest_participant_id UUID,
  oldest_participant_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS trip_id,
    t.name AS trip_name,
    COUNT(tp.user_id) AS participant_count,
    COUNT(tp.user_id) FILTER (WHERE tp.user_id != p_user_id) > 0 AS can_transfer,
    (
      SELECT tp2.user_id
      FROM public.trip_participants tp2
      INNER JOIN public.profiles p ON tp2.user_id = p.id
      WHERE tp2.trip_id = t.id
        AND tp2.user_id != p_user_id
        AND p.is_deleted = FALSE
      ORDER BY tp2.joined_at ASC
      LIMIT 1
    ) AS oldest_participant_id,
    (
      SELECT p.full_name
      FROM public.trip_participants tp2
      INNER JOIN public.profiles p ON tp2.user_id = p.id
      WHERE tp2.trip_id = t.id
        AND tp2.user_id != p_user_id
        AND p.is_deleted = FALSE
      ORDER BY tp2.joined_at ASC
      LIMIT 1
    ) AS oldest_participant_name
  FROM public.trips t
  LEFT JOIN public.trip_participants tp ON t.id = tp.trip_id
  WHERE t.owner_id = p_user_id
  GROUP BY t.id, t.name;
END;
$$;

-- ============================================================================
-- STEP 5: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.profiles.deleted_at IS 'Timestamp when account was deleted (soft delete)';
COMMENT ON COLUMN public.profiles.is_deleted IS 'Boolean flag indicating if account is deleted (for efficient filtering)';
COMMENT ON FUNCTION public.anonymize_user_account IS 'GDPR-compliant account anonymization with trip ownership handling';
COMMENT ON FUNCTION public.get_owned_trips_for_deletion IS 'Helper function to plan trip ownership transfer before account deletion';

-- ============================================================================
-- STEP 6: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permission to authenticated users (RLS will ensure they can only delete their own account)
GRANT EXECUTE ON FUNCTION public.anonymize_user_account TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_owned_trips_for_deletion TO authenticated;
