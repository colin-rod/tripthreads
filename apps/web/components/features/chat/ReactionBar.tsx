'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SmilePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addReaction } from '@/app/actions/chat'
import { toast } from 'sonner'

export interface Reaction {
  emoji: string
  count: number
  userIds: string[]
}

interface ReactionBarProps {
  messageId: string
  reactions: Reaction[]
  currentUserId: string | null
  onShowPicker?: () => void
}

export function ReactionBar({
  messageId,
  reactions,
  currentUserId,
  onShowPicker,
}: ReactionBarProps) {
  const [isTogglingReaction, setIsTogglingReaction] = useState(false)

  const handleReactionClick = async (emoji: string) => {
    if (!currentUserId || isTogglingReaction) return

    setIsTogglingReaction(true)

    try {
      const result = await addReaction(messageId, emoji)

      if (!result.success) {
        toast.error(result.error || 'Failed to update reaction')
      }
    } catch (error) {
      console.error('Error toggling reaction:', error)
      toast.error('Failed to update reaction')
    } finally {
      setIsTogglingReaction(false)
    }
  }

  if (reactions.length === 0) {
    return (
      <div className="mt-2 flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowPicker}
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <SmilePlus className="mr-1 h-3 w-3" />
          Add reaction
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 max-w-full">
      {reactions.map(reaction => {
        const hasReacted = currentUserId ? reaction.userIds.includes(currentUserId) : false

        return (
          <button
            key={reaction.emoji}
            onClick={() => handleReactionClick(reaction.emoji)}
            disabled={!currentUserId || isTogglingReaction}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
              hasReacted
                ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
                : 'border-border bg-background hover:bg-muted',
              (!currentUserId || isTogglingReaction) && 'cursor-not-allowed opacity-50'
            )}
            title={`${reaction.count} reaction${reaction.count === 1 ? '' : 's'}`}
          >
            <span>{reaction.emoji}</span>
            <span className="font-medium">{reaction.count}</span>
          </button>
        )
      })}

      <Button
        variant="ghost"
        size="sm"
        onClick={onShowPicker}
        className="h-7 min-w-7 px-2 shrink-0"
        title="Add reaction"
      >
        <SmilePlus className="h-3 w-3" />
        <span className="sr-only">Add reaction</span>
      </Button>
    </div>
  )
}
