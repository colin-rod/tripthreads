/**
 * Trip Plan/Timeline Page
 *
 * View and edit itinerary items for the trip.
 * Repurposes the ItineraryInput component from the main trip page.
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTripById } from '@tripthreads/core'
import { ItineraryInputWrapper } from '@/components/features/itinerary/ItineraryInputWrapper'
import { ItineraryViewContainer } from '@/components/features/itinerary/ItineraryViewContainer'

interface TripPlanPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function TripPlanPage({ params }: TripPlanPageProps) {
  const supabase = await createClient()
  const { id } = await params

  // Fetch trip data
  let trip
  try {
    trip = await getTripById(supabase, id)
  } catch (error) {
    console.error('Error loading trip:', error)
    notFound()
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Get user's role
  const userParticipant = trip.trip_participants?.find(
    participant => participant.user?.id === user.id
  )
  const canEdit = userParticipant?.role !== 'viewer'

  // Prepare trip participants for the container
  const participants =
    trip.trip_participants?.map(p => ({
      id: p.user?.id || '',
      full_name: p.user?.full_name || null,
    })) || []

  return (
    <div className="container mx-auto h-full max-w-7xl overflow-y-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Itinerary</h1>
          <p className="text-muted-foreground mt-2">View and manage your trip timeline</p>
        </div>

        {/* AI Itinerary Input (Participants only) */}
        {canEdit && <ItineraryInputWrapper tripId={trip.id} />}

        {/* Itinerary Views (Calendar/List) */}
        <ItineraryViewContainer
          tripId={trip.id}
          tripStartDate={trip.start_date}
          tripEndDate={trip.end_date}
          currentUserId={user.id}
          tripParticipants={participants}
          canEdit={canEdit}
        />
      </div>
    </div>
  )
}
