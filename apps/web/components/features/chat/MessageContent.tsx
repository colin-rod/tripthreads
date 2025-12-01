'use client'

import { useMemo } from 'react'
import { highlightMentions } from '@/lib/chat/parse-user-mentions'
import type { MentionableUser } from './MentionAutocomplete'

interface MessageContentProps {
  content: string
  currentUserId: string | null
  participants: MentionableUser[]
}

export function MessageContent({ content, currentUserId, participants }: MessageContentProps) {
  // Highlight @mentions in the message
  const highlightedContent = useMemo(() => {
    if (!currentUserId || participants.length === 0) {
      return content
    }

    return highlightMentions(content, currentUserId, participants)
  }, [content, currentUserId, participants])

  return (
    <div
      className="message-content whitespace-pre-wrap break-words"
      dangerouslySetInnerHTML={{ __html: highlightedContent }}
    />
  )
}
