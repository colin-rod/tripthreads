/**
 * Trips List Page
 *
 * Displays all trips the user is a participant in.
 * Features:
 * - Grid of trip cards
 * - Search functionality
 * - Categorized sections (Upcoming, Ongoing, Past)
 * - Create new trip button
 * - Loading and error states
 */

import { Plus } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getUserTrips } from '@tripthreads/core'
import { getMissingSupabaseEnvError, isSupabaseConfigured } from '@/lib/supabase/env'
import { FirstTripTourProvider } from '@/components/features/tour/FirstTripTourProvider'
import { TripsPageWrapper } from '@/components/features/trips/TripsPageWrapper'
import { TripsErrorState } from '@/components/features/trips/TripsErrorState'

export default async function TripsPage() {
  if (!isSupabaseConfigured()) {
    const missingEnvError = getMissingSupabaseEnvError()

    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Plus className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Supabase configuration required</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {missingEnvError.message}. Add the required environment variables to enable trip data.
        </p>
      </div>
    )
  }

  const supabase = await createClient()

  try {
    const trips = await getUserTrips(supabase)
    const userHasTrips = trips.length > 0

    // Always show trips page wrapper (with grid layout)
    return (
      <FirstTripTourProvider userHasTrips={userHasTrips}>
        <TripsPageWrapper trips={trips} />
      </FirstTripTourProvider>
    )
  } catch (error) {
    console.error('Error loading trips:', error)
    const errorMessage =
      error instanceof Error && error.message.startsWith('Missing Supabase environment variables')
        ? `${getMissingSupabaseEnvError().message}. Add the required environment variables to enable trip data.`
        : error instanceof Error
          ? error.message
          : 'An unexpected error occurred'

    return <TripsErrorState message={errorMessage} />
  }
}
