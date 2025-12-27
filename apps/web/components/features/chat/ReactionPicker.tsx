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
  align?: 'left' | 'right'
}

export function ReactionPicker({
  messageId,
  onClose,
  onReactionAdded,
  align = 'left',
}: ReactionPickerProps) {
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
    <div
      className={cn(
        'absolute bottom-full mb-2 rounded-lg border bg-white p-2 shadow-lg',
        align === 'right' ? 'right-0' : 'left-0'
      )}
    >
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
