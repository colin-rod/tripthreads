-- Fix notify_itinerary_change function to use correct column name
-- Bug: Function was referencing NEW.item_type but column is named NEW.type
-- This was causing PostgreSQL error 42703 (undefined_column) when inserting itinerary items

CREATE OR REPLACE FUNCTION public.notify_itinerary_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net', 'pg_temp'
AS $function$
BEGIN
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-itinerary-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'table', 'itinerary_items',
        'record', jsonb_build_object(
          'id', NEW.id,
          'trip_id', NEW.trip_id,
          'item_type', NEW.type,  -- Fixed: was NEW.item_type, now NEW.type
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
