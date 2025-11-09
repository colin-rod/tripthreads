'use server'

/**
 * Server Actions for Chat Message Management
 *
 * Handles chat message creation with proper RLS enforcement.
 * Messages are permanent (no update or delete actions).
 */

import * as Sentry from '@sentry/nextjs'
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
  mentionedUserIds?: string[]
  metadata?: Record<string, unknown>
}

export interface CreateBotMessageInput {
  tripId: string
  content: string
  metadata?: {
    expenseIds?: string[]
    itineraryIds?: string[]
    actionTaken?: string
    command?: string
    hasExpense?: boolean
    hasItinerary?: boolean
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

    // Create the message with mentioned user IDs in metadata
    const metadata = {
      ...(input.metadata || {}),
      ...(input.mentionedUserIds && input.mentionedUserIds.length > 0
        ? { mentioned_user_ids: input.mentionedUserIds }
        : {}),
    }

    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        trip_id: input.tripId,
        user_id: user.id,
        message_type: 'user' as const,
        content: input.content,
        attachments: (input.attachments || []) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        metadata: metadata as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)

      // Log to Sentry
      Sentry.captureException(messageError, {
        tags: {
          feature: 'chat',
          operation: 'create_message',
        },
        contexts: {
          message: {
            tripId: input.tripId,
            hasAttachments: !!input.attachments?.length,
          },
          supabase: {
            code: messageError.code,
            details: messageError.details,
            hint: messageError.hint,
          },
        },
      })

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

    // Log to Sentry
    Sentry.captureException(error, {
      tags: {
        feature: 'chat',
        operation: 'create_message',
        errorType: 'unexpected',
      },
      contexts: {
        message: {
          tripId: input.tripId,
        },
      },
    })

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
        message_type: 'bot' as const,
        content: input.content,
        attachments: [] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        metadata: (input.metadata || {}) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating bot message:', messageError)

      // Log to Sentry
      Sentry.captureException(messageError, {
        tags: {
          feature: 'chat',
          operation: 'create_bot_message',
        },
        contexts: {
          message: {
            tripId: input.tripId,
            metadata: input.metadata,
          },
          supabase: {
            code: messageError.code,
            details: messageError.details,
            hint: messageError.hint,
          },
        },
      })

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

    // Log to Sentry
    Sentry.captureException(error, {
      tags: {
        feature: 'chat',
        operation: 'create_bot_message',
        errorType: 'unexpected',
      },
      contexts: {
        message: {
          tripId: input.tripId,
        },
      },
    })

    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

export interface ChatMessageData {
  id: string
  trip_id: string
  user_id: string | null
  message_type: 'user' | 'bot' | 'system'
  content: string
  attachments: ChatAttachment[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  user?: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
  } | null
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
        success: false as const,
        error: 'Authentication required' as const,
        data: undefined,
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

      // Log to Sentry
      Sentry.captureException(messagesError, {
        tags: {
          feature: 'chat',
          operation: 'fetch_messages',
        },
        contexts: {
          query: {
            tripId,
            limit,
          },
          supabase: {
            code: messagesError.code,
            details: messagesError.details,
            hint: messagesError.hint,
          },
        },
      })

      return {
        success: false as const,
        error: 'Failed to fetch messages' as const,
        data: undefined,
      }
    }

    return {
      success: true as const,
      data: (messages || []) as unknown as ChatMessageData[],
      error: undefined,
    }
  } catch (error) {
    console.error('Unexpected error fetching messages:', error)

    // Log to Sentry
    Sentry.captureException(error, {
      tags: {
        feature: 'chat',
        operation: 'fetch_messages',
        errorType: 'unexpected',
      },
      contexts: {
        query: {
          tripId,
          limit,
        },
      },
    })

    return {
      success: false as const,
      error: 'An unexpected error occurred' as const,
      data: undefined,
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

      // Log to Sentry
      Sentry.captureException(uploadError, {
        tags: {
          feature: 'chat',
          operation: 'upload_attachment',
        },
        contexts: {
          file: {
            tripId,
            name: file.name,
            size: file.size,
            type: file.type,
          },
          supabase: {
            code: uploadError.message,
          },
        },
      })

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

    // Log to Sentry
    Sentry.captureException(error, {
      tags: {
        feature: 'chat',
        operation: 'upload_attachment',
        errorType: 'unexpected',
      },
      contexts: {
        file: {
          tripId,
          name: file.name,
          size: file.size,
          type: file.type,
        },
      },
    })

    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Add or toggle a reaction on a message
 * If the user has already reacted with this emoji, it will be removed (toggle behavior)
 */
export async function addReaction(messageId: string, emoji: string) {
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

    // Check if user already reacted with this emoji
    const { data: existingReaction } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .single()

    if (existingReaction) {
      // Remove reaction (toggle off)
      const { error: deleteError } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id)

      if (deleteError) {
        console.error('Error removing reaction:', deleteError)

        Sentry.captureException(deleteError, {
          tags: {
            feature: 'chat',
            operation: 'remove_reaction',
          },
        })

        return {
          success: false,
          error: 'Failed to remove reaction',
        }
      }

      return {
        success: true,
        action: 'removed' as const,
      }
    } else {
      // Add new reaction
      const { error: insertError } = await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      })

      if (insertError) {
        console.error('Error adding reaction:', insertError)

        Sentry.captureException(insertError, {
          tags: {
            feature: 'chat',
            operation: 'add_reaction',
          },
        })

        return {
          success: false,
          error: 'Failed to add reaction',
        }
      }

      return {
        success: true,
        action: 'added' as const,
      }
    }
  } catch (error) {
    console.error('Unexpected error managing reaction:', error)

    Sentry.captureException(error, {
      tags: {
        feature: 'chat',
        operation: 'add_reaction',
        errorType: 'unexpected',
      },
    })

    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Get all reactions for a message, grouped by emoji
 */
export type ReactionData = { emoji: string; count: number; userIds: string[] }

export async function getReactions(
  messageId: string
): Promise<{ success: true; data: ReactionData[] } | { success: false; error: string; data: [] }> {
  const supabase = await createClient()

  try {
    const { data: reactions, error } = await supabase
      .from('message_reactions')
      .select(
        `
        id,
        emoji,
        user_id,
        users:user_id (
          id,
          full_name
        )
      `
      )
      .eq('message_id', messageId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching reactions:', error)
      return {
        success: false,
        error: 'Failed to fetch reactions',
        data: [],
      }
    }

    // Group reactions by emoji and count
    const grouped = reactions.reduce(
      (acc, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = {
            emoji: reaction.emoji,
            count: 0,
            userIds: [],
          }
        }
        acc[reaction.emoji].count++
        acc[reaction.emoji].userIds.push(reaction.user_id)
        return acc
      },
      {} as Record<string, { emoji: string; count: number; userIds: string[] }>
    )

    return {
      success: true,
      data: Object.values(grouped),
    }
  } catch (error) {
    console.error('Unexpected error fetching reactions:', error)

    Sentry.captureException(error, {
      tags: {
        feature: 'chat',
        operation: 'get_reactions',
        errorType: 'unexpected',
      },
    })

    return {
      success: false,
      error: 'An unexpected error occurred',
      data: [],
    }
  }
}
