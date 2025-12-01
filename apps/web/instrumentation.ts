/**
 * Next.js Instrumentation
 *
 * This file is automatically loaded by Next.js to register instrumentation hooks.
 * We use it to initialize Sentry on both server and edge runtimes.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
