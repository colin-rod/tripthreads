-- Create message_reactions table for emoji reactions on chat messages
-- Part of CRO-788: Trip chat feature

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (length(emoji) <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one reaction per user per emoji per message
  UNIQUE(message_id, user_id, emoji)
);

-- Add helpful comment
COMMENT ON TABLE message_reactions IS 'Stores emoji reactions on chat messages';
COMMENT ON COLUMN message_reactions.emoji IS 'Emoji character or unicode string (max 10 chars)';

-- Indexes for performance
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);

-- Enable Row Level Security
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Trip participants can view reactions
CREATE POLICY "Trip participants can view reactions"
  ON message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN trip_participants tp ON tp.trip_id = cm.trip_id
      WHERE cm.id = message_reactions.message_id
        AND tp.user_id = auth.uid()
    )
  );

-- RLS Policy: Trip participants can add reactions
CREATE POLICY "Trip participants can add reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN trip_participants tp ON tp.trip_id = cm.trip_id
      WHERE cm.id = message_reactions.message_id
        AND tp.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON message_reactions FOR DELETE
  USING (user_id = auth.uid());
