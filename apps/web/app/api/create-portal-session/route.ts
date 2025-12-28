/**
 * Stripe Customer Portal Session Creation
 *
 * Phase: 3.4 (Stripe Customer Portal)
 * POST /api/create-portal-session
 *
 * Creates a Stripe Customer Portal session for Pro users to manage their subscriptions.
 * Allows users to:
 * - Update payment methods
 * - View billing history
 * - Cancel or resume subscriptions
 * - Download invoices
 */

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getStripe } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'

interface PortalSessionResponse {
  url?: string
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<PortalSessionResponse>> {
  try {
    // 1. Verify user is authenticated
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // 2. Get user profile with Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, stripe_customer_id, plan')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[create-portal-session] Error fetching user profile:', profileError)
      Sentry.captureException(profileError, {
        tags: { feature: 'stripe', operation: 'portal-session' },
        contexts: { user: { id: user.id } },
      })
      return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
    }

    // 3. Validate user has Stripe customer ID and Pro plan
    if (!profile.stripe_customer_id || profile.plan !== 'pro') {
      return NextResponse.json(
        { error: 'No active subscription found. Please subscribe to Pro first.' },
        { status: 400 }
      )
    }

    // 4. Create Stripe Customer Portal session
    const stripe = getStripe()
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/settings?tab=subscription`

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    })

    console.log(`[create-portal-session] Portal session created for user ${user.id}`)

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('[create-portal-session] Unhandled error:', error)

    // Log to Sentry
    Sentry.captureException(error, {
      tags: { feature: 'stripe', operation: 'portal-session' },
    })

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create portal session. Please try again.',
      },
      { status: 500 }
    )
  }
}
