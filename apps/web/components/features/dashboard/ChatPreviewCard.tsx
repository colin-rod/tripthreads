'use client'

import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DashboardCard } from './DashboardCard'

interface ChatPreviewCardProps {
  tripId: string
  recentMessages?: Array<{
    id: string
    content: string
    sender_name: string
    created_at: string
  }>
  unreadCount?: number
}

export function ChatPreviewCard({
  tripId,
  recentMessages = [],
  unreadCount = 0,
}: ChatPreviewCardProps) {
  return (
    <DashboardCard className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Chat
          {unreadCount > 0 && (
            <Badge variant="default" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/trips/${tripId}#chat`}>View All</Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {recentMessages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start a conversation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentMessages.map(message => (
              <div key={message.id} className="border-l-2 border-primary/20 pl-3">
                <p className="text-sm font-medium">{message.sender_name}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{message.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </DashboardCard>
  )
}
