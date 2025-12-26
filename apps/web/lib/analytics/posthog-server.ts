/**
 * Server-side PostHog client for Next.js server actions
 *
 * Uses posthog-node for tracking events from the server.
 * This allows analytics to work in both client and server environments.
 *
 * Note: This file is dynamically imported only on the server.
 */

import { PostHog } from 'posthog-node'

let serverPosthog: PostHog | null = null

/**
 * Get or create the server-side PostHog client
 *
 * Returns null if NEXT_PUBLIC_POSTHOG_KEY is not configured.
 * Uses singleton pattern to reuse the same client instance.
 */
export function getServerPosthog(): PostHog | null {
  // Skip if no API key configured
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null
  }

  // Return existing instance
  if (serverPosthog) {
    return serverPosthog
  }

  // Create new instance
  serverPosthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
  })

  return serverPosthog
}

/**
 * Capture an event on the server
 *
 * @param distinctId - User ID or session ID to identify the user
 * @param event - Event name (e.g., 'trip_created')
 * @param properties - Event properties (optional)
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const client = getServerPosthog()
  if (client) {
    client.capture({
      distinctId,
      event,
      properties,
    })
  }
}
