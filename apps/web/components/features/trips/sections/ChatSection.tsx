/**
 * Chat Section Component
 *
 * Extracted from /app/(app)/trips/[id]/chat/page.tsx
 * Displays the trip chat interface within the main trip page.
 */

'use client'

import { ChatThread } from '@/components/features/chat/ChatThread'
import { Card, CardContent } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { getChatMessages } from '@/app/actions/chat'

interface ChatSectionProps {
  tripId: string
  currentUserId: string
  tripCurrency?: string
}

interface ChatMessage {
  id: string
  content: string
  sender_id: string
  created_at: string
}

export function ChatSection({ tripId, currentUserId, tripCurrency = 'USD' }: ChatSectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMessages() {
      try {
        const messagesResult = await getChatMessages(tripId, 100)
        if (messagesResult.success) {
          setMessages(messagesResult.data || [])
        } else {
          setError('Failed to load messages')
        }
      } catch {
        setError('Failed to load messages')
      } finally {
        setIsLoading(false)
      }
    }
    fetchMessages()
  }, [tripId])

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>{error}. Please try again.</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>Loading messages...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-[calc(100vh-16rem)]">
      <Card className="h-full flex flex-col">
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ChatThread
            tripId={tripId}
            initialMessages={messages}
            currentUserId={currentUserId}
            tripCurrency={tripCurrency}
          />
        </CardContent>
      </Card>
    </div>
  )
}
