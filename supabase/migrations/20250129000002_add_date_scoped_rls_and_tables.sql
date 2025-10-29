-- ============================================================================
-- Migration: Add date-scoped RLS and remaining tables
-- Description: Implements role-based visibility with date scoping for partial joiners
-- Author: Claude Code
-- Date: 2025-01-29
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE REMAINING TABLES
-- ============================================================================

-- Itinerary Items Table
CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('flight', 'stay', 'activity')),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time IS NULL OR end_time >= start_time)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_items_trip_id ON public.itinerary_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_start_time ON public.itinerary_items(start_time);

-- Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0), -- Stored as cents/minor units
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (length(currency) = 3),
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('food', 'transport', 'accommodation', 'activity', 'other')),
  payer_id UUID NOT NULL REFERENCES public.users(id),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  receipt_url TEXT,
  fx_rate DECIMAL(10, 6), -- FX rate snapshot to trip base currency
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payer_id ON public.expenses(payer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

-- Expense Participants Table (for split tracking)
CREATE TABLE IF NOT EXISTS public.expense_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  share_amount INTEGER NOT NULL CHECK (share_amount >= 0), -- Cents/minor units
  share_type TEXT NOT NULL DEFAULT 'equal' CHECK (share_type IN ('equal', 'percentage', 'amount')),
  share_value DECIMAL(10, 2), -- Percentage or custom amount
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_expense_user UNIQUE (expense_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_participants_expense_id ON public.expense_participants(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_participants_user_id ON public.expense_participants(user_id);

-- Media Files Table
CREATE TABLE IF NOT EXISTS public.media_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  type TEXT NOT NULL CHECK (type IN ('photo', 'video')),
  url TEXT NOT NULL, -- Supabase Storage URL
  thumbnail_url TEXT,
  caption TEXT,
  date_taken TIMESTAMPTZ NOT NULL, -- Auto-tagged to day
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_files_trip_id ON public.media_files(trip_id);
CREATE INDEX IF NOT EXISTS idx_media_files_user_id ON public.media_files(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_date_taken ON public.media_files(date_taken);

-- ============================================================================
-- STEP 2: CREATE HELPER FUNCTIONS FOR DATE-SCOPED ACCESS
-- ============================================================================

-- Function to check if user is a trip participant and get their join date
CREATE OR REPLACE FUNCTION public.get_user_trip_join_date(p_trip_id UUID, p_user_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT joined_at
  FROM public.trip_participants
  WHERE trip_id = p_trip_id
    AND user_id = p_user_id
  LIMIT 1;
$$;

-- Function to check if user can see item based on join date
CREATE OR REPLACE FUNCTION public.can_user_see_item(p_item_date TIMESTAMPTZ, p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    CASE
      -- Owners and participants with 'owner' role see everything
      WHEN EXISTS (
        SELECT 1 FROM public.trips
        WHERE id = p_trip_id AND owner_id = p_user_id
      ) THEN true
      -- Viewers see everything (read-only)
      WHEN EXISTS (
        SELECT 1 FROM public.trip_participants
        WHERE trip_id = p_trip_id
          AND user_id = p_user_id
          AND role = 'viewer'
      ) THEN true
      -- Participants see items from their join date forward
      WHEN EXISTS (
        SELECT 1 FROM public.trip_participants
        WHERE trip_id = p_trip_id
          AND user_id = p_user_id
          AND role = 'participant'
          AND p_item_date >= joined_at
      ) THEN true
      ELSE false
    END;
$$;

-- ============================================================================
-- STEP 3: CREATE UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================================================

CREATE TRIGGER update_itinerary_items_updated_at
  BEFORE UPDATE ON public.itinerary_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 4: ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: CREATE DATE-SCOPED RLS POLICIES
-- ============================================================================

-- ============================================================================
-- ITINERARY_ITEMS TABLE RLS POLICIES
-- ============================================================================

-- Users can read itinerary items based on their join date
CREATE POLICY "Users can read itinerary items based on join date"
  ON public.itinerary_items
  FOR SELECT
  USING (
    public.can_user_see_item(start_time, trip_id, auth.uid())
  );

-- Participants and owners can create itinerary items
CREATE POLICY "Participants can create itinerary items"
  ON public.itinerary_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_participants
      WHERE trip_participants.trip_id = itinerary_items.trip_id
        AND trip_participants.user_id = auth.uid()
        AND trip_participants.role IN ('owner', 'participant')
    )
    AND auth.uid() = created_by
  );

-- Users can update their own itinerary items
CREATE POLICY "Users can update own itinerary items"
  ON public.itinerary_items
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Users can delete their own itinerary items OR owners can delete any
CREATE POLICY "Users can delete own itinerary items"
  ON public.itinerary_items
  FOR DELETE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = itinerary_items.trip_id
        AND trips.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- EXPENSES TABLE RLS POLICIES
-- ============================================================================

-- Participants and owners see expenses based on join date
-- Viewers do NOT see expenses (privacy)
CREATE POLICY "Users can read expenses based on join date"
  ON public.expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants
      WHERE trip_participants.trip_id = expenses.trip_id
        AND trip_participants.user_id = auth.uid()
        AND trip_participants.role IN ('owner', 'participant')
        AND expenses.date >= trip_participants.joined_at
    )
  );

-- Participants and owners can create expenses
CREATE POLICY "Participants can create expenses"
  ON public.expenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_participants
      WHERE trip_participants.trip_id = expenses.trip_id
        AND trip_participants.user_id = auth.uid()
        AND trip_participants.role IN ('owner', 'participant')
    )
    AND auth.uid() = created_by
  );

