/**
 * Stripe Client Initialization
 *
 * Provides both server-side and client-side Stripe SDK instances.
 * Server-side client is used for API operations (creating checkout sessions, webhooks).
 * Client-side client is used for Stripe.js (checkout redirect, payment elements).
 *
 * Phase: 3 (Stripe Integration)
 * Created: 2025-11-11
 */

import Stripe from 'stripe'
import { loadStripe, type Stripe as StripeClient } from '@stripe/stripe-js'

// ============================================================================
// Server-Side Stripe Client
// ============================================================================

/**
 * Server-side Stripe client instance
 * Used for API operations (creating checkout sessions, managing subscriptions, webhooks)
 *
 * @throws Error if STRIPE_SECRET_KEY is not set
 */
export function getStripeServerClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY environment variable is not set. See .env.example for setup instructions.'
    )
  }

  // Create Stripe instance with TypeScript support
  return new Stripe(secretKey, {
    apiVersion: '2025-10-29.clover', // Use latest API version
    typescript: true,
    appInfo: {
      name: 'TripThreads',
      version: '0.2.0',
      url: 'https://tripthreads.com',
    },
  })
}

// Singleton instance for server-side operations
let stripeServerInstance: Stripe | null = null

/**
 * Get singleton Stripe server client
 * Reuses the same instance across multiple calls to avoid creating multiple clients
 */
export function getStripe(): Stripe {
  if (!stripeServerInstance) {
    stripeServerInstance = getStripeServerClient()
  }
  return stripeServerInstance
}

// ============================================================================
// Client-Side Stripe Client (Stripe.js)
// ============================================================================

/**
 * Client-side Stripe.js instance (for browser)
 * Used for redirecting to Stripe Checkout, handling payment elements, etc.
 *
 * @throws Error if NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set
 */
let stripeClientPromise: Promise<StripeClient | null> | null = null

export function getStripeClient(): Promise<StripeClient | null> {
  if (!stripeClientPromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

    if (!publishableKey) {
      throw new Error(
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is not set. See .env.example for setup instructions.'
      )
    }

    stripeClientPromise = loadStripe(publishableKey)
  }

  return stripeClientPromise
}

// ============================================================================
// Webhook Signature Verification
// ============================================================================

/**
 * Verify Stripe webhook signature
 * Used in webhook handlers to ensure requests are from Stripe
 *
 * @param payload - Raw request body (string)
 * @param signature - Stripe signature header
 * @returns Parsed Stripe event
 * @throws Error if signature verification fails or webhook secret is not set
 */
export function verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET environment variable is not set. See .env.example for setup instructions.'
    )
  }

  const stripe = getStripe()

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    throw new Error(
      `Webhook signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

// ============================================================================
// Environment Validation
// ============================================================================

/**
 * Validate that all required Stripe environment variables are set
 * Useful for startup checks or health endpoints
 *
 * @param includeWebhook - Whether to check webhook secret (optional, only needed for production)
 * @throws Error if any required variables are missing
 */
export function validateStripeEnvironment(includeWebhook = false): void {
  const missing: string[] = []

  if (!process.env.STRIPE_SECRET_KEY) {
    missing.push('STRIPE_SECRET_KEY')
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    missing.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
  }

  if (includeWebhook && !process.env.STRIPE_WEBHOOK_SECRET) {
    missing.push('STRIPE_WEBHOOK_SECRET')
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required Stripe environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\nSee .env.example for setup instructions.`
    )
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getStripe,
  getStripeClient,
  verifyWebhookSignature,
  validateStripeEnvironment,
}
