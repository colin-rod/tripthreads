/**
 * Leave Trip Dialog Component
 *
 * Confirmation dialog for non-owner participants to leave a trip.
 * Owners cannot leave if they are the sole owner.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
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
import { leaveTrip } from '@/app/actions/trips'

interface LeaveTripDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: string
  tripName: string
}

export function LeaveTripDialog({ open, onOpenChange, tripId, tripName }: LeaveTripDialogProps) {
  const [isLeaving, setIsLeaving] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLeave = async () => {
    setIsLeaving(true)

    try {
      const result = await leaveTrip(tripId)

      if (result.success) {
        toast({
          title: 'Left trip',
          description: `You have left ${tripName}.`,
        })
        onOpenChange(false)
        // Redirect to trips list
        router.push('/trips')
        router.refresh()
      } else {
        toast({
          title: 'Failed to leave trip',
          description: result.error || 'An error occurred. Please try again.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Failed to leave trip',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLeaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-destructive" />
            Leave Trip
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to leave <span className="font-semibold">{tripName}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            If you leave this trip, you will lose access to all trip content, including expenses,
            itinerary, chat messages, and media. You will need to be re-invited to regain access.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLeaving}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleLeave} disabled={isLeaving}>
            {isLeaving ? 'Leaving...' : 'Leave Trip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
