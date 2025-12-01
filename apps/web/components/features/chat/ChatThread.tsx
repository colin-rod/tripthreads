'use client'

import { useEffect, useRef, useState } from 'react'
import { ChatMessage, type ChatMessageData } from './ChatMessage'
import { ChatInput } from './ChatInput'
import {
  createMessage,
  createBotMessage,
  getReactions,
  type ChatAttachment,
} from '@/app/actions/chat'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { parseChatMessage } from '@/lib/chat/parse-mentions'
import { ParsedItemModal } from './ParsedItemModal'
import type { MentionableUser } from './MentionAutocomplete'
import type { Reaction } from './ReactionBar'

interface ChatThreadProps {
  tripId: string
  initialMessages: ChatMessageData[]
  currentUserId: string | null
  tripCurrency?: string
}

interface ParsedExpense {
  amount: number
  currency: string
  description: string
  category?: string
  payer?: string
  splitType?: 'equal' | 'custom' | 'percentage'
  splitCount?: number
  participants?: string[]
  date?: string
}

interface ParsedItinerary {
  type: 'flight' | 'stay' | 'activity'
  title: string
  description?: string
  startDate: string
  endDate?: string
  location?: string
}

interface ParsedCommand {
  command: string
  success: boolean
  hasExpense: boolean
  hasItinerary: boolean
  expense?: ParsedExpense
  itinerary?: ParsedItinerary
  error?: string
  latencyMs: number
}

