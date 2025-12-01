-- ============================================================================
-- Fix Notification Triggers - Hardcode Configuration
-- ============================================================================
-- Date: 2025-12-01
-- Description: Updates all notification trigger functions to use hardcoded
--              Supabase URL and service role key instead of current_setting()
--
-- IMPORTANT BEFORE RUNNING:
-- Replace YOUR_SERVICE_ROLE_KEY_HERE with your actual service_role key from:
-- Supabase Dashboard ’ Settings ’ API ’ service_role (secret)
-- ============================================================================

-- ============================================================================
-- 1. Invite Accepted Notification
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_invite_accepted()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, net, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://tbwbaydyyjokrsjtgerh.supabase.co/functions/v1/send-invite-accepted-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'trip_participants',
        'record', jsonb_build_object(
          'id', NEW.id,
          'trip_id', NEW.trip_id,
          'user_id', NEW.user_id,
          'role', NEW.role,
          'joined_at', NEW.joined_at
        )
      )
    );
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. Itinerary Change Notification
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_itinerary_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, net, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://tbwbaydyyjokrsjtgerh.supabase.co/functions/v1/send-itinerary-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'table', 'itinerary_items',
        'record', jsonb_build_object(
          'id', NEW.id,
          'trip_id', NEW.trip_id,
          'item_type', NEW.item_type,
          'title', NEW.title,
          'start_datetime', NEW.start_datetime,
          'end_datetime', NEW.end_datetime,
          'location', NEW.location,
          'created_by', NEW.created_by
        ),
        'old_record', CASE
          WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
            'id', OLD.id,
            'title', OLD.title,
            'start_datetime', OLD.start_datetime,
            'end_datetime', OLD.end_datetime,
            'location', OLD.location
          )
          ELSE NULL
        END
      )
    );
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. Expense Added Notification
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_expense_added()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, net, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://tbwbaydyyjokrsjtgerh.supabase.co/functions/v1/send-expense-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
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
          'created_by', NEW.created_by,
          'expense_date', NEW.expense_date
        )
      )
    );
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. Settlement Status Change Notification
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_settlement_status_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, net, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'settled' THEN
    PERFORM
      net.http_post(
        url := 'https://tbwbaydyyjokrsjtgerh.supabase.co/functions/v1/send-settlement-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
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
            'settled_at', NEW.settled_at
          ),
          'old_record', jsonb_build_object(
            'status', OLD.status
          )
        )
      );
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 5. Chat Message Notification
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, net, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://tbwbaydyyjokrsjtgerh.supabase.co/functions/v1/send-chat-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'chat_messages',
        'record', jsonb_build_object(
          'id', NEW.id,
          'trip_id', NEW.trip_id,
          'user_id', NEW.user_id,
          'content', NEW.content,
          'message_type', NEW.message_type,
          'created_at', NEW.created_at
        )
      )
    );
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Notification trigger functions updated with hardcoded config';
  RAISE NOTICE 'Verify YOUR_SERVICE_ROLE_KEY_HERE was replaced before running!';
END $$;
