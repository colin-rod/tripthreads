import { View, Text, TouchableOpacity } from 'react-native'
import type { ChatMessage } from '../../../lib/queries/chat'

interface ChatPreviewCardProps {
  messages: ChatMessage[]
  onViewAll: () => void
}

export function ChatPreviewCard({ messages, onViewAll }: ChatPreviewCardProps) {
  const recentMessages = messages.slice(-3) // Last 3 messages

  return (
    <View className="bg-card p-6 rounded-xl border border-border mb-4">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-semibold text-foreground">💬 Chat</Text>
        <TouchableOpacity onPress={onViewAll} className="bg-primary/10 px-3 py-1.5 rounded-lg">
          <Text className="text-primary text-sm font-medium">View All →</Text>
        </TouchableOpacity>
      </View>

      {messages.length === 0 ? (
        <View className="py-4">
          <Text className="text-muted-foreground text-center text-sm">
            No messages yet. Start the conversation!
          </Text>
        </View>
      ) : (
        <View className="space-y-3">
          {recentMessages.map(message => (
            <View key={message.id} className="flex-row items-start">
              {/* Avatar placeholder */}
              <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center mr-3">
                <Text className="text-xs font-semibold text-primary">
                  {message.user.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>

              {/* Message content */}
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Text className="text-xs font-semibold text-foreground">
                    {message.user.full_name}
                  </Text>
                  <Text className="text-xs text-muted-foreground ml-2">
                    {new Date(message.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text
                  className="text-sm text-muted-foreground"
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {message.content}
                </Text>
              </View>
            </View>
          ))}

          {messages.length > 3 && (
            <Text className="text-xs text-muted-foreground text-center mt-2">
              {messages.length - 3} more messages
            </Text>
          )}
        </View>
      )}
    </View>
  )
}
