'use client'

/**
 * TripActions Component
 *
 * Action buttons for trip owners (Edit, Delete).
 * Manages dialog states for edit and delete operations.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EditTripDialog } from './EditTripDialog'
import { DeleteTripDialog } from './DeleteTripDialog'

interface Trip {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  cover_image_url: string | null
}

interface TripActionsProps {
  trip: Trip
}

export function TripActions({ trip }: TripActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  function handleEditSuccess() {
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Trip actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
        </DropdownMenuContent>
      </DropdownMenu>

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
  )
}