export function ChatThread({
  tripId,
  initialMessages,
  currentUserId,
  tripCurrency = 'USD',
}: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>(initialMessages)
  const [participants, setParticipants] = useState<MentionableUser[]>([])
  const [reactions, setReactions] = useState<Map<string, Reaction[]>>(new Map())
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedCommands, setParsedCommands] = useState<ParsedCommand[]>([])
  const [currentModalIndex, setCurrentModalIndex] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch trip participants for @mentions
  useEffect(() => {
    async function fetchParticipants() {
      const { data, error } = await supabase
        .from('trip_participants')
        .select(
          `
          user_id,
          user:profiles!user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `
        )
        .eq('trip_id', tripId)

      if (error) {
        console.error('Error fetching participants:', error)
        return
      }

      if (data) {
        const mentionableUsers: MentionableUser[] = data
          .filter(p => p.user)
          .map(p => ({
            id: p.user!.id,
            full_name: p.user!.full_name,
            email: p.user!.email,
            avatar_url: p.user!.avatar_url,
          }))

        setParticipants(mentionableUsers)
      }
    }

    fetchParticipants()
  }, [tripId, supabase])

  // Fetch reactions for all messages
  useEffect(() => {
    async function fetchAllReactions() {
      if (messages.length === 0) return

      const newReactionsMap = new Map<string, Reaction[]>()

      // Fetch reactions for each message
      await Promise.all(
        messages.map(async message => {
          const result = await getReactions(message.id)
          if (result.success && result.data.length > 0) {
            newReactionsMap.set(message.id, result.data as Reaction[])
          }
        })
      )

      setReactions(newReactionsMap)
    }

    fetchAllReactions()
  }, [messages])

  // Set up real-time subscription for messages and reactions
  useEffect(() => {
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
          const newMessage = payload.new as ChatMessageData

          // Fetch user data if it's a user message
          if (newMessage.user_id) {
            const { data: userData } = await supabase
              .from('profiles')
              .select('id, full_name, email, avatar_url')
              .eq('id', newMessage.user_id)
              .single()

            if (userData) {
              newMessage.user = userData
            }
          }

          // Add message only if it doesn't already exist (prevent duplicates from optimistic updates)
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) {
              // Replace optimistic message with real one
              return prev.map(msg =>
                msg.id.toString().startsWith('temp-') && msg.content === newMessage.content
                  ? newMessage
                  : msg
              )
            }
            return [...prev, newMessage]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
        },
        async payload => {
          const reaction = payload.new as { message_id: string; user_id: string; emoji: string }

          // Refetch reactions for this message
          const result = await getReactions(reaction.message_id)
          if (result.success) {
            setReactions(prev => {
              const newMap = new Map(prev)
              if (result.data.length > 0) {
                newMap.set(reaction.message_id, result.data as Reaction[])
              } else {
                newMap.delete(reaction.message_id)
              }
              return newMap
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
        },
        async payload => {
          const reaction = payload.old as { message_id: string }

          // Refetch reactions for this message
          const result = await getReactions(reaction.message_id)
          if (result.success) {
            setReactions(prev => {
              const newMap = new Map(prev)
              if (result.data.length > 0) {
                newMap.set(reaction.message_id, result.data as Reaction[])
              } else {
                newMap.delete(reaction.message_id)
              }
              return newMap
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId, supabase])

  // Handle sending a message
  const handleSendMessage = async (
    content: string,
    attachments: ChatAttachment[],
    mentionedUserIds?: string[]
  ) => {
    if (!currentUserId) {
      toast.error('You must be logged in to send messages')
      return
    }

    setIsProcessing(true)

    // Create optimistic message (temporary until real message arrives from DB)
    const currentUser = participants.find(p => p.id === currentUserId)
    const optimisticMessage: ChatMessageData = {
      id: `temp-${Date.now()}`,
      trip_id: tripId,
      user_id: currentUserId,
      message_type: 'user' as const,
      content,
      attachments: attachments as any,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: currentUser
        ? {
            id: currentUser.id,
            full_name: currentUser.full_name,
            email: currentUser.email,
            avatar_url: currentUser.avatar_url ?? null,
          }
        : null,
    }

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage])

    try {
      // Check if message contains @TripThread mentions
      const parseResult = await parseChatMessage(content, tripId, {
        defaultCurrency: tripCurrency,
        referenceDate: new Date().toISOString(),
      })

      if (parseResult.success && parseResult.results.length > 0) {
        // Store parsed commands for modal flow
        setParsedCommands(parseResult.results)
        setCurrentModalIndex(0)

        // Send the user's message first
        const result = await createMessage({
          tripId,
          content,
          attachments,
          mentionedUserIds,
          metadata: {
            hasTripThreadMention: true,
            commandCount: parseResult.results.length,
          },
        })

        // Replace optimistic message with real message
        if (result.success && result.data) {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === optimisticMessage.id
                ? { ...(result.data as unknown as ChatMessageData), user: optimisticMessage.user }
                : msg
            )
          )
        }

        // Show modal for first command
        setShowModal(true)
      } else {
        // Regular message without AI parsing
        const result = await createMessage({
          tripId,
          content,
          attachments,
          mentionedUserIds,
        })

        // Replace optimistic message with real message
        if (result.success && result.data) {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === optimisticMessage.id
                ? { ...(result.data as unknown as ChatMessageData), user: optimisticMessage.user }
                : msg
            )
          )
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle modal confirmation
  const handleModalConfirm = async () => {
    const currentCommand = parsedCommands[currentModalIndex]

    if (!currentCommand) {
      setShowModal(false)
      return
    }

    // Close current modal
    setShowModal(false)

    // Create optimistic bot message
    const botMessage = formatBotMessage(currentCommand)
    const optimisticBotMessage: ChatMessageData = {
      id: `temp-bot-${Date.now()}`,
      trip_id: tripId,
      user_id: null,
      message_type: 'bot' as const,
      content: botMessage,
      attachments: [],
      metadata: {
        command: currentCommand.command,
        hasExpense: currentCommand.hasExpense,
        hasItinerary: currentCommand.hasItinerary,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: null,
    }

    // Add optimistic bot message immediately
    setMessages(prev => [...prev, optimisticBotMessage])

    // Send bot confirmation message
    const result = await createBotMessage({
      tripId,
      content: botMessage,
      metadata: {
        command: currentCommand.command,
        hasExpense: currentCommand.hasExpense,
        hasItinerary: currentCommand.hasItinerary,
      },
    })

    // Replace optimistic message with real message
    if (result.success && result.data) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === optimisticBotMessage.id ? (result.data as unknown as ChatMessageData) : msg
        )
      )
    }

    // Move to next command if any
    if (currentModalIndex < parsedCommands.length - 1) {
      setCurrentModalIndex(currentModalIndex + 1)
      setShowModal(true)
    } else {
      // All commands processed
      setParsedCommands([])
      setCurrentModalIndex(0)
    }
  }

  // Handle modal cancel
  const handleModalCancel = () => {
    setShowModal(false)
    setParsedCommands([])
    setCurrentModalIndex(0)
    toast.info('Cancelled')
  }

  // Format bot message based on what was created
  const formatBotMessage = (command: ParsedCommand): string => {
    const parts: string[] = []

    if (command.hasExpense && command.expense) {
      const { description, amount, currency } = command.expense
      const formattedAmount = (amount / 100).toFixed(2)
      parts.push(`Added expense: ${description} - ${currency}${formattedAmount}`)
    }

    if (command.hasItinerary && command.itinerary) {
      const { title, type } = command.itinerary
      parts.push(`Added ${type}: ${title}`)
    }

    return parts.length > 0 ? `✅ ${parts.join(' | ')}` : '✅ Done'
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div className="max-w-md space-y-2">
              <p className="text-lg font-medium text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground">
                Start a conversation or use @TripThread to add expenses and itinerary items
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <ChatMessage
                key={message.id}
                message={message}
                tripId={tripId}
                currentUserId={currentUserId}
                participants={participants}
                reactions={reactions.get(message.id) || []}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <ChatInput
        tripId={tripId}
        participants={participants}
        onSend={handleSendMessage}
        disabled={isProcessing}
        placeholder="Type a message or use @TripThread to add items..."
      />

      {/* Parsed Item Modal */}
      {showModal && parsedCommands[currentModalIndex] && (
        <ParsedItemModal
          open={showModal}
          onClose={handleModalCancel}
          onConfirm={handleModalConfirm}
          tripId={tripId}
          parsedData={parsedCommands[currentModalIndex]}
          currentIndex={currentModalIndex + 1}
          totalCommands={parsedCommands.length}
        />
      )}
    </div>
  )
}
