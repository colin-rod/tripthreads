-- ============================================================================
-- ROLLBACK MIGRATION: Enhance Itinerary Items Schema
-- Date: 2025-02-07
-- Description: Rollback changes from 20250207000001_enhance_itinerary_items.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP NEW RLS POLICIES
-- ============================================================================

-- Drop new update policy
DROP POLICY IF EXISTS "Users can update itinerary items they created or are involved in"
ON public.itinerary_items;

-- Drop itinerary_item_participants policies
DROP POLICY IF EXISTS "Trip participants can see item participants"
ON public.itinerary_item_participants;

DROP POLICY IF EXISTS "Item creator and trip owner can add participants"
ON public.itinerary_item_participants;

DROP POLICY IF EXISTS "Item creator and trip owner can remove participants"
ON public.itinerary_item_participants;

-- ============================================================================
-- STEP 2: DROP ITINERARY_ITEM_PARTICIPANTS TABLE
-- ============================================================================

DROP TABLE IF EXISTS public.itinerary_item_participants CASCADE;

-- ============================================================================
-- STEP 3: RESTORE OLD UPDATE POLICY
-- ============================================================================

-- Restore original update policy (creator only)
CREATE POLICY "Users can update own itinerary items"
  ON public.itinerary_items
  FOR UPDATE
  USING (auth.uid() = created_by);

-- ============================================================================
-- STEP 4: RESTORE OLD TYPE CONSTRAINT AND MIGRATE DATA BACK
-- ============================================================================

-- First, migrate data back to old types
-- 'transport' -> 'flight'
-- 'accommodation' -> 'stay'
-- 'dining' -> 'activity' (no perfect mapping, so default to activity)
-- 'sightseeing' -> 'activity' (no perfect mapping, so default to activity)
-- 'general' -> 'activity' (no perfect mapping, so default to activity)
UPDATE public.itinerary_items
SET type = CASE
  WHEN type = 'transport' THEN 'flight'
  WHEN type = 'accommodation' THEN 'stay'
  WHEN type IN ('dining', 'sightseeing', 'general') THEN 'activity'
  ELSE type
END
WHERE type IN ('transport', 'accommodation', 'dining', 'sightseeing', 'general');

-- Drop new constraint
ALTER TABLE public.itinerary_items
DROP CONSTRAINT IF EXISTS itinerary_items_type_check;

-- Restore old constraint with original types
ALTER TABLE public.itinerary_items
ADD CONSTRAINT itinerary_items_type_check
CHECK (type IN ('flight', 'stay', 'activity'));

-- ============================================================================
-- STEP 5: DROP NEW COLUMNS
-- ============================================================================

ALTER TABLE public.itinerary_items
DROP COLUMN IF EXISTS metadata;

ALTER TABLE public.itinerary_items
DROP COLUMN IF EXISTS is_all_day;

ALTER TABLE public.itinerary_items
DROP COLUMN IF EXISTS links;

ALTER TABLE public.itinerary_items
DROP COLUMN IF EXISTS notes;

-- ============================================================================
-- STEP 6: REMOVE MIGRATION METADATA
-- ============================================================================

DELETE FROM public.migration_history
WHERE migration_name = '20250207000001_enhance_itinerary_items';
