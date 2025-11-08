/**
 * Sentry Client-Side Configuration
 *
 * This file initializes Sentry for client-side (browser) error tracking.
 * It captures React errors, API errors, and client-side exceptions.
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development'

Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENVIRONMENT,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 0.0,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Ignore common browser errors that aren't actionable
  ignoreErrors: [
    // Network errors
    'Network request failed',
    'NetworkError',
    'Failed to fetch',
    // Browser extensions
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],

  beforeSend(event, _hint) {
    // Filter out events in development unless you want to see them
    if (SENTRY_ENVIRONMENT === 'development' && !SENTRY_DSN) {
      console.log('Sentry event (not sent in dev without DSN):', event)
      return null
    }

    // Add user context if available
    if (typeof window !== 'undefined') {
      const userId = window.localStorage.getItem('userId')
      if (userId) {
        event.user = { id: userId }
      }
    }

    return event
  },
})
