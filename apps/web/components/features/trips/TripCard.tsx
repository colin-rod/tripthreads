'use client'

/**
 * TripCard Component
 *
 * Card displaying trip summary in list view.
 * Shows trip name, dates, participant count, and cover image.
 */

import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, Users, MapPin, Pencil, Trash2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface TripParticipant {
  user: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

interface Trip {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  cover_image_url: string | null
  trip_participants?: TripParticipant[]
}

interface TripCardProps {
  trip: Trip
  onEdit?: (tripId: string) => void
  onDelete?: (tripId: string) => void
}

export function TripCard({ trip, onEdit, onDelete }: TripCardProps) {
  const startDate = new Date(trip.start_date)
  const endDate = new Date(trip.end_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Determine trip status
  let status: 'upcoming' | 'ongoing' | 'past' = 'upcoming'
  if (startDate <= today && endDate >= today) {
    status = 'ongoing'
  } else if (endDate < today) {
    status = 'past'
  }

  const statusConfig = {
    upcoming: { label: 'Upcoming', variant: 'default' as const },
    ongoing: { label: 'Ongoing', variant: 'default' as const },
    past: { label: 'Past', variant: 'secondary' as const },
  }

  const participantCount = trip.trip_participants?.length || 0
  const displayedParticipants = trip.trip_participants?.slice(0, 3) || []
  const additionalCount = Math.max(0, participantCount - 3)

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onEdit?.(trip.id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete?.(trip.id)
  }

  return (
    <Card className="group relative cursor-pointer transition-all hover:shadow-lg hover:border-primary/50">
      <Link href={`/trips/${trip.id}`} className="block">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="group-hover:text-primary transition-colors truncate">
                {trip.name}
              </CardTitle>
              <CardDescription className="mt-1.5 flex items-center gap-1.5 text-sm">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">
                  {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
                </span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={statusConfig[status].variant}>{statusConfig[status].label}</Badge>
              {/* Action buttons */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleEdit}
                    aria-label="Edit trip"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDelete}
                    aria-label="Delete trip"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Description (if exists) */}
          {trip.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{trip.description}</p>
          )}

          {/* Participants */}
          {participantCount > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-1">
                <div className="flex -space-x-2">
                  {displayedParticipants.map(participant => (
                    <Avatar
                      key={participant.user.id}
                      className="h-7 w-7 border-2 border-background"
                    >
                      <AvatarImage src={participant.user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {participant.user.full_name
                          ?.split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground ml-1">
                  {participantCount} {participantCount === 1 ? 'person' : 'people'}
                  {additionalCount > 0 && ` (+${additionalCount})`}
                </span>
              </div>
            </div>
          )}

          {/* Cover image placeholder or thumbnail */}
          {trip.cover_image_url ? (
            <div className="relative aspect-video overflow-hidden rounded-md border">
              <img
                src={trip.cover_image_url}
                alt={trip.name}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="relative aspect-video overflow-hidden rounded-md border bg-muted flex items-center justify-center">
              <MapPin className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
  )
}
