/**
 * Sentry Server-Side Configuration
 *
 * This file initializes Sentry for server-side (Node.js) error tracking.
 * It captures errors in API routes, server actions, and SSR.
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

  beforeSend(event, _hint) {
    // Filter out events in development unless you want to see them
    if (SENTRY_ENVIRONMENT === 'development' && !SENTRY_DSN) {
      console.log('Sentry server event (not sent in dev without DSN):', event)
      return null
    }

    // Scrub sensitive data from request headers
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
    }

    return event
  },
})
