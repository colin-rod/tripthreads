'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { ChatMessageData } from '@/app/actions/chat'
import { ChatAttachmentDisplay } from './ChatAttachment'
import { MessageContent } from './MessageContent'
import type { MentionableUser } from './MentionAutocomplete'
import { ReactionBar, type Reaction } from './ReactionBar'
import { ReactionPicker } from './ReactionPicker'

export type { ChatMessageData }

interface ChatMessageProps {
  message: ChatMessageData
  currentUserId: string | null
  participants?: MentionableUser[]
  reactions?: Reaction[]
}

export function ChatMessage({
  message,
  currentUserId,
  participants = [],
  reactions = [],
}: ChatMessageProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const isCurrentUser = message.user_id === currentUserId
  const isBot = message.message_type === 'bot'
  const isSystem = message.message_type === 'system'

  // System messages (centered, gray)
  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="rounded-lg bg-muted px-3 py-1 text-xs text-muted-foreground">
          {message.content}
        </div>
      </div>
    )
  }

  // Bot messages (from TripThread AI)
  if (isBot) {
    return (
      <div className="flex items-start gap-3 py-2">
        <Avatar className="h-8 w-8 border-2 border-primary">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            TT
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-primary">TripThread</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(message.created_at), 'p')}
            </span>
          </div>

          <div className="mt-1 rounded-lg bg-muted px-3 py-2 text-sm">{message.content}</div>

          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment, index) => (
                <ChatAttachmentDisplay key={index} attachment={attachment} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // User messages
  const userName = message.user?.full_name || message.user?.email || 'Unknown User'
  const userInitials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={cn('flex items-start gap-3 py-2', isCurrentUser && 'flex-row-reverse')}>
      <Avatar className="h-8 w-8">
        {message.user?.avatar_url && <AvatarImage src={message.user.avatar_url} />}
        <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
      </Avatar>

      <div className={cn('flex-1', isCurrentUser && 'flex flex-col items-end')}>
        <div className={cn('flex items-baseline gap-2', isCurrentUser && 'flex-row-reverse')}>
          <span className="text-sm font-medium">{isCurrentUser ? 'You' : userName}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'p')}
          </span>
        </div>

        <div
          className={cn(
            'mt-1 max-w-[70%] rounded-lg px-3 py-2 text-sm',
            isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
          )}
        >
          <MessageContent
            content={message.content}
            currentUserId={currentUserId}
            participants={participants}
          />
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className={cn('mt-2 space-y-2', isCurrentUser && 'items-end')}>
            {message.attachments.map((attachment, index) => (
              <ChatAttachmentDisplay key={index} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Reaction Bar */}
        <div className={cn('relative', isCurrentUser && 'flex justify-end')}>
          <ReactionBar
            messageId={message.id}
            reactions={reactions}
            currentUserId={currentUserId}
            onShowPicker={() => setShowReactionPicker(!showReactionPicker)}
          />

          {/* Reaction Picker */}
          {showReactionPicker && (
            <ReactionPicker
              messageId={message.id}
              onClose={() => setShowReactionPicker(false)}
              onReactionAdded={() => setShowReactionPicker(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
