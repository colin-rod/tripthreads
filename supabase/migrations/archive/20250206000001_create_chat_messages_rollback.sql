-- Rollback migration for chat_messages table

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can read messages from their trips" ON chat_messages;
DROP POLICY IF EXISTS "Trip participants can send user messages" ON chat_messages;
DROP POLICY IF EXISTS "System can create bot and system messages" ON chat_messages;

-- Drop trigger and function
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
DROP FUNCTION IF EXISTS update_chat_messages_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_chat_messages_trip_id;
DROP INDEX IF EXISTS idx_chat_messages_created_at;
DROP INDEX IF EXISTS idx_chat_messages_user_id;

-- Drop table
DROP TABLE IF EXISTS chat_messages;
