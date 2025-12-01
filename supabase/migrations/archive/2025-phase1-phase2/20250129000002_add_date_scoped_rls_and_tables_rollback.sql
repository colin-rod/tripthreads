-- ============================================================================
-- Rollback Migration: Remove date-scoped RLS and tables
-- Description: Rolls back the date-scoped RLS implementation
-- Author: Claude Code
-- Date: 2025-01-29
-- ============================================================================

-- Drop RLS policies (in reverse order)
DROP POLICY IF EXISTS "Users can delete own media" ON public.media_files;
DROP POLICY IF EXISTS "Users can update own media" ON public.media_files;
DROP POLICY IF EXISTS "Participants can upload media" ON public.media_files;
DROP POLICY IF EXISTS "Trip participants can read all media" ON public.media_files;

DROP POLICY IF EXISTS "Expense creator can delete participants" ON public.expense_participants;
DROP POLICY IF EXISTS "Expense creator can update participants" ON public.expense_participants;
DROP POLICY IF EXISTS "Expense creator can add participants" ON public.expense_participants;
DROP POLICY IF EXISTS "Users can read expense participants" ON public.expense_participants;

DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Participants can create expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can read expenses based on join date" ON public.expenses;

DROP POLICY IF EXISTS "Users can delete own itinerary items" ON public.itinerary_items;
DROP POLICY IF EXISTS "Users can update own itinerary items" ON public.itinerary_items;
DROP POLICY IF EXISTS "Participants can create itinerary items" ON public.itinerary_items;
DROP POLICY IF EXISTS "Users can read itinerary items based on join date" ON public.itinerary_items;

-- Drop triggers
DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
DROP TRIGGER IF EXISTS update_itinerary_items_updated_at ON public.itinerary_items;

-- Drop functions
DROP FUNCTION IF EXISTS public.can_user_see_item(TIMESTAMPTZ, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_trip_join_date(UUID, UUID);

-- Drop tables (in reverse order of creation)
DROP TABLE IF EXISTS public.media_files CASCADE;
DROP TABLE IF EXISTS public.expense_participants CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.itinerary_items CASCADE;