-- Users can update their own expenses
CREATE POLICY "Users can update own expenses"
  ON public.expenses
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Users can delete their own expenses OR owners can delete any
CREATE POLICY "Users can delete own expenses"
  ON public.expenses
  FOR DELETE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = expenses.trip_id
        AND trips.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- EXPENSE_PARTICIPANTS TABLE RLS POLICIES
-- ============================================================================

-- Users can read expense participants if they can see the expense
CREATE POLICY "Users can read expense participants"
  ON public.expense_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE expenses.id = expense_participants.expense_id
        AND EXISTS (
          SELECT 1 FROM public.trip_participants
          WHERE trip_participants.trip_id = expenses.trip_id
            AND trip_participants.user_id = auth.uid()
            AND trip_participants.role IN ('owner', 'participant')
            AND expenses.date >= trip_participants.joined_at
        )
    )
  );

-- Expense creator can add participants
CREATE POLICY "Expense creator can add participants"
  ON public.expense_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE expenses.id = expense_participants.expense_id
        AND expenses.created_by = auth.uid()
    )
  );

-- Expense creator can update participants
CREATE POLICY "Expense creator can update participants"
  ON public.expense_participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE expenses.id = expense_participants.expense_id
        AND expenses.created_by = auth.uid()
    )
  );

-- Expense creator can delete participants
CREATE POLICY "Expense creator can delete participants"
  ON public.expense_participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE expenses.id = expense_participants.expense_id
        AND expenses.created_by = auth.uid()
    )
  );

-- ============================================================================
-- MEDIA_FILES TABLE RLS POLICIES
-- ============================================================================

-- All trip participants see all media (no date scoping for photos)
-- Viewers can see media (read-only)
CREATE POLICY "Trip participants can read all media"
  ON public.media_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants
      WHERE trip_participants.trip_id = media_files.trip_id
        AND trip_participants.user_id = auth.uid()
    )
  );

-- Participants and owners can upload media
CREATE POLICY "Participants can upload media"
  ON public.media_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_participants
      WHERE trip_participants.trip_id = media_files.trip_id
        AND trip_participants.user_id = auth.uid()
        AND trip_participants.role IN ('owner', 'participant')
    )
    AND auth.uid() = user_id
  );

-- Users can update their own media (caption)
CREATE POLICY "Users can update own media"
  ON public.media_files
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own media OR owners can delete any
CREATE POLICY "Users can delete own media"
  ON public.media_files
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = media_files.trip_id
        AND trips.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 6: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.itinerary_items IS 'Trip itinerary items (flights, stays, activities) with date-scoped visibility';
COMMENT ON TABLE public.expenses IS 'Trip expenses with multi-currency support and date-scoped visibility';
COMMENT ON TABLE public.expense_participants IS 'Expense split tracking between trip participants';
COMMENT ON TABLE public.media_files IS 'Trip photos and videos with date tagging';

COMMENT ON FUNCTION public.get_user_trip_join_date IS 'Returns the join date for a user in a trip, used for date-scoped RLS';
COMMENT ON FUNCTION public.can_user_see_item IS 'Checks if a user can see an item based on their role and join date';

COMMENT ON COLUMN public.itinerary_items.start_time IS 'Start time of the itinerary item (used for date scoping)';
COMMENT ON COLUMN public.expenses.date IS 'Date of the expense (used for date scoping)';
COMMENT ON COLUMN public.expenses.amount IS 'Amount in cents/minor units to avoid floating point issues';
COMMENT ON COLUMN public.expense_participants.share_amount IS 'User share in cents/minor units';
COMMENT ON COLUMN public.media_files.date_taken IS 'Date photo/video was taken (auto-tagged to trip day)';
