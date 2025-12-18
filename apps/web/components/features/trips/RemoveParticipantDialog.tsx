/**
 * Remove Participant Dialog Component
 *
 * Confirmation dialog for removing a participant from a trip.
 * Only accessible by trip owners.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserMinus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { removeParticipant } from '@/app/actions/trips'

interface RemoveParticipantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: string
  participantId: string
  participantName: string
}

export function RemoveParticipantDialog({
  open,
  onOpenChange,
  tripId,
  participantId,
  participantName,
}: RemoveParticipantDialogProps) {
  const [isRemoving, setIsRemoving] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleRemove = async () => {
    setIsRemoving(true)

    try {
      const result = await removeParticipant(tripId, participantId)

      if (result.success) {
        toast({
          title: 'Participant removed',
          description: `${participantName} has been removed from the trip.`,
        })
        onOpenChange(false)
        router.refresh()
      } else {
        toast({
          title: 'Failed to remove participant',
          description: result.error || 'An error occurred. Please try again.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Failed to remove participant',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-destructive" />
            Remove Participant
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove <span className="font-semibold">{participantName}</span>{' '}
            from this trip?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            This action will remove the participant from the trip and they will lose access to all
            trip content, including expenses, itinerary, and chat messages.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRemoving}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRemove} disabled={isRemoving}>
            {isRemoving ? 'Removing...' : 'Remove Participant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
