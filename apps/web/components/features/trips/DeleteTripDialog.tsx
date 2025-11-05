'use client'

/**
 * DeleteTripDialog Component
 *
 * Confirmation dialog for deleting a trip.
 * Features:
 * - Type-to-confirm (user must type trip name)
 * - Warning about data loss
 * - Lists what will be deleted (cascade)
 * - Only accessible to trip owner
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

import { createClient } from '@/lib/supabase/client'
import { deleteTrip } from '@tripthreads/shared'

interface DeleteTripDialogProps {
  tripId: string
  tripName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteTripDialog({ tripId, tripName, open, onOpenChange }: DeleteTripDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const isConfirmMatch = confirmText === tripName

  async function handleDelete() {
    if (!isConfirmMatch) return

    setIsDeleting(true)

    try {
      const supabase = createClient()
      await deleteTrip(supabase, tripId)

      toast({
        title: 'Trip deleted',
        description: `${tripName} has been permanently deleted.`,
      })

      onOpenChange(false)
      router.push('/trips')
      router.refresh()
    } catch (error) {
      console.error('Error deleting trip:', error)
      toast({
        title: 'Error deleting trip',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  function handleCancel() {
    setConfirmText('')
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Trip
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p className="font-medium text-foreground">
              This action cannot be undone. This will permanently delete:
            </p>

            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>All itinerary items</li>
              <li>All expenses and split records</li>
              <li>All media files (photos and videos)</li>
              <li>All participant records</li>
            </ul>

            <div className="space-y-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <Label htmlFor="confirm-delete" className="text-sm font-medium">
                Type <span className="font-bold">{tripName}</span> to confirm
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="Enter trip name"
                disabled={isDeleting}
                className="border-destructive/50 focus-visible:ring-destructive"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmMatch || isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Trip
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
