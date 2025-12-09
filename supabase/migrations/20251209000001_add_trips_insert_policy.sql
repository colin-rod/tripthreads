-- Add missing INSERT policy for trips table
-- This allows authenticated users to create trips they own

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trips'
      AND policyname = 'Users can create trips'
  ) THEN
    CREATE POLICY "Users can create trips"
    ON public.trips
    FOR INSERT
    TO public
    WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;
