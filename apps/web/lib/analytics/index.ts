/**
 * Analytics Module - Barrel Export
 *
 * Central export point for all analytics functionality.
 *
 * Usage:
 * ```typescript
 * import { posthog, trackSignup, trackTripCreated } from '@/lib/analytics'
 * ```
 */

// PostHog client and hooks
export { posthog, usePosthog } from './posthog'

// PostHog provider component
export { PostHogProvider } from './posthog-provider'

// All event tracking helpers
export * from './events'

// Analytics initialization
export { initializeAnalytics } from './init'
