/**
 * Push Subscription Prompt
 *
 * Prompts users to enable push notifications when they're not subscribed.
 * Shows after user is authenticated and has not dismissed the prompt.
 * Auto-dismisses after successful subscription.
 */

'use client'

import * as React from 'react'
import { Bell, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { usePushSubscription } from '@/lib/hooks/use-push-subscription'
import { useToast } from '@/hooks/use-toast'

export function PushSubscriptionPrompt() {
  const { isSubscribed, isLoading, subscribe } = usePushSubscription()
  const { toast } = useToast()
  const [dismissed, setDismissed] = React.useState(false)

  // Check localStorage for previous dismissal
  React.useEffect(() => {
    const wasDismissed = localStorage.getItem('push-prompt-dismissed')
    if (wasDismissed === 'true') {
      setDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('push-prompt-dismissed', 'true')
  }

  const handleSubscribe = async () => {
    const success = await subscribe()
    if (success) {
      toast({
        title: 'Push notifications enabled',
        description: "You'll now receive instant updates about your trips",
      })
    } else {
      toast({
        title: 'Permission denied',
        description: 'You can enable push notifications later in Settings',
        variant: 'destructive',
      })
    }
  }

  // Don't show if already subscribed or dismissed
  if (isSubscribed || dismissed) return null

  return (
    <Alert className="relative">
      <Bell className="h-4 w-4" />
      <AlertTitle>Enable Push Notifications</AlertTitle>
      <AlertDescription className="mt-2">
        Get instant updates about trip invites, expenses, messages, and more
      </AlertDescription>
      <div className="flex gap-2 mt-4">
        <Button onClick={handleSubscribe} disabled={isLoading} size="sm">
          {isLoading ? 'Enabling...' : 'Enable Notifications'}
        </Button>
        <Button variant="ghost" onClick={handleDismiss} size="sm">
          Maybe Later
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  )
}
