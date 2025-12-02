-- Fix expense visibility for trip owners
-- Bug: Owners were incorrectly restricted by joined_at date filtering
-- Fix: Allow owners to see ALL expenses regardless of date (preserves partial joiner feature for participants)

CREATE OR REPLACE FUNCTION public.can_user_see_expense(
  p_expense_date timestamp with time zone,
  p_trip_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is trip owner (owners see ALL expenses, no date restriction)
  IF is_trip_owner(p_trip_id, p_user_id) THEN
    RETURN true;
  END IF;

  -- Check if user is a participant and expense is within their date range
  -- This preserves the partial joiner feature for regular participants
  RETURN EXISTS (
    SELECT 1
    FROM public.trip_participants
    WHERE trip_id = p_trip_id
      AND user_id = p_user_id
      AND role = 'participant'  -- Exclude viewers (they cannot see expenses)
      AND p_expense_date >= joined_at
  );
END;
$function$;
