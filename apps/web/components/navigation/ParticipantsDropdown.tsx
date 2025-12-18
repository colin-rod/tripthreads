import Link from 'next/link'
import { Users, UserPlus, ChevronDown } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { getRoleLabel } from '@tripthreads/core'

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

interface ParticipantsDropdownProps {
  participants: Participant[]
  tripId: string
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

export function ParticipantsDropdown({ participants, tripId }: ParticipantsDropdownProps) {
  const participantCount = participants.length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Users className="w-4 h-4" />
          <span>
            {participantCount} {participantCount === 1 ? 'Person' : 'People'}
          </span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Trip Participants</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {participants.map(participant => (
            <DropdownMenuItem key={participant.id} className="flex items-center gap-3 py-3">
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
                  <Badge variant={getRoleBadgeVariant(participant.role)} className="text-xs">
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
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/trips/${tripId}#settings`} className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            <span>Invite People</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
