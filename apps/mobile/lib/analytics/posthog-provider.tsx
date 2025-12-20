/**
 * PostHog Analytics Provider for Mobile
 *
 * Provides PostHog analytics context for React Native mobile app.
 * Handles user identification and session management.
 */

import React, { useEffect } from 'react'
import PostHog from 'posthog-react-native'
import { useAuth } from '../auth/auth-context'

// Get environment variables
const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || ''
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

// Initialize PostHog client
let posthogClient: PostHog | null = null

export function getPostHogClient(): PostHog {
  if (!posthogClient) {
    if (!POSTHOG_API_KEY) {
      console.warn('[PostHog] API key not configured')
      // Return a mock client that does nothing
      return {
        capture: () => {},
        identify: () => {},
        reset: () => {},
      } as unknown as PostHog
    }

    posthogClient = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
    })
  }

  return posthogClient
}

interface PostHogProviderProps {
  children: React.ReactNode
}

/**
 * PostHog Provider Component
 *
 * Wraps the app to provide analytics context.
 * Automatically identifies/resets user when auth state changes.
 */
export function PostHogProvider({ children }: PostHogProviderProps) {
  const { user } = useAuth()

  useEffect(() => {
    const client = getPostHogClient()

    if (user) {
      // Identify user with PostHog
      client.identify(user.id, {
        email: user.email || '',
        name: user.user_metadata?.full_name || user.email || 'Unknown',
        platform: 'mobile',
      } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    } else {
      // Reset PostHog session when user logs out
      client.reset()
    }
  }, [user])

  return <>{children}</>
}
