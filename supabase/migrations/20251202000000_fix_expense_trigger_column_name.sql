-- Fix notify_expense_added trigger to use correct column name
-- The expenses table uses 'payer_id', not 'paid_by'

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
          'payer_id', NEW.payer_id,  -- Fixed: was 'paid_by'
          'expense_date', NEW.date,   -- Note: table column is 'date', not 'expense_date'
          'created_by', NEW.created_by
        )
      )
    );

  RETURN NEW;
END;
$function$;
