-- ============================================================================
-- MIGRATION: Enhance Itinerary Items Schema
-- Date: 2025-02-07
-- Description: Add notes, links, is_all_day, metadata fields and participant tracking
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD NEW COLUMNS TO ITINERARY_ITEMS
-- ============================================================================

-- Add notes field for additional item details
ALTER TABLE public.itinerary_items
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add links field for bookings, confirmations, etc.
ALTER TABLE public.itinerary_items
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;

-- Add all-day flag for events without specific times
ALTER TABLE public.itinerary_items
ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT FALSE;

-- Add metadata for type-specific fields
ALTER TABLE public.itinerary_items
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment for links field structure
COMMENT ON COLUMN public.itinerary_items.links IS
'Array of link objects with structure: [{title: string, url: string}]';

-- Add comment for metadata field structure
COMMENT ON COLUMN public.itinerary_items.metadata IS
'Type-specific fields. For transport: transport_type, flight_number, departure_location, arrival_location, booking_reference. For accommodation: accommodation_type, check_in_time, check_out_time, confirmation_number. For dining: restaurant_name, cuisine_type, price_range. For activity: activity_type, duration, booking_required, meeting_point. For sightseeing: attraction_name, admission_required, opening_hours.';

-- ============================================================================
-- STEP 2: MIGRATE EXISTING DATA AND UPDATE ITEM TYPE CONSTRAINT
-- ============================================================================

-- First, drop the old constraint to allow migration
ALTER TABLE public.itinerary_items
DROP CONSTRAINT IF EXISTS itinerary_items_type_check;

-- Then migrate existing item types to new types
-- 'flight' -> 'transport'
-- 'stay' -> 'accommodation'
-- 'activity' -> 'activity' (no change)
UPDATE public.itinerary_items
SET type = CASE
  WHEN type = 'flight' THEN 'transport'
  WHEN type = 'stay' THEN 'accommodation'
  ELSE type
END
WHERE type IN ('flight', 'stay');

-- Finally, add new constraint with expanded types
ALTER TABLE public.itinerary_items
ADD CONSTRAINT itinerary_items_type_check
CHECK (type IN ('transport', 'accommodation', 'dining', 'activity', 'sightseeing', 'general'));

-- ============================================================================
-- STEP 3: CREATE ITINERARY_ITEM_PARTICIPANTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.itinerary_item_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  itinerary_item_id UUID NOT NULL REFERENCES public.itinerary_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_item_participant UNIQUE (itinerary_item_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_itinerary_item_participants_item_id
ON public.itinerary_item_participants(itinerary_item_id);

CREATE INDEX IF NOT EXISTS idx_itinerary_item_participants_user_id
ON public.itinerary_item_participants(user_id);

-- Add comment
COMMENT ON TABLE public.itinerary_item_participants IS
'Tracks which trip participants are involved in specific itinerary items. If no rows exist for an item, all trip participants are assumed to be involved.';

-- ============================================================================
-- STEP 4: ENABLE RLS ON NEW TABLE
-- ============================================================================

ALTER TABLE public.itinerary_item_participants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: CREATE RLS POLICIES FOR ITINERARY_ITEM_PARTICIPANTS
-- ============================================================================

-- Trip participants can see who is involved in items
CREATE POLICY "Trip participants can see item participants"
  ON public.itinerary_item_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.itinerary_items ii
      JOIN public.trip_participants tp ON tp.trip_id = ii.trip_id
      WHERE ii.id = itinerary_item_participants.itinerary_item_id
        AND tp.user_id = auth.uid()
    )
  );

-- Item creator and trip owner can add participants
CREATE POLICY "Item creator and trip owner can add participants"
  ON public.itinerary_item_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.itinerary_items ii
      WHERE ii.id = itinerary_item_participants.itinerary_item_id
        AND (
          ii.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = ii.trip_id AND t.owner_id = auth.uid()
          )
        )
    )
  );

-- Item creator and trip owner can remove participants
CREATE POLICY "Item creator and trip owner can remove participants"
  ON public.itinerary_item_participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.itinerary_items ii
      WHERE ii.id = itinerary_item_participants.itinerary_item_id
        AND (
          ii.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = ii.trip_id AND t.owner_id = auth.uid()
          )
        )
    )
  );

-- ============================================================================
-- STEP 6: UPDATE ITINERARY_ITEMS RLS POLICIES
-- ============================================================================

-- Drop old update policy
DROP POLICY IF EXISTS "Users can update own itinerary items" ON public.itinerary_items;

-- Create new update policy that includes involved participants
CREATE POLICY "Users can update itinerary items they created or are involved in"
  ON public.itinerary_items
  FOR UPDATE
  USING (
    -- User is the creator
    auth.uid() = created_by
    -- OR user is involved in the item (has entry in participants table)
    OR EXISTS (
      SELECT 1 FROM public.itinerary_item_participants
      WHERE itinerary_item_participants.itinerary_item_id = itinerary_items.id
        AND itinerary_item_participants.user_id = auth.uid()
    )
    -- OR user is the trip owner
    OR EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = itinerary_items.trip_id
        AND trips.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 7: ADD MIGRATION METADATA
-- ============================================================================

-- Track migration application
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'migration_history'
  ) THEN
    CREATE TABLE public.migration_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      migration_name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

INSERT INTO public.migration_history (migration_name)
VALUES ('20250207000001_enhance_itinerary_items')
ON CONFLICT (migration_name) DO NOTHING;
