import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'

export interface ChatUser {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
}

export interface ChatMessage {
  id: string
  trip_id: string
  user_id: string
  content: string
  is_bot: boolean
  created_at: string
  updated_at: string
  user: ChatUser
}

/**
 * Get chat messages for a trip
 * @param supabase - Supabase client instance
 * @param tripId - Trip ID to fetch messages for
 * @param limit - Maximum number of messages to fetch (default: 50)
 */
export async function getChatMessages(
  supabase: SupabaseClient,
  tripId: string,
  limit = 50
): Promise<ChatMessage[]> {
  try {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select(
        `
        *,
        user:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `
      )
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching chat messages:', error)
      throw new Error('Failed to fetch messages')
    }

    // Transform the data to match our interface
    return (messages || []).map(msg => ({
      ...msg,
      user: msg.user || {
        id: msg.user_id,
        full_name: 'Unknown User',
        email: '',
        avatar_url: null,
      },
    })) as ChatMessage[]
  } catch (err) {
    console.error('Unexpected error fetching messages:', err)
    return []
  }
}

/**
 * Send a new chat message
 * @param supabase - Supabase client instance
 * @param tripId - Trip ID to send message to
 * @param content - Message content
 */
export async function sendChatMessage(
  supabase: SupabaseClient,
  tripId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    const { error } = await supabase.from('chat_messages').insert({
      trip_id: tripId,
      user_id: user.id,
      content: content.trim(),
      is_bot: false,
    })

    if (error) {
      console.error('Error sending message:', error)
      return { success: false, error: 'Failed to send message' }
    }

    return { success: true }
  } catch (err) {
    console.error('Unexpected error sending message:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Subscribe to real-time chat message updates
 * @param supabase - Supabase client instance
 * @param tripId - Trip ID to subscribe to
 * @param onMessage - Callback when new message is received
 * @returns Subscription channel to unsubscribe later
 */
export function subscribeToChatMessages(
  supabase: SupabaseClient,
  tripId: string,
  onMessage: (message: ChatMessage) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`chat:${tripId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `trip_id=eq.${tripId}`,
      },
      async payload => {
        // Fetch the full message with user data
        const { data: message } = await supabase
          .from('chat_messages')
          .select(
            `
            *,
            user:user_id (
              id,
              full_name,
              email,
              avatar_url
            )
          `
          )
          .eq('id', payload.new.id)
          .single()

        if (message) {
          onMessage({
            ...message,
            user: message.user || {
              id: message.user_id,
              full_name: 'Unknown User',
              email: '',
              avatar_url: null,
            },
          } as ChatMessage)
        }
      }
    )
    .subscribe()

  return channel
}

/**
 * Unsubscribe from chat messages
 * @param channel - Channel to unsubscribe from
 */
export async function unsubscribeFromChat(channel: RealtimeChannel): Promise<void> {
  await channel.unsubscribe()
}
