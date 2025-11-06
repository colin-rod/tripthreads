'use client'

/**
 * CreateTripButton Component
 *
 * Button that opens the CreateTripDialog.
 * Manages dialog open/close state.
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CreateTripDialog } from './CreateTripDialog'

export function CreateTripButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} size="default" data-tour="create-trip-button">
        <Plus className="mr-2 h-4 w-4" />
        Create Trip
      </Button>
      <CreateTripDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
