-- Add missing INSERT policy for trip_participants table
-- This allows trip owners to add participants AND allows the system trigger to bypass RLS
-- when creating the owner participant entry

DO $$
BEGIN
  -- Drop existing policy if it exists (idempotent)
  DROP POLICY IF EXISTS "Trip owners can add participants" ON public.trip_participants;

  -- Create INSERT policy with trigger bypass
  CREATE POLICY "Trip owners can add participants"
    ON public.trip_participants
    FOR INSERT
    TO public
    WITH CHECK (
      -- Allow if user is trip owner
      public.is_trip_owner(trip_id, auth.uid())
      -- OR if this is the system trigger creating owner participant
      OR current_setting('app.trigger_context', true) = 'create_trip_owner_participant'
    );

  RAISE NOTICE 'Policy "Trip owners can add participants" created successfully';
END $$;
