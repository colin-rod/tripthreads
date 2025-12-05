/**
 * TripHeader Component
 *
 * Displays trip header with name, dates, description, and action buttons.
 * Includes settings gear icon for accessing trip settings.
 * Features interactive navigation (back button, clickable title) and participant dropdown.
 */

'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Calendar, Users, ArrowLeft, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { InviteButton } from '@/components/features/trips/InviteButton'
import { TripActions } from '@/components/features/trips/TripActions'
import { getRoleLabel } from '@tripthreads/core'

type TripRole = 'owner' | 'participant' | 'viewer'

interface TripHeaderProps {
  trip: {
    id: string
    name: string
    description: string | null
    start_date: string
    end_date: string
    cover_image_url?: string | null
    trip_participants: Array<{
      id: string
      role: 'owner' | 'participant' | 'viewer'
      join_start_date?: string | null
      join_end_date?: string | null
      user: {
        id: string
        full_name: string | null
        avatar_url: string | null
      }
    }>
  }
  isOwner: boolean
  userRole?: TripRole
  showBackButton?: boolean
  onNavigateToDashboard?: () => void
}

export function TripHeader({
  trip,
  isOwner,
  userRole,
  showBackButton = false,
  onNavigateToDashboard,
}: TripHeaderProps) {
  const router = useRouter()
  const startDate = new Date(trip.start_date)
  const endDate = new Date(trip.end_date)
  const participantCount = trip.trip_participants?.length || 0

  const handleTitleClick = () => {
    if (onNavigateToDashboard) {
      onNavigateToDashboard()
    } else {
      router.push(`/trips/${trip.id}`)
    }
  }

  return (
    <>
      {/* Trip Header Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {/* Back Button (conditional) */}
                {showBackButton && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleTitleClick}
                    aria-label="Back to dashboard"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}

                {/* Clickable Trip Title */}
                <button
                  onClick={handleTitleClick}
                  className="text-3xl font-bold hover:text-primary transition-colors cursor-pointer"
                  aria-label="Return to trip dashboard"
                >
                  {trip.name}
                </button>

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

                {/* Participant Dropdown (replaces static count) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 h-auto p-0 hover:bg-transparent hover:text-primary"
                    >
                      <Users className="h-4 w-4" />
                      <span>
                        {participantCount} {participantCount === 1 ? 'person' : 'people'}
                      </span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    <DropdownMenuLabel>Trip Participants</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="max-h-96 overflow-y-auto">
                      {trip.trip_participants?.map(participant => (
                        <DropdownMenuItem
                          key={participant.id}
                          className="flex items-center gap-3 py-3"
                        >
                          <Avatar className="w-8 h-8">
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
                            <p className="font-medium text-sm truncate">
                              {participant.user.full_name || 'Unknown'}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Badge
                                variant={
                                  participant.role === 'owner'
                                    ? 'default'
                                    : participant.role === 'participant'
                                      ? 'secondary'
                                      : 'outline'
                                }
                                className="text-xs"
                              >
                                {getRoleLabel(participant.role)}
                              </Badge>
                              {participant.join_start_date && participant.join_end_date && (
                                <Badge variant="outline" className="text-xs">
                                  Partial
                                </Badge>
                              )}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
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
    </>
  )
}
