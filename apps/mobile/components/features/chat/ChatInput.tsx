import { useState } from 'react'
import { View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { Text } from 'react-native'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim())
      setMessage('')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View className="border-t border-border bg-background p-4">
        <View className="flex-row items-end space-x-2">
          <TextInput
            className="flex-1 bg-card border border-border rounded-lg px-4 py-3 text-foreground min-h-[44px] max-h-[120px]"
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
            editable={!disabled}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!message.trim() || disabled}
            className={`px-4 py-3 rounded-lg ${
              message.trim() && !disabled ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <Text
              className={`font-medium ${
                message.trim() && !disabled ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              Send
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
