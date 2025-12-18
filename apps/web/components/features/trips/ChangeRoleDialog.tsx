/**
 * Change Role Dialog Component
 *
 * Dialog for changing a participant's role in a trip.
 * Only accessible by trip owners.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserCog } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { updateParticipantRole } from '@/app/actions/trips'

interface ChangeRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: string
  participantId: string
  participantName: string
  currentRole: 'owner' | 'participant' | 'viewer'
}

const roleDescriptions: Record<'owner' | 'participant' | 'viewer', string> = {
  owner: 'Full access to manage the trip, participants, and all trip content',
  participant: 'Can view and contribute to expenses, itinerary, and chat',
  viewer: 'Read-only access to view trip content',
}

export function ChangeRoleDialog({
  open,
  onOpenChange,
  tripId,
  participantId,
  participantName,
  currentRole,
}: ChangeRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<'owner' | 'participant' | 'viewer'>(currentRole)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSave = async () => {
    if (selectedRole === currentRole) {
      onOpenChange(false)
      return
    }

    setIsUpdating(true)

    try {
      const result = await updateParticipantRole(tripId, participantId, selectedRole)

      if (result.success) {
        toast({
          title: 'Role updated',
          description: `${participantName}'s role has been changed to ${selectedRole}.`,
        })
        onOpenChange(false)
        router.refresh()
      } else {
        toast({
          title: 'Failed to update role',
          description: result.error || 'An error occurred. Please try again.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Failed to update role',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Change Participant Role
          </DialogTitle>
          <DialogDescription>
            Update the role for <span className="font-semibold">{participantName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedRole}
            onValueChange={value => setSelectedRole(value as typeof selectedRole)}
          >
            <div className="space-y-3">
              <div className="flex items-start space-x-3 rounded-md border p-4 hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="owner" id="role-owner" className="mt-1" />
                <Label htmlFor="role-owner" className="flex-1 cursor-pointer">
                  <div className="font-medium">Owner</div>
                  <div className="text-sm text-muted-foreground">{roleDescriptions.owner}</div>
                </Label>
              </div>

              <div className="flex items-start space-x-3 rounded-md border p-4 hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="participant" id="role-participant" className="mt-1" />
                <Label htmlFor="role-participant" className="flex-1 cursor-pointer">
                  <div className="font-medium">Participant</div>
                  <div className="text-sm text-muted-foreground">
                    {roleDescriptions.participant}
                  </div>
                </Label>
              </div>

              <div className="flex items-start space-x-3 rounded-md border p-4 hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="viewer" id="role-viewer" className="mt-1" />
                <Label htmlFor="role-viewer" className="flex-1 cursor-pointer">
                  <div className="font-medium">Viewer</div>
                  <div className="text-sm text-muted-foreground">{roleDescriptions.viewer}</div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUpdating || selectedRole === currentRole}>
            {isUpdating ? 'Updating...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
