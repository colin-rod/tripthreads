'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { addReaction } from '@/app/actions/chat'
import { toast } from 'sonner'

// Common emoji reactions for MVP
const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥', '👏', '✅', '💯', '🚀']

interface ReactionPickerProps {
  messageId: string
  onClose: () => void
  onReactionAdded?: () => void
}

export function ReactionPicker({ messageId, onClose, onReactionAdded }: ReactionPickerProps) {
  const [isAdding, setIsAdding] = useState(false)

  const handleEmojiClick = async (emoji: string) => {
    if (isAdding) return

    setIsAdding(true)

    try {
      const result = await addReaction(messageId, emoji)

      if (result.success) {
        onReactionAdded?.()
        onClose()
      } else {
        toast.error(result.error || 'Failed to add reaction')
      }
    } catch (error) {
      console.error('Error adding reaction:', error)
      toast.error('Failed to add reaction')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="absolute bottom-full left-0 mb-2 rounded-lg border bg-popover p-2 shadow-lg">
      <div className="grid grid-cols-6 gap-1">
        {COMMON_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => handleEmojiClick(emoji)}
            disabled={isAdding}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-md text-2xl transition-colors',
              'hover:bg-accent',
              isAdding && 'cursor-not-allowed opacity-50'
            )}
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
