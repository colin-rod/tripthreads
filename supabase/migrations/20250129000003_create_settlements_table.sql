-- Create settlements table for tracking optimized settlement suggestions and their payment status
-- This table stores both pending and completed settlements between trip participants

CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0), -- In minor units (cents)
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
  settled_at TIMESTAMPTZ,
  settled_by UUID REFERENCES public.users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT different_users CHECK (from_user_id != to_user_id),
  CONSTRAINT settled_fields CHECK (
    (status = 'pending' AND settled_at IS NULL AND settled_by IS NULL) OR
    (status = 'settled' AND settled_at IS NOT NULL AND settled_by IS NOT NULL)
  )
);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_settlements_trip_id ON public.settlements(trip_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON public.settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_from_user ON public.settlements(from_user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_to_user ON public.settlements(to_user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_trip_status ON public.settlements(trip_id, status);

-- Add updated_at trigger
CREATE TRIGGER update_settlements_updated_at
  BEFORE UPDATE ON public.settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Row-Level Security (RLS) Policies

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Users can view settlements for trips they are participants in
CREATE POLICY "Users can view settlements for their trips"
  ON public.settlements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants tp
      WHERE tp.trip_id = settlements.trip_id
        AND tp.user_id = auth.uid()
    )
  );

-- Users can create settlements (will be done programmatically via settlement calculation)
CREATE POLICY "Trip participants can create settlements"
  ON public.settlements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_participants tp
      WHERE tp.trip_id = settlements.trip_id
        AND tp.user_id = auth.uid()
    )
  );

-- Both parties (from_user or to_user) can mark a settlement as paid
CREATE POLICY "Settlement parties can update status"
  ON public.settlements
  FOR UPDATE
  USING (
    auth.uid() = from_user_id OR auth.uid() = to_user_id
  )
  WITH CHECK (
    auth.uid() = from_user_id OR auth.uid() = to_user_id
  );

-- Only trip owners can delete settlements
CREATE POLICY "Trip owners can delete settlements"
  ON public.settlements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = settlements.trip_id
        AND t.owner_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE public.settlements IS 'Stores optimized settlement suggestions between trip participants, tracking payment status and history';
COMMENT ON COLUMN public.settlements.amount IS 'Settlement amount in minor currency units (cents). Always positive.';
COMMENT ON COLUMN public.settlements.status IS 'Payment status: pending (suggested but not paid) or settled (marked as paid by either party)';
COMMENT ON COLUMN public.settlements.settled_at IS 'Timestamp when settlement was marked as paid';
COMMENT ON COLUMN public.settlements.settled_by IS 'User who marked the settlement as paid (either from_user or to_user)';
COMMENT ON COLUMN public.settlements.note IS 'Optional note added when marking as paid (e.g., "Paid via Venmo")';
