/**
 * Trip Settings Page
 *
 * Manage trip settings, participants, and preferences.
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTripById, isTripOwner } from '@tripthreads/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ParticipantsList } from '@/components/features/trips/ParticipantsList'
import { InviteButton } from '@/components/features/trips/InviteButton'
import { TripActions } from '@/components/features/trips/TripActions'
import { PendingInvitesList } from '@/components/features/invites/PendingInvitesList'

interface TripSettingsPageProps {
  params: {
    id: string
  }
}

type TripRole = 'owner' | 'participant' | 'viewer'

export default async function TripSettingsPage({ params }: TripSettingsPageProps) {
  const supabase = await createClient()

  // Fetch trip data
  let trip
  let isOwner = false
  try {
    trip = await getTripById(supabase, params.id)
    isOwner = await isTripOwner(supabase, params.id)
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

  const tripParticipants = (trip.trip_participants ?? []).map(p => ({
    ...p,
    role: p.role as TripRole,
  }))

  return (
    <div className="container mx-auto h-full max-w-7xl overflow-y-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your trip settings</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Trip Info */}
          <Card>
            <CardHeader>
              <CardTitle>Trip Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-lg">{trip.name}</p>
              </div>
              {trip.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p>{trip.description}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dates</p>
                <p>
                  {new Date(trip.start_date).toLocaleDateString()} -{' '}
                  {new Date(trip.end_date).toLocaleDateString()}
                </p>
              </div>
              {isOwner && (
                <div className="flex gap-2 pt-4">
                  <TripActions trip={trip} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Participants</CardTitle>
              <InviteButton tripId={trip.id} isOwner={isOwner} />
            </CardHeader>
            <CardContent>
              <ParticipantsList participants={tripParticipants} />
            </CardContent>
          </Card>
        </div>

        {/* Pending Invitations (owners only) */}
        {isOwner && <PendingInvitesList tripId={trip.id} isOwner={isOwner} />}
      </div>
    </div>
  )
}
