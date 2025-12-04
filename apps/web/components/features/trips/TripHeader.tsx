/**
 * TripHeader Component
 *
 * Displays trip header with name, dates, description, and action buttons.
 * Includes settings gear icon for accessing trip settings.
 */

import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, Users, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InviteButton } from '@/components/features/trips/InviteButton'
import { TripActions } from '@/components/features/trips/TripActions'

type TripRole = 'owner' | 'participant' | 'viewer'

interface TripHeaderProps {
  trip: {
    id: string
    name: string
    description: string | null
    start_date: string
    end_date: string
    cover_image_url?: string | null
    trip_participants: unknown[]
  }
  isOwner: boolean
  userRole?: TripRole
}

export function TripHeader({ trip, isOwner, userRole }: TripHeaderProps) {
  const startDate = new Date(trip.start_date)
  const endDate = new Date(trip.end_date)

  return (
    <>
      {/* Trip Header Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{trip.name}</h1>
                {isOwner && <Badge variant="outline">Owner</Badge>}
                {userRole === 'viewer' && <Badge variant="secondary">Viewer</Badge>}
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
                    {Array.isArray(trip.trip_participants) ? trip.trip_participants.length : 0}{' '}
                    {Array.isArray(trip.trip_participants) && trip.trip_participants.length === 1
                      ? 'person'
                      : 'people'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <InviteButton tripId={trip.id} isOwner={isOwner} />
              {isOwner && <TripActions trip={trip} />}
              <Link href={`/trips/${trip.id}#settings`}>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Settings</span>
                </Button>
              </Link>
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
    </>
  )
}
