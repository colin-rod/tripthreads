'use client'

import { Plus } from 'lucide-react'

import { CreateTripButton } from '@/components/features/trips/CreateTripButton'

type TripsErrorStateProps = {
  message: string
}

export function TripsErrorState({ message }: TripsErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <div className="rounded-full bg-destructive/10 p-6 mb-4">
        <Plus className="h-12 w-12 text-destructive" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">Error loading trips</h2>
      <p className="text-muted-foreground mb-6 max-w-md">{message}</p>
      <CreateTripButton />
    </div>
  )
}
