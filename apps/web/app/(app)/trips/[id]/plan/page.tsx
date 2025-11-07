/**
 * Trip Plan/Timeline Page
 *
 * View and edit itinerary items for the trip.
 * Repurposes the ItineraryInput component from the main trip page.
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTripById } from '@tripthreads/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ItineraryInputWrapper } from '@/components/features/itinerary/ItineraryInputWrapper'
import { MapPin } from 'lucide-react'

interface TripPlanPageProps {
  params: {
    id: string
  }
}

export default async function TripPlanPage({ params }: TripPlanPageProps) {
  const supabase = await createClient()

  // Fetch trip data
  let trip
  try {
    trip = await getTripById(supabase, params.id)
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

  return (
    <div className="container mx-auto h-full max-w-7xl overflow-y-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Itinerary</h1>
          <p className="text-muted-foreground mt-2">View and manage your trip timeline</p>
        </div>

        {/* AI Itinerary Input (Participants only) */}
        {canEdit && <ItineraryInputWrapper tripId={trip.id} />}

        {/* Itinerary List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No itinerary items yet</p>
              <p className="text-sm mt-1">
                {canEdit
                  ? 'Add activities, flights, and accommodations using natural language above or via @TripThread in Chat'
                  : 'Only participants can add itinerary items'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
