/**
 * usePushSubscription Hook
 *
 * Manages web push notification subscription lifecycle:
 * - Check subscription status
 * - Subscribe to push notifications
 * - Unsubscribe from push notifications
 * - Handle permission requests
 *
 * Phase 4: Push Notifications
 */

'use client'

import { useState, useEffect } from 'react'
import {
  updatePushToken,
  clearPushToken,
  getPushTokenStatus,
} from '@/app/actions/push-notifications'
import { toast } from '@/hooks/use-toast'

/**
 * Convert base64 string to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  /**
   * Check if push notifications are supported
   */
  useEffect(() => {
    const supported =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

    setIsSupported(supported)

    if (supported) {
      // Check current subscription status
      checkSubscriptionStatus()
    }
  }, [])

  /**
   * Check if user is currently subscribed
   */
  async function checkSubscriptionStatus() {
    try {
      const status = await getPushTokenStatus()
      setIsSubscribed(status.hasWebToken)
    } catch (error) {
      console.error('Error checking subscription status:', error)
    }
  }

  /**
   * Subscribe to push notifications
   */
  async function subscribe(): Promise<boolean> {
    if (!isSupported) {
      toast({
        title: 'Not supported',
        description: 'Push notifications are not supported in this browser',
        variant: 'destructive',
      })
      return false
    }

    setIsLoading(true)

    try {
      // Request notification permission
      const permission = await Notification.requestPermission()

      if (permission !== 'granted') {
        toast({
          title: 'Permission denied',
          description: 'Please allow notifications to receive updates',
          variant: 'destructive',
        })
        setIsLoading(false)
        return false
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Get VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!vapidPublicKey) {
        console.error('VAPID public key not configured')
        toast({
          title: 'Configuration error',
          description: 'Push notifications are not configured',
          variant: 'destructive',
        })
        setIsLoading(false)
        return false
      }

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      // Save subscription to database
      const result = await updatePushToken('web', JSON.stringify(subscription))

      if (!result.success) {
        throw new Error(result.error || 'Failed to save subscription')
      }

      setIsSubscribed(true)
      toast({
        title: 'Push notifications enabled',
        description: "You'll now receive updates about your trips",
      })
      setIsLoading(false)
      return true
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      toast({
        title: 'Subscription failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
      setIsLoading(false)
      return false
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async function unsubscribe(): Promise<boolean> {
    if (!isSupported) {
      return false
    }

    setIsLoading(true)

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Get current subscription
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe()
      }

      // Clear token from database
      const result = await clearPushToken('web')

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear subscription')
      }

      setIsSubscribed(false)
      toast({
        title: 'Push notifications disabled',
        description: "You won't receive push notifications anymore",
      })
      setIsLoading(false)
      return true
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      toast({
        title: 'Unsubscribe failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
      setIsLoading(false)
      return false
    }
  }

  return {
    isSubscribed,
    isLoading,
    isSupported,
    subscribe,
    unsubscribe,
    checkSubscriptionStatus,
  }
}
