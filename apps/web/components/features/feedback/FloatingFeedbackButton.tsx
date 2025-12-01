'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeedbackModal } from './FeedbackModal'

export function FloatingFeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        title="Send feedback"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      <FeedbackModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
