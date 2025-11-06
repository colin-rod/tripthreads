'use client'

/**
 * ParticipantsList Component
 *
 * Displays the list of trip participants with role badges.
 * Features:
 * - Avatar with user initials
 * - Role badge (Organizer, Participant, Viewer)
 * - Partial joiner indicator with dates
 * - Proper role badge styling
 */

import { format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getRoleLabel } from '@/lib/permissions/role-checks'

type TripRole = 'owner' | 'participant' | 'viewer'

interface Participant {
  id: string
  role: TripRole
  join_start_date?: string | null
  join_end_date?: string | null
  user: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

interface ParticipantsListProps {
  participants: Participant[]
}

function getRoleBadgeVariant(role: TripRole): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'owner':
      return 'default'
    case 'participant':
      return 'secondary'
    case 'viewer':
      return 'outline'
    default:
      return 'outline'
  }
}

export function ParticipantsList({ participants }: ParticipantsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Participants</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {participants.map(participant => {
          const isPartialJoiner = participant.join_start_date && participant.join_end_date

          return (
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
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate">
                    {participant.user.full_name || 'Unknown'}
                  </p>

                  {/* Role Badge */}
                  <Badge variant={getRoleBadgeVariant(participant.role)} className="text-xs">
                    {getRoleLabel(participant.role)}
                  </Badge>

                  {/* Partial Joiner Badge */}
                  {isPartialJoiner && (
                    <Badge variant="outline" className="text-xs">
                      Partial
                    </Badge>
                  )}
                </div>

                {/* Partial Joiner Dates */}
                {isPartialJoiner && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(participant.join_start_date!), 'MMM d')} -{' '}
                    {format(new Date(participant.join_end_date!), 'MMM d')}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
