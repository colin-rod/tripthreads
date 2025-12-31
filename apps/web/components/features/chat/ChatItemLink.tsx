'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { ChatItineraryItemModal } from './ChatItineraryItemModal'
import { ChatExpenseModal } from './ChatExpenseModal'
import type { MentionableUser } from './MentionAutocomplete'

interface ChatItemLinkProps {
  itemId: string
  itemType: 'expense' | 'itinerary'
  itineraryType?: string
  text: string
  tripId: string
  tripParticipants?: MentionableUser[]
}

export function ChatItemLink({
  itemId,
  itemType,
  itineraryType: _itineraryType,
  text,
  tripId,
  tripParticipants = [],
}: ChatItemLinkProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const handleClick = () => {
    setModalOpen(true)
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline underline-offset-2 hover:underline-offset-4 transition-all cursor-pointer"
      >
        <span>{text}</span>
        <ExternalLink className="h-3 w-3 inline" />
      </button>

      {itemType === 'itinerary' ? (
        <ChatItineraryItemModal
          itemId={itemId}
          tripId={tripId}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          tripParticipants={tripParticipants}
        />
      ) : (
        <ChatExpenseModal
          itemId={itemId}
          tripId={tripId}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
