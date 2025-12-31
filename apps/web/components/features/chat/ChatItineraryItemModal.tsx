'use client'

import { useEffect, useState } from 'react'
import { ItineraryItemDialog } from '@/components/features/itinerary/ItineraryItemDialog'
import { ItemErrorModal } from './ItemErrorModal'
import { getItineraryItemForChat } from '@/app/actions/get-chat-items'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'
import type { MentionableUser } from './MentionAutocomplete'

interface ChatItineraryItemModalProps {
  itemId: string
  tripId: string
  open: boolean
  onClose: () => void
  tripParticipants: MentionableUser[]
}

export function ChatItineraryItemModal({
  itemId,
  tripId,
  open,
  onClose,
  tripParticipants,
}: ChatItineraryItemModalProps) {
  const [item, setItem] = useState<ItineraryItemWithParticipants | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'not_found' | 'permission_denied' | 'error' | null>(null)

  useEffect(() => {
    if (open) {
      fetchItem()
    }
  }, [open, itemId])

  const fetchItem = async () => {
    setLoading(true)
    setError(null)

    const result = await getItineraryItemForChat(itemId, tripId)

    if (result.success) {
      setItem(result.item)
    } else {
      setError(result.error)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error) {
    return <ItemErrorModal open={open} onClose={onClose} errorType={error} />
  }

  if (!item) {
    return null
  }

  return (
    <ItineraryItemDialog
      open={open}
      onOpenChange={onClose}
      mode="view"
      item={item}
      tripId={tripId}
      tripParticipants={tripParticipants}
    />
  )
}
