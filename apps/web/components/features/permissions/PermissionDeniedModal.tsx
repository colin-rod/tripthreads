'use client'

/**
 * PermissionDeniedModal Component
 *
 * Modal that displays when a viewer tries to perform a restricted action.
 * Features:
 * - Clear explanation of the permission issue
 * - "Request Edit Access" button that sends notification to organizer
 * - Changes to "Request Sent" after clicking
 * - Lock icon for visual clarity
 */

import { useState } from 'react'
import { Lock, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { requestEditAccess } from '@/app/actions/permissions'

interface PermissionDeniedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: string
  actionAttempted: string
}

export function PermissionDeniedModal({
  open,
  onOpenChange,
  tripId,
  actionAttempted,
}: PermissionDeniedModalProps) {
  const { toast } = useToast()
  const [requestSent, setRequestSent] = useState(false)
  const [isSending, setIsSending] = useState(false)

  async function handleRequestAccess() {
    setIsSending(true)
    try {
      await requestEditAccess(tripId)

      setRequestSent(true)
      toast({
        title: 'Request sent!',
        description: 'The trip organizer has been notified of your access request.',
      })
    } catch (error) {
      console.error('Error requesting edit access:', error)
      toast({
        title: 'Failed to send request',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-muted p-3">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <DialogTitle>Permission Required</DialogTitle>
          </div>
          <DialogDescription>
            You don't have permission to {actionAttempted.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You're currently a <strong>viewer</strong> on this trip. Viewers can see trip details
            but cannot make changes.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            To {actionAttempted.toLowerCase()}, you'll need <strong>participant</strong> access. You
            can request the trip organizer to upgrade your role.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRequestAccess} disabled={requestSent || isSending}>
            {requestSent ? 'Request Sent' : isSending ? 'Sending...' : 'Request Edit Access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
