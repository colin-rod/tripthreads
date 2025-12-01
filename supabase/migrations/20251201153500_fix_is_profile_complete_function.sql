-- ============================================================================
-- Migration: Fix is_profile_complete function to use profiles table
-- Description: The function was referencing public.users instead of public.profiles
-- Date: 2025-12-01
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_profile_complete(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_full_name TEXT;
BEGIN
  SELECT full_name INTO v_full_name
  FROM public.profiles
  WHERE id = p_user_id;

  -- Profile is complete if full_name is set
  RETURN v_full_name IS NOT NULL AND LENGTH(TRIM(v_full_name)) > 0;
END;
$function$;
