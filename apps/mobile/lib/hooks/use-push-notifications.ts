/**
 * usePushNotifications Hook (Mobile)
 *
 * Manages Expo push notification lifecycle:
 * - Register for push notifications
 * - Request permissions
 * - Handle foreground/background notifications
 * - Save token to database
 *
 * Phase 4: Push Notifications
 */

import { useState, useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { router } from 'expo-router'
import { updatePushToken } from '../api/push-notifications'

/**
 * Configure notification handler for foreground notifications
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>()
  const [notification, setNotification] = useState<Notifications.Notification | undefined>()
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined)
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined)

  useEffect(() => {
    // Register for push notifications on mount
    registerForPushNotificationsAsync()

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received (foreground):', notification)
      setNotification(notification)
    })

    // Listen for notification interactions (user tapped notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response)
      handleNotificationResponse(response)
    })

    // Cleanup subscriptions
    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [])

  /**
   * Register for push notifications
   */
  async function registerForPushNotificationsAsync() {
    let token: string | undefined

    // Only works on physical devices
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices')
      return
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      // Exit if permission not granted
      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted')
        return
      }

      // Get Expo push token
      // TODO: Replace with actual Expo project ID
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: 'your-expo-project-id', // TODO: Update this
        })
      ).data

      console.log('Expo Push Token:', token)
      setExpoPushToken(token)

      // Save token to database
      await updatePushToken('mobile', token)
    } catch (error) {
      console.error('Error registering for push notifications:', error)
    }

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F97316', // TripThreads orange
      })
    }

    return token
  }

  /**
   * Handle notification response (user tapped notification)
   */
  function handleNotificationResponse(response: Notifications.NotificationResponse) {
    const url = response.notification.request.content.data?.url as string | undefined

    if (url) {
      // Parse deep link URL
      try {
        const urlObj = new URL(url)
        const path = urlObj.pathname

        // Navigate to the appropriate route
        console.log('Navigating to:', path)
        router.push(path as never)
      } catch (error) {
        console.error('Error parsing notification URL:', error)
        // Fallback to trips list
        router.push('/(app)/trips')
      }
    }
  }

  return {
    expoPushToken,
    notification,
    registerForPushNotificationsAsync,
  }
}
