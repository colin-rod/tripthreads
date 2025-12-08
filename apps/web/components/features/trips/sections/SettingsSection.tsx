/**
 * Settings Section Component
 *
 * Extracted from /app/(app)/trips/[id]/settings/page.tsx
 * Displays trip settings and management within the main trip page.
 * Uses accordion layout for better UX and consistency with global settings.
 */

'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Users, Mail, Bell } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { InviteButton } from '@/components/features/trips/InviteButton'
import { PendingInvitesList } from '@/components/features/invites/PendingInvitesList'
import { TripNotificationPreferencesSection } from '@/components/features/trips/TripNotificationPreferencesSection'
import type { TripNotificationPreferences } from '@tripthreads/core/validation/trip'
import type { GlobalNotificationPreferences } from '@/lib/utils/notifications'

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

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
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

function getRoleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

export function SettingsSection({
  trip,
  isOwner,
  currentUserId: _currentUserId,
  tripNotificationPreferences,
  globalNotificationPreferences,
}: SettingsSectionProps) {
  const tripParticipants = trip.trip_participants || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your trip settings</p>
      </div>

      {/* Accordion Container */}
      <Accordion
        type="multiple"
        defaultValue={['participants', 'invitations', 'notifications']}
        className="space-y-4"
      >
        {/* Participants Section */}
        <AccordionItem value="participants" className="border rounded-lg px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
                <Users className="h-5 w-5 text-orange-600 dark:text-orange-500" />
              </div>
              <div className="text-left">
                <h3 className="font-medium">Participants</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage trip participants and invite new members
                </p>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="pt-6 pb-4">
            {/* Header with Invite Button */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-muted-foreground">Trip Members</h4>
              <InviteButton tripId={trip.id} isOwner={isOwner} />
            </div>

            {/* Participant List */}
            <div className="space-y-3">
              {tripParticipants.map(participant => {
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
                        <Badge variant={getRoleBadgeVariant(participant.role)} className="text-xs">
                          {getRoleLabel(participant.role)}
                        </Badge>
                        {isPartialJoiner && (
                          <Badge variant="outline" className="text-xs">
                            Partial
                          </Badge>
                        )}
                      </div>
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
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Invitations Section (Owner Only) */}
        {isOwner && (
          <AccordionItem value="invitations" className="border rounded-lg px-6">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                  <Mail className="h-5 w-5 text-green-600 dark:text-green-500" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium">Invitations</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage trip invitations and view invitation history
                  </p>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="pt-6 pb-4">
              <PendingInvitesList tripId={trip.id} isOwner={isOwner} wrapped={false} />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Notification Preferences Section */}
        <AccordionItem value="notifications" className="border rounded-lg px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-500" />
              </div>
              <div className="text-left">
                <h3 className="font-medium">Notification Preferences</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Control which notifications you receive for this trip
                </p>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="pt-6 pb-4">
            {/* Link to global settings */}
            <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
              <p className="text-muted-foreground">
                These preferences override your{' '}
                <Link href="/settings" className="text-primary hover:underline">
                  global notification settings
                </Link>
                .
              </p>
            </div>

            <TripNotificationPreferencesSection
              tripId={trip.id}
              tripPreferences={tripNotificationPreferences}
              globalPreferences={globalNotificationPreferences}
              showHeader={false}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
