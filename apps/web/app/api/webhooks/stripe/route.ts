/**
 * Stripe Webhook Handler
 *
 * Phase: 3.3 (Stripe Webhooks)
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 * Events handled:
 * - checkout.session.completed: Upgrade user to Pro when payment succeeds
 * - customer.subscription.updated: Update subscription details
 * - customer.subscription.deleted: Downgrade user to Free
 * - invoice.payment_failed: Log payment failures
 */

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import type Stripe from 'stripe'
import { verifyWebhookSignature } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'

interface WebhookResponse {
  received?: boolean
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<WebhookResponse>> {
  try {
    // 1. Get raw request body and stripe signature header
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    // 2. Verify webhook signature
    let event: Stripe.Event
    try {
      event = verifyWebhookSignature(body, signature)
    } catch (error) {
      console.error('[stripe-webhook] Signature verification failed:', error)
      return NextResponse.json(
        {
          error: 'Invalid signature',
        },
        { status: 400 }
      )
    }

    // 3. Handle different event types
    console.log(`[stripe-webhook] Handling event: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event)
        break

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[stripe-webhook] Unhandled error:', error)

    // Log to Sentry
    Sentry.captureException(error, {
      tags: { feature: 'stripe', operation: 'webhook' },
    })

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      },
      { status: 500 }
    )
  }
}

/**
 * Handle checkout.session.completed event
 * Upgrades user to Pro plan when payment succeeds
 */
async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session
  const userId = session.metadata?.userId || session.client_reference_id

  if (!userId) {
    console.error('[stripe-webhook] Missing userId in checkout session')
    return
  }

  const supabase = await createClient()

  // Determine if this is a subscription or one-time payment
  const isSubscription = session.mode === 'subscription'
  const priceId = session.metadata?.priceId

  const updateData: {
    plan: string
    stripe_customer_id?: string
    stripe_subscription_id?: string | null
    subscription_price_id?: string | null
    plan_expires_at?: string | null
  } = {
    plan: 'pro',
    stripe_customer_id: session.customer as string,
  }

  if (isSubscription) {
    // Subscription: Link Stripe subscription ID
    updateData.stripe_subscription_id = session.subscription as string
    updateData.subscription_price_id = priceId || null
  } else {
    // One-time payment: Set expiry to 30 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)
    updateData.plan_expires_at = expiresAt.toISOString()
    updateData.stripe_subscription_id = null
    updateData.subscription_price_id = priceId || null
  }

  const { data: _data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()

  if (error) {
    console.error('[stripe-webhook] Error updating user plan:', error)
    Sentry.captureException(error, {
      tags: { feature: 'stripe', operation: 'checkout-completed' },
      contexts: { user: { id: userId }, session: { id: session.id } },
    })
    throw new Error('Failed to update user plan')
  }

  console.log(
    `[stripe-webhook] User ${userId} upgraded to Pro (${isSubscription ? 'subscription' : 'one-time'})`
  )
}

/**
 * Handle customer.subscription.updated event
 * Updates subscription expiry date and handles cancellations
 */
async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('[stripe-webhook] Missing userId in subscription')
    return
  }

  const supabase = await createClient()

  // Check subscription status
  if (subscription.status === 'canceled') {
    // Subscription was canceled - downgrade to free
    const { data: _data1, error } = await supabase
      .from('profiles')
      .update({
        plan: 'free',
        plan_expires_at: null,
      })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('[stripe-webhook] Error downgrading user:', error)
      Sentry.captureException(error, {
        tags: { feature: 'stripe', operation: 'subscription-canceled' },
        contexts: { user: { id: userId }, subscription: { id: subscription.id } },
      })
      throw new Error('Failed to downgrade user')
    }

    console.log(`[stripe-webhook] User ${userId} downgraded to Free (subscription canceled)`)
  } else {
    // Update expiry date based on current_period_end
    const expiresAt = new Date(
      (subscription as unknown as { current_period_end: number }).current_period_end * 1000
    )

    const { data: _data2, error } = await supabase
      .from('profiles')
      .update({
        plan_expires_at: expiresAt.toISOString(),
      })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('[stripe-webhook] Error updating subscription:', error)
      Sentry.captureException(error, {
        tags: { feature: 'stripe', operation: 'subscription-updated' },
        contexts: { user: { id: userId }, subscription: { id: subscription.id } },
      })
      throw new Error('Failed to update subscription')
    }

    console.log(
      `[stripe-webhook] User ${userId} subscription updated (expires: ${expiresAt.toISOString()})`
    )
  }
}

/**
 * Handle customer.subscription.deleted event
 * Downgrades user to Free plan
 */
async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('[stripe-webhook] Missing userId in subscription')
    return
  }

  const supabase = await createClient()

  const { data: _data3, error } = await supabase
    .from('profiles')
    .update({
      plan: 'free',
      plan_expires_at: null,
      stripe_subscription_id: null,
    })
    .eq('id', userId)
    .select()

  if (error) {
    console.error('[stripe-webhook] Error downgrading user:', error)
    Sentry.captureException(error, {
      tags: { feature: 'stripe', operation: 'subscription-deleted' },
      contexts: { user: { id: userId }, subscription: { id: subscription.id } },
    })
    throw new Error('Failed to downgrade user')
  }

  console.log(`[stripe-webhook] User ${userId} downgraded to Free (subscription deleted)`)
}

/**
 * Handle invoice.payment_failed event
 * Logs payment failures (Stripe will retry automatically)
 */
async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice

  const invoiceWithSub = invoice as {
    subscription?: string | Stripe.Subscription
    customer_email?: string
  }

  console.warn(`[stripe-webhook] Payment failed for invoice ${invoice.id}`, {
    customer: invoice.customer,
    subscription: invoiceWithSub.subscription,
    email: invoiceWithSub.customer_email,
  })

  // Log to Sentry for monitoring
  Sentry.captureMessage('Stripe payment failed', {
    level: 'warning',
    tags: { feature: 'stripe', operation: 'payment-failed' },
    extra: {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      subscriptionId: invoiceWithSub.subscription,
      email: invoiceWithSub.customer_email,
    },
  })

  // Note: We don't immediately downgrade the user
  // Stripe will retry the payment automatically
  // If all retries fail, Stripe will send a subscription.deleted event
}
