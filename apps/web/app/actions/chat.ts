'use server'

/**
 * Server Actions for Chat Message Management
 *
 * Handles chat message creation with proper RLS enforcement.
 * Messages are permanent (no update or delete actions).
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface ChatAttachment {
  url: string
  type: 'image' | 'document'
  name: string
  size: number
}

export interface CreateMessageInput {
  tripId: string
  content: string
  attachments?: ChatAttachment[]
  metadata?: Record<string, unknown>
}

export interface CreateBotMessageInput {
  tripId: string
  content: string
  metadata?: {
    expenseIds?: string[]
    itineraryIds?: string[]
    actionTaken?: string
  }
}

/**
 * Create a user message in a trip chat
 */
export async function createMessage(input: CreateMessageInput) {
  const supabase = await createClient()

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
      }
    }

    // Verify user is a participant of the trip
    const { data: participant, error: participantError } = await supabase
      .from('trip_participants')
      .select('id')
      .eq('trip_id', input.tripId)
      .eq('user_id', user.id)
      .single()

    if (participantError || !participant) {
      return {
        success: false,
        error: 'You must be a trip participant to send messages',
      }
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        trip_id: input.tripId,
        user_id: user.id,
        message_type: 'user',
        content: input.content,
        attachments: input.attachments || [],
        metadata: input.metadata || {},
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return {
        success: false,
        error: 'Failed to send message',
      }
    }

    // Revalidate the chat page
    revalidatePath(`/trips/${input.tripId}/chat`)

    return {
      success: true,
      data: message,
    }
  } catch (error) {
    console.error('Unexpected error creating message:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Create a bot message (TripThread AI response)
 * This uses the service role to bypass RLS for bot messages
 */
export async function createBotMessage(input: CreateBotMessageInput) {
  // This will use service role client for bot messages
  const supabase = await createClient()

  try {
    // Create the bot message with service role permissions
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        trip_id: input.tripId,
        user_id: null, // Bot messages have no user
        message_type: 'bot',
        content: input.content,
        attachments: [],
        metadata: input.metadata || {},
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating bot message:', messageError)
      return {
        success: false,
        error: 'Failed to send bot message',
      }
    }

    // Revalidate the chat page
    revalidatePath(`/trips/${input.tripId}/chat`)

    return {
      success: true,
      data: message,
    }
  } catch (error) {
    console.error('Unexpected error creating bot message:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Get chat messages for a trip
 */
export async function getChatMessages(tripId: string, limit = 50) {
  const supabase = await createClient()

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
      }
    }

    // Fetch messages (RLS will automatically filter based on trip participation)
    const { data: messages, error: messagesError } = await supabase
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

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return {
        success: false,
        error: 'Failed to fetch messages',
      }
    }

    return {
      success: true,
      data: messages || [],
    }
  } catch (error) {
    console.error('Unexpected error fetching messages:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Upload attachment to Supabase Storage
 */
export async function uploadAttachment(
  tripId: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient()

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
      }
    }

    // Generate unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${tripId}/${user.id}/${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading attachment:', uploadError)
      return {
        success: false,
        error: 'Failed to upload attachment',
      }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('chat-attachments').getPublicUrl(data.path)

    return {
      success: true,
      url: publicUrl,
    }
  } catch (error) {
    console.error('Unexpected error uploading attachment:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}
