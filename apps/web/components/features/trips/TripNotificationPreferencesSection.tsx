/**
 * Trip Notification Preferences Section
 *
 * Allows users to configure notification preferences for a specific trip.
 * Preferences can inherit from global settings or be explicitly overridden.
 * Features auto-save on toggle with inheritance indicators.
 */

'use client'

import * as React from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { updateTripNotificationPreferences } from '@/app/actions/trip-preferences'
import {
  getEventTypeLabel,
  getEventTypeDescription,
  isPreferenceInherited,
  getEffectivePreference,
  type NotificationEventType,
  type GlobalNotificationPreferences,
} from '@/lib/utils/notifications'
import type { TripNotificationPreferences } from '@tripthreads/core/validation/trip'
import { Info } from 'lucide-react'

interface TripNotificationPreferencesSectionProps {
  tripId: string
  tripPreferences: TripNotificationPreferences | null
  globalPreferences: GlobalNotificationPreferences
  onUpdate?: () => void
  showHeader?: boolean
}

const EVENT_TYPES: NotificationEventType[] = [
  'invites',
  'itinerary',
  'expenses',
  'photos',
  'chat',
  'settlements',
]

export function TripNotificationPreferencesSection({
  tripId,
  tripPreferences,
  globalPreferences,
  onUpdate,
  showHeader = true,
}: TripNotificationPreferencesSectionProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = React.useState(false)
  const [localPreferences, setLocalPreferences] =
    React.useState<TripNotificationPreferences | null>(tripPreferences)

  // Update local state when props change
  React.useEffect(() => {
    setLocalPreferences(tripPreferences)
  }, [tripPreferences])

  const handleToggle = async (eventType: NotificationEventType, value: boolean) => {
    try {
      setIsSaving(true)

      // Optimistic update
      const updatedPreferences: TripNotificationPreferences = {
        ...localPreferences,
        [eventType]: value,
      }
      setLocalPreferences(updatedPreferences)

      // Save to server
      const result = await updateTripNotificationPreferences(tripId, updatedPreferences)

      if (!result.success) {
        throw new Error(result.message || 'Failed to update preferences')
      }

      onUpdate?.()

      toast({
        title: 'Preferences updated',
        description: `${getEventTypeLabel(eventType)} notifications have been updated for this trip.`,
      })
    } catch (error) {
      // Rollback optimistic update
      setLocalPreferences(tripPreferences)

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update preferences',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async (eventType: NotificationEventType) => {
    try {
      setIsSaving(true)

      // Set to null to inherit from global
      const updatedPreferences: TripNotificationPreferences = {
        ...localPreferences,
        [eventType]: null,
      }
      setLocalPreferences(updatedPreferences)

      // Save to server
      const result = await updateTripNotificationPreferences(tripId, updatedPreferences)

      if (!result.success) {
        throw new Error(result.message || 'Failed to reset preference')
      }

      onUpdate?.()

      toast({
        title: 'Preference reset',
        description: `${getEventTypeLabel(eventType)} now inherits from your global settings.`,
      })
    } catch (error) {
      // Rollback optimistic update
      setLocalPreferences(tripPreferences)

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reset preference',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Trip Notifications</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Control which notifications you receive for this specific trip. By default, these
            inherit from your global notification settings.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {EVENT_TYPES.map(eventType => {
          const isInherited = isPreferenceInherited(eventType, localPreferences)
          const effectiveValue = getEffectivePreference(
            eventType,
            localPreferences,
            globalPreferences,
            'email'
          )
          const tripValue = localPreferences?.[eventType]

          return (
            <div
              key={eventType}
              className="flex items-start justify-between gap-4 p-4 border rounded-lg"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`trip_${eventType}`} className="cursor-pointer font-medium">
                    {getEventTypeLabel(eventType)}
                  </Label>
                  {isInherited && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Using global settings
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {getEventTypeDescription(eventType)}
                </p>
                {isInherited && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Currently {effectiveValue ? 'enabled' : 'disabled'} in your global settings
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isInherited && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReset(eventType)}
                    disabled={isSaving}
                    className="text-xs"
                  >
                    Reset
                  </Button>
                )}
                <Switch
                  id={`trip_${eventType}`}
                  checked={
                    tripValue !== null && tripValue !== undefined ? tripValue : effectiveValue
                  }
                  onCheckedChange={value => handleToggle(eventType, value)}
                  disabled={isSaving}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="flex-1 text-sm text-blue-900 dark:text-blue-100">
          <p className="font-medium mb-1">How trip notifications work</p>
          <ul className="space-y-1 text-blue-800 dark:text-blue-200">
            <li>
              • <strong>Using global settings:</strong> Preference inherits from your global
              notification settings
            </li>
            <li>
              • <strong>Toggle on/off:</strong> Override global settings for this specific trip
            </li>
            <li>
              • <strong>Reset:</strong> Return to using your global settings
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
