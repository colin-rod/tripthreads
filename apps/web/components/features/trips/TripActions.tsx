'use client'

/**
 * TripActions Component
 *
 * Action buttons for trip owners (Edit, Delete, Settings).
 * Manages dialog states for edit and delete operations.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Pencil, Trash2, UserPlus, LogOut } from 'lucide-react'
import type { TripSection } from '@/hooks/useHashNavigation'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EditTripDialog } from './EditTripDialog'
import { DeleteTripDialog } from './DeleteTripDialog'
import { InviteDialog } from './InviteDialog'
import { LeaveTripDialog } from './LeaveTripDialog'

interface Trip {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  cover_image_url?: string | null
}

interface TripActionsProps {
  trip: Trip
  tripId: string
  isOwner?: boolean
  onNavigate?: (section: TripSection) => void
}

export function TripActions({ trip, tripId, isOwner = true, onNavigate }: TripActionsProps) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)

  function handleEditSuccess() {
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Trip settings</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isOwner ? (
            <>
              <DropdownMenuItem onClick={() => setInviteOpen(true)} data-tour="invite-menu-item">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite
              </DropdownMenuItem>
              {onNavigate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onNavigate('settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Trip
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Trip
              </DropdownMenuItem>
            </>
          ) : (
            <>
              {onNavigate && (
                <DropdownMenuItem onClick={() => onNavigate('settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              )}
              {onNavigate && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => setLeaveOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Leave Trip
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {isOwner && (
        <>
          <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} tripId={tripId} />

          <EditTripDialog
            trip={trip}
            open={editOpen}
            onOpenChange={setEditOpen}
            onSuccess={handleEditSuccess}
          />

          <DeleteTripDialog
            tripId={trip.id}
            tripName={trip.name}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      )}

      {!isOwner && (
        <LeaveTripDialog
          tripId={trip.id}
          tripName={trip.name}
          open={leaveOpen}
          onOpenChange={setLeaveOpen}
        />
      )}
    </>
  )
}
