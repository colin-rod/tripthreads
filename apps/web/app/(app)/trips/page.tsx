/**
 * Trips List Page
 *
 * Displays all trips the user is a participant in.
 * Features:
 * - Grid of trip cards
 * - Create new trip button
 * - Empty state when no trips
 * - Loading and error states
 */

import { Suspense } from 'react'
import { Plus } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getUserTrips } from '@shared/lib/supabase/queries/trips'
import { TripCard } from '@/components/features/trips/TripCard'
import { Button } from '@/components/ui/button'
import { CreateTripButton } from '@/components/features/trips/CreateTripButton'

async function TripsList() {
  const supabase = createClient()

  try {
    const trips = await getUserTrips(supabase)

    if (trips.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
          <div className="rounded-full bg-muted p-6 mb-4">
            <Plus className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">No trips yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Start planning your next adventure by creating your first trip. You can invite friends
            and organize everything in one place.
          </p>
          <CreateTripButton />
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.map(trip => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    )
  } catch (error) {
    console.error('Error loading trips:', error)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <div className="rounded-full bg-destructive/10 p-6 mb-4">
          <Plus className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Error loading trips</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }
}

function TripsListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="h-[280px] rounded-lg border bg-card animate-pulse" />
      ))}
    </div>
  )
}

export default function TripsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Trips</h1>
          <p className="text-muted-foreground mt-1">Plan, organize, and track your adventures</p>
        </div>
        <CreateTripButton />
      </div>

      {/* Trips List */}
      <Suspense fallback={<TripsListSkeleton />}>
        <TripsList />
      </Suspense>
    </div>
  )
}
