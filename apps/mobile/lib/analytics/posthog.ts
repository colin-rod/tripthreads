/**
 * PostHog Client for Mobile
 *
 * Provides a simple interface to the PostHog client.
 * Exports the client and hook for use throughout the app.
 */

import { getPostHogClient } from './posthog-provider'

// Type compatible with both web and mobile PostHog SDKs
type PostHogProperties = Record<string, string | number | boolean | string[] | null | undefined>

export const posthog = {
  capture: (event: string, properties?: PostHogProperties) => {
    const client = getPostHogClient()
    client.capture(event, properties as any) // eslint-disable-line @typescript-eslint/no-explicit-any
  },
  identify: (userId: string, properties?: PostHogProperties) => {
    const client = getPostHogClient()
    client.identify(userId, properties as any) // eslint-disable-line @typescript-eslint/no-explicit-any
  },
  reset: () => {
    const client = getPostHogClient()
    client.reset()
  },
}

// Note: posthog-react-native doesn't provide a usePosthog hook like the web SDK
// For mobile, we use the posthog object directly
export const usePosthog = () => posthog
