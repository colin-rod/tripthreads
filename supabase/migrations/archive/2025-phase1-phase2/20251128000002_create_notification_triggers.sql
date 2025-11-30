-- Migration: Create Notification Triggers
-- Description: Database triggers to invoke edge functions for trip event notifications
-- Author: Claude (CRO-767)
-- Date: 2025-11-28
--
-- This migration creates triggers for the following events:
-- 1. trip_participants INSERT → send-invite-accepted-notification
-- 2. itinerary_items INSERT/UPDATE → send-itinerary-notification
-- 3. expenses INSERT → send-expense-notification
-- 4. settlements UPDATE (status change) → send-settlement-notification
-- 5. chat_messages INSERT → send-chat-notification
-- 6. media_files INSERT → send-photo-notification (stub for Phase 3)
--
-- Note: access_requests already has a trigger for send-access-request-email

-- ============================================================================
-- 1. Invite Accepted Notification (trip_participants INSERT)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_invite_accepted()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_trip_participant_insert ON public.trip_participants;
CREATE TRIGGER on_trip_participant_insert
  AFTER INSERT ON public.trip_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_invite_accepted();

-- ============================================================================
-- 2. Itinerary Change Notification (itinerary_items INSERT/UPDATE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_itinerary_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Invoke edge function
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for INSERT and UPDATE
DROP TRIGGER IF EXISTS on_itinerary_item_insert ON public.itinerary_items;
CREATE TRIGGER on_itinerary_item_insert
  AFTER INSERT ON public.itinerary_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_itinerary_change();

DROP TRIGGER IF EXISTS on_itinerary_item_update ON public.itinerary_items;
CREATE TRIGGER on_itinerary_item_update
  AFTER UPDATE ON public.itinerary_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_itinerary_change();

-- ============================================================================
-- 3. Expense Added Notification (expenses INSERT)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_expense_added()
RETURNS TRIGGER AS $$
BEGIN
  -- Invoke edge function
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
          'paid_by', NEW.paid_by,
          'created_by', NEW.created_by,
          'expense_date', NEW.expense_date
        )
      )
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_expense_insert ON public.expenses;
CREATE TRIGGER on_expense_insert
  AFTER INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_expense_added();

-- ============================================================================
-- 4. Settlement Status Change Notification (settlements UPDATE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_settlement_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed from pending to settled
  IF OLD.status = 'pending' AND NEW.status = 'settled' THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_settlement_status_change ON public.settlements;
CREATE TRIGGER on_settlement_status_change
  AFTER UPDATE ON public.settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_settlement_status_change();

-- ============================================================================
-- 5. Chat Message Notification (chat_messages INSERT)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Invoke edge function
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_chat_message_insert ON public.chat_messages;
CREATE TRIGGER on_chat_message_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_message();

-- ============================================================================
-- 6. Photo Upload Notification (media_files INSERT) - STUB for Phase 3
-- ============================================================================
-- Note: This trigger is commented out because the media_files table doesn't exist yet.
-- Uncomment when implementing Phase 3.

/*
CREATE OR REPLACE FUNCTION public.notify_photo_upload()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-photo-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'media_files',
        'record', jsonb_build_object(
          'id', NEW.id,
          'trip_id', NEW.trip_id,
          'uploaded_by', NEW.uploaded_by,
          'file_type', NEW.file_type,
          'created_at', NEW.created_at
        )
      )
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_media_file_insert ON public.media_files;
CREATE TRIGGER on_media_file_insert
  AFTER INSERT ON public.media_files
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_photo_upload();
*/

-- ============================================================================
-- Grant permissions
-- ============================================================================

-- Grant execute permissions on trigger functions to authenticated users
GRANT EXECUTE ON FUNCTION public.notify_invite_accepted() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_itinerary_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_expense_added() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_settlement_status_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_chat_message() TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.notify_photo_upload() TO authenticated; -- Phase 3

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON FUNCTION public.notify_invite_accepted() IS 'Trigger function to send notification when a user joins a trip';
COMMENT ON FUNCTION public.notify_itinerary_change() IS 'Trigger function to send notification when itinerary is added or updated';
COMMENT ON FUNCTION public.notify_expense_added() IS 'Trigger function to send notification when an expense is added';
COMMENT ON FUNCTION public.notify_settlement_status_change() IS 'Trigger function to send notification when a settlement is marked as settled';
COMMENT ON FUNCTION public.notify_chat_message() IS 'Trigger function to send notification when a chat message is posted';
-- COMMENT ON FUNCTION public.notify_photo_upload() IS 'Trigger function to send notification when a photo is uploaded (Phase 3)';
