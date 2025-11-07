-- Create chat_messages table for trip group chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'bot', 'system')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb, -- Store parsed item IDs, action taken, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_trip_id ON chat_messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_chat_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_messages_updated_at();

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read messages from trips they're participants in
CREATE POLICY "Users can read messages from their trips"
  ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants
      WHERE trip_participants.trip_id = chat_messages.trip_id
        AND trip_participants.user_id = auth.uid()
    )
  );

-- RLS Policy: Trip participants can send user messages
CREATE POLICY "Trip participants can send user messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    message_type = 'user'
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trip_participants
      WHERE trip_participants.trip_id = chat_messages.trip_id
        AND trip_participants.user_id = auth.uid()
    )
  );

-- RLS Policy: System can create bot and system messages (service role only)
CREATE POLICY "System can create bot and system messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    message_type IN ('bot', 'system')
    AND user_id IS NULL
  );

-- Messages are permanent (no update or delete policies)

-- Add comment for documentation
COMMENT ON TABLE chat_messages IS 'Stores chat messages for trip group conversations with AI bot integration';
COMMENT ON COLUMN chat_messages.message_type IS 'Type of message: user (from participant), bot (from TripThread AI), system (notifications)';
COMMENT ON COLUMN chat_messages.attachments IS 'Array of attachment objects with {url, type, name, size}';
COMMENT ON COLUMN chat_messages.metadata IS 'Additional data like parsed expense/itinerary IDs, AI parsing details';
