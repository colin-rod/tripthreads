import { useEffect, useState, useRef } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { supabase } from '../../../lib/supabase/client'
import {
  getChatMessages,
  sendChatMessage,
  subscribeToChatMessages,
  type ChatMessage,
} from '../../../lib/queries/chat'
import { ChatInput } from './ChatInput'

interface ChatSectionProps {
  initialMessages: ChatMessage[]
  error?: string
}

export function ChatSection({ initialMessages, error: initialError }: ChatSectionProps) {
  const params = useLocalSearchParams<{ id: string }>()
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [refreshing, setRefreshing] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | undefined>(initialError)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const flatListRef = useRef<FlatList>(null)

  // Get current user ID
  useEffect(() => {
    async function fetchUserId() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    fetchUserId()
  }, [])

  // Refresh messages
  const refreshMessages = async () => {
    try {
      setRefreshing(true)
      const freshMessages = await getChatMessages(supabase, params.id!, 100)
      setMessages(freshMessages)
      setError(undefined)
    } catch (err) {
      console.error('Error refreshing messages:', err)
      setError('Failed to refresh messages')
    } finally {
      setRefreshing(false)
    }
  }

  // Set up real-time subscription
  useEffect(() => {
    if (!params.id) return

    const channel = subscribeToChatMessages(supabase, params.id, newMessage => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === newMessage.id)) {
          return prev
        }
        return [...prev, newMessage]
      })

      // Auto-scroll to bottom for new messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    })

    return () => {
      channel.unsubscribe()
    }
  }, [params.id])

  // Send message
  const handleSend = async (content: string) => {
    try {
      setSending(true)
      const result = await sendChatMessage(supabase, params.id!, content)

      if (!result.success) {
        setError(result.error || 'Failed to send message')
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  // Render a single message
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isCurrentUser = item.user_id === currentUserId
    const isBot = item.is_bot

    return (
      <View className={`px-4 py-2 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        <View className="max-w-[80%]">
          {!isCurrentUser && !isBot && (
            <Text className="text-xs text-muted-foreground mb-1 ml-2">{item.user.full_name}</Text>
          )}
          <View
            className={`p-3 rounded-2xl ${
              isBot
                ? 'bg-secondary border border-border'
                : isCurrentUser
                  ? 'bg-primary'
                  : 'bg-card border border-border'
            }`}
          >
            <Text
              className={`text-base ${
                isBot
                  ? 'text-secondary-foreground'
                  : isCurrentUser
                    ? 'text-primary-foreground'
                    : 'text-foreground'
              }`}
            >
              {item.content}
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground mt-1 mx-2">
            {new Date(item.created_at).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    )
  }

  if (error && messages.length === 0) {
    return (
      <View className="flex-1 justify-center items-center px-6 bg-background">
        <Text className="text-4xl mb-4">💬</Text>
        <Text className="text-xl font-bold text-foreground mb-2 text-center">{error}</Text>
        <Text className="text-sm text-muted-foreground text-center mb-4">
          Unable to load messages at this time.
        </Text>
        <TouchableOpacity onPress={refreshMessages} className="bg-primary px-6 py-3 rounded-lg">
          <Text className="text-primary-foreground font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      {messages.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-6xl mb-4">💬</Text>
          <Text className="text-xl font-semibold text-foreground text-center mb-2">
            No messages yet
          </Text>
          <Text className="text-sm text-muted-foreground text-center mb-6">
            Start the conversation with your trip companions!
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingVertical: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshMessages}
              tintColor="#F97316"
            />
          }
          onContentSizeChange={() => {
            // Scroll to bottom when content size changes
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false })
            }
          }}
        />
      )}

      <ChatInput onSend={handleSend} disabled={sending} />
    </View>
  )
}
