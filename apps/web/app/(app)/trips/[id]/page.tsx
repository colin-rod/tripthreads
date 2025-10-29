/**
 * Trip Detail Page
 *
 * Displays full trip details with owner/participant info.
 * Features:
 * - Trip header with name, dates, description
 * - Owner and participants list
 * - Edit/Delete buttons (owner only)
 * - Tabs for Timeline, Expenses, Feed, Settings (future)
 */

import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { Calendar, MapPin, Users } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getTripById, isTripOwner } from '@shared/lib/supabase/queries/trips'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { TripActions } from '@/components/features/trips/TripActions'
import { InviteButton } from '@/components/features/trips/InviteButton'

interface TripDetailPageProps {
  params: {
    id: string
  }
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const supabase = createClient()

  let trip
  let isOwner = false

  try {
    trip = await getTripById(supabase, params.id)
    isOwner = await isTripOwner(supabase, params.id)
  } catch (error) {
    console.error('Error loading trip:', error)
    notFound()
  }

  const startDate = new Date(trip.start_date)
  const endDate = new Date(trip.end_date)

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Trip Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{trip.name}</h1>
                {isOwner && <Badge variant="outline">Owner</Badge>}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>
                    {trip.trip_participants.length}{' '}
                    {trip.trip_participants.length === 1 ? 'person' : 'people'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <InviteButton tripId={trip.id} isOwner={isOwner} />
              {isOwner && <TripActions trip={trip} />}
            </div>
          </div>
        </CardHeader>

        {trip.description && (
          <CardContent>
            <p className="text-muted-foreground">{trip.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Cover Image (if exists) */}
      {trip.cover_image_url && (
        <Card className="mb-6 overflow-hidden">
          <div className="relative aspect-video">
            <img
              src={trip.cover_image_url}
              alt={trip.name}
              className="object-cover w-full h-full"
            />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Participants Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Participants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trip.trip_participants.map(participant => (
              <div key={participant.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={participant.user.avatar_url || undefined} />
                  <AvatarFallback>
                    {participant.user.full_name
                      ?.split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {participant.user.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{participant.role}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          {/* Timeline/Itinerary (placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No itinerary items yet</p>
                <p className="text-sm mt-1">
                  Add activities, flights, and accommodations to your trip
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
