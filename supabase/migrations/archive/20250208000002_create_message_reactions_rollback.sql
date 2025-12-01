-- Rollback migration for message_reactions table
-- Part of CRO-788: Trip chat feature

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can delete their own reactions" ON message_reactions;
DROP POLICY IF EXISTS "Trip participants can add reactions" ON message_reactions;
DROP POLICY IF EXISTS "Trip participants can view reactions" ON message_reactions;

-- Drop indexes
DROP INDEX IF EXISTS idx_message_reactions_user_id;
DROP INDEX IF EXISTS idx_message_reactions_message_id;

-- Drop table
DROP TABLE IF EXISTS message_reactions;
