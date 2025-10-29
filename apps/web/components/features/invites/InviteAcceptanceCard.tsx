'use client'

/**
 * InviteAcceptanceCard Component
 *
 * Card UI for accepting trip invitations.
 * Features:
 * - Trip details display
 * - Inviter information
 * - Accept/decline buttons
 * - Loading and error states
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Calendar, Check, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

import { createClient } from '@/lib/supabase/client'
import { acceptInvite } from '@shared/lib/supabase/queries/invites'
import type { InviteWithDetails } from '@shared/types/invite'

interface InviteAcceptanceCardProps {
  inviteDetails: InviteWithDetails
  token: string
}

export function InviteAcceptanceCard({ inviteDetails, token }: InviteAcceptanceCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)

  const { invite, trip, inviter } = inviteDetails

  async function handleAccept() {
    setIsAccepting(true)
    try {
      const supabase = createClient()
      const result = await acceptInvite(supabase, token)

      toast({
        title: 'Welcome to the trip!',
        description: `You've successfully joined ${trip.name}`,
      })

      // Redirect to trip page
      router.push(`/trips/${result.trip_id}`)
    } catch (error) {
      console.error('Error accepting invite:', error)
      toast({
        title: 'Error joining trip',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
      setIsAccepting(false)
    }
  }

  function handleDecline() {
    setIsDeclining(true)
    // Just redirect away - no need to do anything server-side
    router.push('/trips')
  }

  const startDate = new Date(trip.start_date)
  const endDate = new Date(trip.end_date)
  const roleLabel = invite.role === 'participant' ? 'Participant' : 'Viewer'

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">You're invited to a trip!</CardTitle>
            <CardDescription>
              <span className="font-medium">{inviter.full_name}</span> has invited you to join
            </CardDescription>
          </div>
          <Badge variant={invite.role === 'participant' ? 'default' : 'secondary'}>
            {roleLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Trip Details */}
        <div className="space-y-4">
          {/* Cover Image */}
          {trip.cover_image_url && (
            <div className="aspect-video w-full overflow-hidden rounded-lg">
              <img
                src={trip.cover_image_url}
                alt={trip.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Trip Name */}
          <div>
            <h2 className="text-2xl font-bold">{trip.name}</h2>
            {trip.description && <p className="text-muted-foreground mt-1">{trip.description}</p>}
          </div>

          {/* Trip Dates */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
            </span>
          </div>
        </div>

        {/* Inviter Info */}
        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
          <Avatar>
            {inviter.avatar_url ? (
              <AvatarImage src={inviter.avatar_url} alt={inviter.full_name} />
            ) : (
              <AvatarFallback>
                {inviter.full_name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="font-medium">{inviter.full_name}</p>
            <p className="text-sm text-muted-foreground">Trip organizer</p>
          </div>
        </div>

        {/* Role Description */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <h3 className="font-medium text-sm">
            As a {roleLabel.toLowerCase()}, you will be able to:
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            {invite.role === 'participant' ? (
              <>
                <li>View and edit trip details</li>
                <li>Add and track expenses</li>
                <li>Upload photos and videos</li>
                <li>Comment and collaborate with other participants</li>
              </>
            ) : (
              <>
                <li>View trip details and itinerary</li>
                <li>View expenses and settlements</li>
                <li>View photos and feed</li>
                <li>Cannot edit or add content</li>
              </>
            )}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleAccept}
            disabled={isAccepting || isDeclining}
            className="flex-1"
            size="lg"
          >
            {isAccepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Accept Invite
              </>
            )}
          </Button>
          <Button
            onClick={handleDecline}
            disabled={isAccepting || isDeclining}
            variant="outline"
            size="lg"
          >
            {isDeclining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Declining...
              </>
            ) : (
              <>
                <X className="mr-2 h-4 w-4" />
                Decline
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
