/**
 * Chat Section Component
 *
 * Extracted from /app/(app)/trips/[id]/chat/page.tsx
 * Displays the trip chat interface within the main trip page.
 */

import { getChatMessages } from '@/app/actions/chat'
import { ChatThread } from '@/components/features/chat/ChatThread'
import { Card, CardContent } from '@/components/ui/card'

interface ChatSectionProps {
  tripId: string
  currentUserId: string
  tripCurrency?: string
}

export async function ChatSection({
  tripId,
  currentUserId,
  tripCurrency = 'USD',
}: ChatSectionProps) {
  // Fetch chat messages
  const messagesResult = await getChatMessages(tripId, 100)

  if (!messagesResult.success) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>Failed to load messages. Please try again.</p>
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
            initialMessages={messagesResult.data || []}
            currentUserId={currentUserId}
            tripCurrency={tripCurrency}
          />
        </CardContent>
      </Card>
    </div>
  )
}
