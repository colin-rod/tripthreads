/**
 * Stripe Checkout Session Creation Endpoint
 *
 * Phase: 3.2 (CRO-XXX - Stripe Checkout)
 * POST /api/create-checkout
 *
 * Creates a Stripe Checkout session for Pro subscriptions with adaptive pricing.
 * Supports monthly, yearly, and one-off plans.
 */

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import { STRIPE_PRICES } from '@/lib/stripe/config'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'

interface CheckoutRequest {
  priceId: string
}

interface CheckoutResponse {
  url?: string
  sessionId?: string
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<CheckoutResponse>> {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Rate limiting (100 API calls per minute per user)
    const rateLimitResult = await checkRateLimit(user.id, 'api_call', 'create-checkout')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult) as NextResponse<CheckoutResponse>
    }

    // 3. Parse and validate request body
    const body: CheckoutRequest = await request.json()
    const { priceId } = body

    if (!priceId) {
      return NextResponse.json({ error: 'Missing required field: priceId' }, { status: 400 })
    }

    // 4. Validate priceId format
    if (!priceId.startsWith('price_')) {
      return NextResponse.json(
        { error: 'Invalid priceId format (must start with price_)' },
        { status: 400 }
      )
    }

    // 5. Validate priceId is one of our configured prices
    const validPriceIds = Object.values(STRIPE_PRICES)
    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json(
        { error: 'Invalid priceId: not a configured price' },
        { status: 400 }
      )
    }

    // 6. Check if user already has an active subscription
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, plan_expires_at')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[create-checkout] Error fetching profile:', profileError)
      Sentry.captureException(profileError, {
        tags: { feature: 'stripe', operation: 'create-checkout' },
        contexts: { user: { id: user.id } },
      })
      return NextResponse.json({ error: 'Failed to check subscription status' }, { status: 500 })
    }

    // Check if user has active Pro subscription
    if (
      profile?.plan === 'pro' &&
      profile.plan_expires_at &&
      new Date(profile.plan_expires_at) > new Date()
    ) {
      return NextResponse.json(
        {
          error: 'You already have an active subscription. Manage it from your profile settings.',
        },
        { status: 400 }
      )
    }

    // 7. Determine checkout mode (subscription vs one-time payment)
    const isOneOff = priceId === STRIPE_PRICES.oneoff
    const mode = isOneOff ? 'payment' : 'subscription'

    // 8. Create Stripe checkout session
    const stripe = getStripe()

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${request.headers.get('host')}`

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: `${baseUrl}/profile?checkout=success`,
      cancel_url: `${baseUrl}/profile?checkout=cancel`,
      metadata: {
        userId: user.id,
        priceId,
      },
      // Allow promotional codes
      allow_promotion_codes: true,
      // Collect billing address for tax calculations
      billing_address_collection: 'required',
      // Set tax calculation mode
      automatic_tax: {
        enabled: false, // Enable in production with Stripe Tax
      },
    })

    // 9. Return checkout URL
    return NextResponse.json({
      url: session.url as string,
      sessionId: session.id,
    })
  } catch (error) {
    console.error('[create-checkout] Unhandled error:', error)

    // Check if it's a Stripe configuration error
    if (error instanceof Error && error.message.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json({ error: 'Stripe not configured correctly' }, { status: 500 })
    }

    // Log to Sentry
    Sentry.captureException(error, {
      tags: { feature: 'stripe', operation: 'create-checkout' },
    })

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Failed to create checkout session: ${error.message}`
            : 'Failed to create checkout session',
      },
      { status: 500 }
    )
  }
}
