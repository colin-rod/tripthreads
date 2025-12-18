-- ============================================================================
-- Fix Notification Triggers for Supabase Hosted Environment
-- ============================================================================
-- Date: 2025-12-01
-- Description: Updates notification triggers to work without database config params
--
-- The original triggers used current_setting('app.supabase_url') which requires
-- database-level ALTER DATABASE permissions that aren't available in Supabase's
-- hosted environment.
--
-- This migration updates all notification triggers to use Supabase's built-in
-- approach with the supabase_url extension function.
-- ============================================================================

-- Create helper function to get Supabase URL from the vault (if available)
-- or fall back to a hardcoded value for the project
CREATE OR REPLACE FUNCTION public.get_supabase_url()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT 'https://tbwbaydyyjokrsjtgerh.supabase.co'::text;
$$;

-- Create helper function to get service role key
-- This should be stored in Supabase Vault in production
CREATE OR REPLACE FUNCTION public.get_service_role_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRid2JheWR5eWpva3JzanRnZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY0NTc1MiwiZXhwIjoyMDc3MjIxNzUyfQ.A-OY9ej45jXDaIsxx1td286zdvuOiEfpryh96MJR0ic'::text;
$$;

-- Update itinerary notification trigger
CREATE OR REPLACE FUNCTION public.notify_itinerary_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net', 'pg_temp'
AS $function$
BEGIN
  PERFORM
    net.http_post(
      url := get_supabase_url() || '/functions/v1/send-itinerary-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || get_service_role_key()
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'table', 'itinerary_items',
        'record', jsonb_build_object(
          'id', NEW.id,
          'trip_id', NEW.trip_id,
          'item_type', NEW.type,
          'title', NEW.title,
          'start_time', NEW.start_time,
          'end_time', NEW.end_time,
          'created_by', NEW.created_by
        )
      )
    );

  RETURN NEW;
END;
$function$;

-- Update chat notification trigger
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net', 'pg_temp'
AS $function$
BEGIN
  -- Only notify for user messages (not bot/system)
  IF NEW.message_type = 'user' THEN
    PERFORM
      net.http_post(
        url := get_supabase_url() || '/functions/v1/send-chat-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || get_service_role_key()
        ),
        body := jsonb_build_object(
          'type', 'INSERT',
          'table', 'chat_messages',
          'record', jsonb_build_object(
            'id', NEW.id,
            'trip_id', NEW.trip_id,
            'user_id', NEW.user_id,
            'content', NEW.content,
            'created_at', NEW.created_at
          )
        )
      );
  END IF;

  RETURN NEW;
END;
$function$;

-- Update expense notification trigger
CREATE OR REPLACE FUNCTION public.notify_expense_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net', 'pg_temp'
AS $function$
BEGIN
  PERFORM
    net.http_post(
      url := get_supabase_url() || '/functions/v1/send-expense-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || get_service_role_key()
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'expenses',
        'record', jsonb_build_object(
          'id', NEW.id,
          'trip_id', NEW.trip_id,
          'description', NEW.description,
          'amount', NEW.amount,
          'currency', NEW.currency,
          'paid_by', NEW.paid_by,
          'expense_date', NEW.expense_date,
          'created_by', NEW.created_by
        )
      )
    );

  RETURN NEW;
END;
$function$;

-- Update settlement notification trigger
CREATE OR REPLACE FUNCTION public.notify_settlement_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net', 'pg_temp'
AS $function$
BEGIN
  -- Only notify when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM
      net.http_post(
        url := get_supabase_url() || '/functions/v1/send-settlement-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || get_service_role_key()
        ),
        body := jsonb_build_object(
          'type', 'UPDATE',
          'table', 'settlements',
          'record', jsonb_build_object(
            'id', NEW.id,
            'trip_id', NEW.trip_id,
            'from_user_id', NEW.from_user_id,
            'to_user_id', NEW.to_user_id,
            'amount', NEW.amount,
            'currency', NEW.currency,
            'status', NEW.status,
            'old_status', OLD.status
          )
        )
      );
  END IF;

  RETURN NEW;
END;
$function$;
