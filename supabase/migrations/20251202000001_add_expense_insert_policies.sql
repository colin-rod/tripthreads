-- Add missing INSERT RLS policies for expenses and expense_participants tables
-- This allows trip participants to create expenses and expense splits

-- Drop existing policies if they exist (safety check)
DROP POLICY IF EXISTS "Trip participants can create expenses" ON public.expenses;
DROP POLICY IF EXISTS "Expense creator can add participants" ON public.expense_participants;

-- Allow trip participants (owner or participant) to create expenses
CREATE POLICY "Trip participants can create expenses"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.trip_participants tp
    WHERE tp.trip_id = expenses.trip_id
      AND tp.user_id = auth.uid()
      AND tp.role IN ('owner', 'participant')
      AND tp.status = 'active'
  )
);

-- Allow expense creator to add expense participants
CREATE POLICY "Expense creator can add participants"
ON public.expense_participants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.expenses e
    WHERE e.id = expense_participants.expense_id
      AND e.created_by = auth.uid()
  )
);
