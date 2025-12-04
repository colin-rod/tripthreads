/**
 * Settings Section Component
 *
 * Extracted from /app/(app)/trips/[id]/settings/page.tsx
 * Displays trip settings and management within the main trip page.
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ParticipantsList } from '@/components/features/trips/ParticipantsList'
import { InviteButton } from '@/components/features/trips/InviteButton'
import { TripActions } from '@/components/features/trips/TripActions'
import { PendingInvitesList } from '@/components/features/invites/PendingInvitesList'
import { TripNotificationPreferencesSection } from '@/components/features/trips/TripNotificationPreferencesSection'
import type { TripNotificationPreferences } from '@tripthreads/core/validation/trip'
import type { GlobalNotificationPreferences } from '@/lib/utils/notifications'

type TripRole = 'owner' | 'participant' | 'viewer'

interface SettingsSectionProps {
  trip: {
    id: string
    name: string
    description: string | null
    start_date: string
    end_date: string
    trip_participants: Array<{
      id: string
      role: string
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
  currentUserId: string
  tripNotificationPreferences: TripNotificationPreferences | null
  globalNotificationPreferences: GlobalNotificationPreferences
}

export function SettingsSection({
  trip,
  isOwner,
  currentUserId: _currentUserId,
  tripNotificationPreferences,
  globalNotificationPreferences,
}: SettingsSectionProps) {
  const tripParticipants = (trip.trip_participants ?? []).map(p => ({
    ...p,
    role: p.role as TripRole,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your trip settings</p>
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

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <TripNotificationPreferencesSection
            tripId={trip.id}
            tripPreferences={tripNotificationPreferences}
            globalPreferences={globalNotificationPreferences}
          />
        </CardContent>
      </Card>
    </div>
  )
}
