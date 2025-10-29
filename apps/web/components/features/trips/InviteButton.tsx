'use client'

/**
 * InviteButton Component
 *
 * Button to open the invite dialog.
 * Only visible to trip owners.
 */

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InviteDialog } from './InviteDialog'

interface InviteButtonProps {
  tripId: string
  isOwner: boolean
}

export function InviteButton({ tripId, isOwner }: InviteButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  if (!isOwner) {
    return null
  }

  return (
    <>
      <Button onClick={() => setDialogOpen(true)} variant="default" size="sm">
        <UserPlus className="h-4 w-4 mr-2" />
        Invite
      </Button>

      <InviteDialog open={dialogOpen} onOpenChange={setDialogOpen} tripId={tripId} />
    </>
  )
}
