/**
 * Push Notification Utilities
 *
 * Helper functions for sending push notifications via:
 * - Web Push (VAPID) for browser notifications
 * - Expo Push for mobile notifications
 *
 * Phase 4: Push Notifications
 */

import { Expo, ExpoPushMessage, ExpoPushTicket } from 'npm:expo-server-sdk@3'

/**
 * Push notification payload
 */
export interface PushPayload {
  title: string
  body: string
  url: string
  tag: string
  badge?: number
  requireInteraction?: boolean
}

/**
 * Web Push subscription object (from PushManager.subscribe())
 */
export interface WebPushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Send web push notification using VAPID
 *
 * @param subscription - Web Push subscription object (JSON parsed)
 * @param payload - Notification payload
 */
export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: PushPayload
): Promise<void> {
  // Dynamic import of web-push library
  const webpush = await import('npm:web-push@3')

  // Set VAPID details from environment
  const vapidPublicKey = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID keys not configured')
  }

  webpush.setVapidDetails('mailto:notifications@tripthreads.app', vapidPublicKey, vapidPrivateKey)

  // Prepare notification payload
  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: { url: payload.url },
    tag: payload.tag,
    requireInteraction: payload.requireInteraction || false,
  })

  // Send push notification
  await webpush.sendNotification(subscription, notificationPayload)
}

/**
 * Send mobile push notification via Expo
 *
 * @param expoPushToken - Expo push token (ExponentPushToken[...])
 * @param payload - Notification payload
 * @returns Array of push tickets
 */
export async function sendMobilePush(
  expoPushToken: string,
  payload: PushPayload
): Promise<ExpoPushTicket[]> {
  const expo = new Expo()

  // Validate Expo push token format
  if (!Expo.isExpoPushToken(expoPushToken)) {
    throw new Error(`Invalid Expo push token: ${expoPushToken}`)
  }

  // Prepare Expo push message
  const messages: ExpoPushMessage[] = [
    {
      to: expoPushToken,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: { url: payload.url },
      badge: payload.badge,
      priority: 'high',
      channelId: 'default',
    },
  ]

  // Chunk messages (Expo recommends max 100 per request)
  const chunks = expo.chunkPushNotifications(messages)
  const tickets: ExpoPushTicket[] = []

  // Send each chunk
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk)
      tickets.push(...ticketChunk)
    } catch (error) {
      console.error('Error sending Expo push notification:', error)
      throw error
    }
  }

  // Check for errors in tickets
  for (const ticket of tickets) {
    if (ticket.status === 'error') {
      console.error('Expo push ticket error:', {
        message: ticket.message,
        details: ticket.details,
      })
      throw new Error(`Expo push failed: ${ticket.message}`)
    }
  }

  return tickets
}

/**
 * Format push notification title and body for different event types
 *
 * @param eventType - Type of event
 * @param tripName - Name of the trip
 * @param actorName - Name of user who triggered the event
 * @param details - Event-specific details
 * @returns Formatted title and body
 */
export function formatPushPayload(
  eventType: string,
  tripName: string,
  actorName: string,
  details: Record<string, string>
): { title: string; body: string } {
  switch (eventType) {
    case 'expenses':
      return {
        title: `💰 New expense in ${tripName}`,
        body: `${actorName} added "${details.description}" - ${details.amount}`,
      }
    case 'chat':
      return {
        title: `💬 ${actorName} in ${tripName}`,
        body: details.message || 'New message',
      }
    case 'itinerary':
      return {
        title: `✈️ Itinerary update in ${tripName}`,
        body: `${actorName} ${details.action} ${details.itemType}: ${details.title}`,
      }
    case 'settlements':
      return {
        title: `💳 Settlement update in ${tripName}`,
        body: `${actorName} marked settlement as ${details.status}`,
      }
    case 'invites':
      return {
        title: `🎉 ${actorName} joined ${tripName}`,
        body: 'Someone accepted your trip invitation',
      }
    case 'photos':
      return {
        title: `📸 New photo in ${tripName}`,
        body: `${actorName} added ${details.count} photo${details.count === '1' ? '' : 's'}`,
      }
    default:
      return {
        title: `Update in ${tripName}`,
        body: `${actorName} made a change`,
      }
  }
}
