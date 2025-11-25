/**
 * DeleteAccountDialog Component
 *
 * GDPR-compliant account deletion dialog.
 * Features:
 * - Password verification (security)
 * - Trip ownership handling (transfer or delete)
 * - Confirmation checkbox (user acknowledgment)
 * - Warning about permanent data loss
 * - Lists consequences of deletion
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, ArrowRightLeft, Trash2 } from 'lucide-react'

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
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'

import { deleteAccount, getOwnedTripsForDeletion } from '@/app/actions/account-deletion'

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface OwnedTrip {
  trip_id: string
  trip_name: string
  participant_count: number
  can_transfer: boolean
  oldest_participant_id: string | null
  oldest_participant_name: string | null
}

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [confirmDeletion, setConfirmDeletion] = useState(false)
  const [tripDeletionStrategy, setTripDeletionStrategy] = useState<'transfer' | 'delete'>(
    'transfer'
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoadingTrips, setIsLoadingTrips] = useState(false)
  const [ownedTrips, setOwnedTrips] = useState<OwnedTrip[]>([])

  // Load owned trips when dialog opens
  useEffect(() => {
    if (open) {
      loadOwnedTrips()
    } else {
      // Reset state when dialog closes
      setCurrentPassword('')
      setConfirmDeletion(false)
      setTripDeletionStrategy('transfer')
      setOwnedTrips([])
    }
  }, [open])

  async function loadOwnedTrips() {
    setIsLoadingTrips(true)
    try {
      const trips = await getOwnedTripsForDeletion()
      setOwnedTrips(trips)
    } catch (error) {
      console.error('Error loading owned trips:', error)
      toast({
        title: 'Error loading trips',
        description: 'Could not load your owned trips. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingTrips(false)
    }
  }

  async function handleDelete() {
    if (!currentPassword || !confirmDeletion) return

    setIsDeleting(true)

    try {
      const result = await deleteAccount(currentPassword, confirmDeletion, tripDeletionStrategy)

      toast({
        title: 'Account deleted',
        description: result.message,
      })

      // User is signed out by the server action, will be redirected to login
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error deleting account:', error)
      toast({
        title: 'Error deleting account',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
      setIsDeleting(false)
    }
  }

  function handleCancel() {
    setCurrentPassword('')
    setConfirmDeletion(false)
    setTripDeletionStrategy('transfer')
    onOpenChange(false)
  }

  const isFormValid = currentPassword.length > 0 && confirmDeletion

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Account
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 text-left">
            <p className="font-medium text-foreground">
              This action cannot be undone. Deleting your account will:
            </p>

            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>Permanently anonymize your profile data</li>
              <li>Remove your name from all trips and expenses</li>
              <li>Delete your chat messages (shown as "Deleted User")</li>
              <li>Delete your avatar and personal information</li>
              <li>Sign you out immediately</li>
            </ul>

            {/* Trip Ownership Section */}
            {isLoadingTrips && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your trips...
              </div>
            )}

            {!isLoadingTrips && ownedTrips.length > 0 && (
              <div className="space-y-3 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/10 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <p className="font-medium text-sm text-orange-900 dark:text-orange-100">
                      You own {ownedTrips.length} trip{ownedTrips.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      Choose what happens to {ownedTrips.length > 1 ? 'these trips' : 'this trip'}:
                    </p>
                  </div>
                </div>

                <RadioGroup
                  value={tripDeletionStrategy}
                  onValueChange={(value: string) =>
                    setTripDeletionStrategy(value as 'transfer' | 'delete')
                  }
                  className="space-y-3 mt-3"
                >
                  {/* Transfer ownership option */}
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="transfer" id="transfer" className="mt-0.5" />
                    <Label htmlFor="transfer" className="flex-1 cursor-pointer space-y-1">
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Transfer ownership
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ownedTrips.some(t => t.can_transfer)
                          ? 'Transfers ownership to the oldest participant in each trip'
                          : 'Some trips have no other participants and will be deleted'}
                      </p>
                      {ownedTrips.some(t => t.can_transfer) && (
                        <ul className="text-xs text-muted-foreground space-y-0.5 mt-2">
                          {ownedTrips
                            .filter(t => t.can_transfer)
                            .map(trip => (
                              <li key={trip.trip_id}>
                                • {trip.trip_name} → {trip.oldest_participant_name}
                              </li>
                            ))}
                        </ul>
                      )}
                    </Label>
                  </div>

                  {/* Delete trips option */}
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="delete" id="delete" className="mt-0.5" />
                    <Label htmlFor="delete" className="flex-1 cursor-pointer space-y-1">
                      <div className="flex items-center gap-2 font-medium text-sm text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete all trips
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Permanently deletes all trips you own, including all data (expenses,
                        itinerary, media)
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Password verification */}
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-sm font-medium">
                Confirm your password
              </Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isDeleting}
                className="border-destructive/50 focus-visible:ring-destructive"
              />
              <p className="text-xs text-muted-foreground">
                For security, please confirm your password to delete your account
              </p>
            </div>

            {/* Confirmation checkbox */}
            <div className="flex items-start space-x-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <Checkbox
                id="confirm-deletion"
                checked={confirmDeletion}
                onCheckedChange={checked => setConfirmDeletion(checked as boolean)}
                disabled={isDeleting}
                className="mt-0.5"
              />
              <Label
                htmlFor="confirm-deletion"
                className="text-sm font-medium cursor-pointer leading-relaxed"
              >
                I understand this action is permanent and cannot be undone. My account and data will
                be deleted.
              </Label>
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
            disabled={!isFormValid || isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete My Account
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
