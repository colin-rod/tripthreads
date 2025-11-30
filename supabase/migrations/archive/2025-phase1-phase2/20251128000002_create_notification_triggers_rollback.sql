-- Rollback Migration: Drop Notification Triggers
-- Description: Removes all notification triggers and trigger functions
-- Author: Claude (CRO-767)
-- Date: 2025-11-28

-- Drop triggers
DROP TRIGGER IF EXISTS on_trip_participant_insert ON public.trip_participants;
DROP TRIGGER IF EXISTS on_itinerary_item_insert ON public.itinerary_items;
DROP TRIGGER IF EXISTS on_itinerary_item_update ON public.itinerary_items;
DROP TRIGGER IF EXISTS on_expense_insert ON public.expenses;
DROP TRIGGER IF EXISTS on_settlement_status_change ON public.settlements;
DROP TRIGGER IF EXISTS on_chat_message_insert ON public.chat_messages;
-- DROP TRIGGER IF EXISTS on_media_file_insert ON public.media_files; -- Phase 3

-- Drop trigger functions
DROP FUNCTION IF EXISTS public.notify_invite_accepted();
DROP FUNCTION IF EXISTS public.notify_itinerary_change();
DROP FUNCTION IF EXISTS public.notify_expense_added();
DROP FUNCTION IF EXISTS public.notify_settlement_status_change();
DROP FUNCTION IF EXISTS public.notify_chat_message();
-- DROP FUNCTION IF EXISTS public.notify_photo_upload(); -- Phase 3
