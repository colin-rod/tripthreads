-- ============================================================================
-- Migration: Fix notification triggers search_path to include net schema
-- Description: Add SET search_path to all notification trigger functions
-- Author: Claude Code
-- Date: 2025-11-30
-- ============================================================================

-- Error: schema "net" does not exist (3F000)
-- Cause: Notification trigger functions use net.http_post() but don't have
--        access to the net schema when search_path is restricted
-- Solution: Add SET search_path = public, net, pg_temp to all notification functions

-- ============================================================================
-- 1. Invite Accepted Notification
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_invite_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, pg_temp
AS $$
BEGIN
  -- Invoke edge function via pg_net (requires pg_net extension)
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-invite-accepted-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, pg_temp
AS $$
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
          'item_type', NEW.item_type,
          'title', NEW.title,
          'start_time', NEW.start_time,
          'end_time', NEW.end_time,
          'created_by', NEW.created_by
        )
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, pg_temp
AS $$
BEGIN
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-expense-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
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
          'payer_id', NEW.payer_id,
          'created_by', NEW.created_by,
          'date', NEW.date
        )
      )
    );

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. Settlement Status Notification
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_settlement_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, pg_temp
AS $$
BEGIN
  -- Only notify when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-settlement-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
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
$$;

-- ============================================================================
-- 5. Chat Message Notification
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, pg_temp
AS $$
BEGIN
  -- Only notify for user messages (not bot/system)
  IF NEW.message_type = 'user' THEN
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-chat-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
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
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Summary:
-- - Added SET search_path = public, net, pg_temp to all notification functions
-- - This allows them to access net.http_post() for edge function invocation
-- - Fixes 3F000 "schema net does not exist" errors during trip creation
-- ============================================================================
