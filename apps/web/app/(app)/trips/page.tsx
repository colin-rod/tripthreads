/**
 * Trips List Page
 *
 * Displays all trips the user is a participant in.
 * Features:
 * - Grid of trip cards
 * - Search functionality
 * - Categorized sections (Upcoming, Ongoing, Past)
 * - Create new trip button
 * - Empty state when no trips
 * - Loading and error states
 */

import { Plus } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getUserTrips } from '@tripthreads/core'
import { CreateTripButton } from '@/components/features/trips/CreateTripButton'
import { FirstTripTourProvider } from '@/components/features/tour/FirstTripTourProvider'
import { TripsPageWrapper } from '@/components/features/trips/TripsPageWrapper'

export default async function TripsPage() {
  const supabase = await createClient()

  try {
    const trips = await getUserTrips(supabase)
    const userHasTrips = trips.length > 0

    // Empty state (no trips)
    if (trips.length === 0) {
      return (
        <FirstTripTourProvider userHasTrips={false}>
          <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
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
        </FirstTripTourProvider>
      )
    }

    // Main trips view with navigation and sections
    return (
      <FirstTripTourProvider userHasTrips={userHasTrips}>
        <TripsPageWrapper trips={trips} />
      </FirstTripTourProvider>
    )
  } catch (error) {
    console.error('Error loading trips:', error)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <div className="rounded-full bg-destructive/10 p-6 mb-4">
          <Plus className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Error loading trips</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <CreateTripButton />
      </div>
    )
  }
}
