/**
 * Mobile Analytics Module
 *
 * Central export for all analytics functionality in the mobile app.
 * Provides PostHog client, provider, and all event tracking helpers.
 */

// PostHog client and hooks
export { posthog, usePosthog } from './posthog'

// PostHog provider component
export { PostHogProvider } from './posthog-provider'

// All event tracking helpers
export * from './events'
