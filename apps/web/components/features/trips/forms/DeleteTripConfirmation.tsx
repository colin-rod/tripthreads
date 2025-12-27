'use client'

/**
 * DeleteTripConfirmation Component
 *
 * Reusable delete confirmation form for trips.
 * Can be used inline (e.g., in Settings accordion) or wrapped in an alert dialog.
 * Features type-to-confirm pattern for safety.
 * Extracted from DeleteTripDialog for better code reuse.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

import { createClient } from '@/lib/supabase/client'
import { deleteTrip } from '@tripthreads/core'

interface DeleteTripConfirmationProps {
  tripId: string
  tripName: string
  onSuccess?: () => void
  onCancel?: () => void
  variant?: 'default' | 'inline'
}

export function DeleteTripConfirmation({
  tripId,
  tripName,
  onSuccess,
  onCancel,
  variant: _variant = 'default',
}: DeleteTripConfirmationProps) {
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

      onSuccess?.()
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
    onCancel?.()
  }

  return (
    <div className="space-y-4">
      {/* Warning Header */}
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <h4 className="font-semibold">Delete Trip</h4>
      </div>

      {/* Warning Description */}
      <div className="space-y-4">
        <p className="font-medium text-foreground">
          This action cannot be undone. This will permanently delete:
        </p>

        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>All itinerary items</li>
          <li>All expenses and split records</li>
          <li>All media files (photos and videos)</li>
          <li>All participant records</li>
        </ul>

        {/* Confirmation Input */}
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
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isDeleting}>
            Cancel
          </Button>
        )}
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={!isConfirmMatch || isDeleting}
        >
          {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Delete Trip
        </Button>
      </div>
    </div>
  )
}
