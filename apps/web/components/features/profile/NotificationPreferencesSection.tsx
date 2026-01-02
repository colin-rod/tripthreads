/**
 * Notification Preferences Section
 *
 * Allows users to configure email and push notification preferences.
 * Features auto-save on toggle.
 */

'use client'

import * as React from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { updateNotificationPreferences } from '@/app/actions/profile'
import type { Database } from '@tripthreads/core/types/database'

type User = Database['public']['Tables']['profiles']['Row']

interface NotificationPreferencesSectionProps {
  user: User
  onUpdate?: () => void
}

const DEFAULT_PREFERENCES = {
  email_trip_invites: true,
  email_expense_updates: true,
  email_trip_updates: true,
  push_trip_invites: true,
  push_expense_updates: true,
  push_trip_updates: true,
}

export function NotificationPreferencesSection({
  user,
  onUpdate,
}: NotificationPreferencesSectionProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = React.useState(false)

  // Parse notification preferences from user object
  const preferences = React.useMemo(() => {
    if (user.notification_preferences && typeof user.notification_preferences === 'object') {
      return {
        ...DEFAULT_PREFERENCES,
        ...(user.notification_preferences as Record<string, boolean>),
      }
    }
    return DEFAULT_PREFERENCES
  }, [user.notification_preferences])

  const handleToggle = async (key: string, value: boolean) => {
    try {
      setIsSaving(true)
      const updatedPreferences = {
        ...preferences,
        [key]: value,
      }
      await updateNotificationPreferences(updatedPreferences)
      onUpdate?.()
      toast({
        title: 'Preferences updated',
        description: 'Your notification preferences have been saved.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update preferences',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Email notifications */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-1">Email Notifications</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Receive email updates about your trips and expenses
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="email_trip_invites" className="cursor-pointer">
              Trip invitations
            </Label>
            <Switch
              id="email_trip_invites"
              checked={preferences.email_trip_invites}
              onCheckedChange={value => handleToggle('email_trip_invites', value)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="email_expense_updates" className="cursor-pointer">
              Expense updates
            </Label>
            <Switch
              id="email_expense_updates"
              checked={preferences.email_expense_updates}
              onCheckedChange={value => handleToggle('email_expense_updates', value)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="email_trip_updates" className="cursor-pointer">
              Trip updates
            </Label>
            <Switch
              id="email_trip_updates"
              checked={preferences.email_trip_updates}
              onCheckedChange={value => handleToggle('email_trip_updates', value)}
              disabled={isSaving}
            />
          </div>
        </div>
      </div>

      {/* Push notifications */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-1">Push Notifications</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Receive instant push notifications on your devices
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="push_trip_invites" className="cursor-pointer">
              Trip invitations
            </Label>
            <Switch
              id="push_trip_invites"
              checked={preferences.push_trip_invites}
              onCheckedChange={value => handleToggle('push_trip_invites', value)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="push_expense_updates" className="cursor-pointer">
              Expense updates
            </Label>
            <Switch
              id="push_expense_updates"
              checked={preferences.push_expense_updates}
              onCheckedChange={value => handleToggle('push_expense_updates', value)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="push_trip_updates" className="cursor-pointer">
              Trip updates
            </Label>
            <Switch
              id="push_trip_updates"
              checked={preferences.push_trip_updates}
              onCheckedChange={value => handleToggle('push_trip_updates', value)}
              disabled={isSaving}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
