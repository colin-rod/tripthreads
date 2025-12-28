/**
 * Stripe Configuration Validation Endpoint
 *
 * Phase: 3.1 (CRO-747)
 * GET /api/stripe/validate-config
 *
 * Validates all Stripe environment variables for adaptive pricing setup.
 * Returns configuration status, detected mode (test/live), and any errors or warnings.
 */

import { NextResponse } from 'next/server'

interface ValidationResponse {
  success: boolean
  mode?: 'test' | 'live'
  config?: {
    apiKeys: {
      secret: string
      publishable: string
      webhookSecret: string
    }
    products: {
      monthly: string
      yearly: string
      oneoff: string
    }
    prices: {
      monthly: string
      yearly: string
      oneoff: string
    }
  }
  errors?: string[]
  warnings?: string[]
}

export async function GET(): Promise<NextResponse<ValidationResponse>> {
  try {
    const errors: string[] = []
    const warnings: string[] = []

    // 1. Check all required environment variables
    const apiKeys = {
      secret: process.env.STRIPE_SECRET_KEY,
      publishable: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    }

    const products = {
      monthly: process.env.STRIPE_PRODUCT_PRO_MONTHLY,
      yearly: process.env.STRIPE_PRODUCT_PRO_YEARLY,
      oneoff: process.env.STRIPE_PRODUCT_PRO_ONEOFF,
    }

    const prices = {
      monthly: process.env.STRIPE_PRICE_MONTHLY,
      yearly: process.env.STRIPE_PRICE_YEARLY,
      oneoff: process.env.STRIPE_PRICE_ONEOFF,
    }

    // 2. Check for missing variables
    if (!apiKeys.secret) errors.push('Missing STRIPE_SECRET_KEY')
    if (!apiKeys.publishable) errors.push('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
    if (!apiKeys.webhookSecret) errors.push('Missing STRIPE_WEBHOOK_SECRET')

    if (!products.monthly) errors.push('Missing STRIPE_PRODUCT_PRO_MONTHLY')
    if (!products.yearly) errors.push('Missing STRIPE_PRODUCT_PRO_YEARLY')
    if (!products.oneoff) errors.push('Missing STRIPE_PRODUCT_PRO_ONEOFF')

    if (!prices.monthly) errors.push('Missing STRIPE_PRICE_MONTHLY')
    if (!prices.yearly) errors.push('Missing STRIPE_PRICE_YEARLY')
    if (!prices.oneoff) errors.push('Missing STRIPE_PRICE_ONEOFF')

    // Return early if variables are missing
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          errors,
        },
        { status: 400 }
      )
    }

    // 3. Validate ID formats
    if (apiKeys.secret && !apiKeys.secret.startsWith('sk_')) {
      errors.push('Invalid STRIPE_SECRET_KEY format (must start with sk_)')
    }
    if (apiKeys.publishable && !apiKeys.publishable.startsWith('pk_')) {
      errors.push('Invalid NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY format (must start with pk_)')
    }
    if (
      apiKeys.webhookSecret &&
      apiKeys.webhookSecret !== 'whsec_placeholder' &&
      !apiKeys.webhookSecret.startsWith('whsec_')
    ) {
      errors.push('Invalid STRIPE_WEBHOOK_SECRET format (must start with whsec_)')
    }

    if (products.monthly && !products.monthly.startsWith('prod_')) {
      errors.push('Invalid STRIPE_PRODUCT_PRO_MONTHLY format (must start with prod_)')
    }
    if (products.yearly && !products.yearly.startsWith('prod_')) {
      errors.push('Invalid STRIPE_PRODUCT_PRO_YEARLY format (must start with prod_)')
    }
    if (products.oneoff && !products.oneoff.startsWith('prod_')) {
      errors.push('Invalid STRIPE_PRODUCT_PRO_ONEOFF format (must start with prod_)')
    }

    if (prices.monthly && !prices.monthly.startsWith('price_')) {
      errors.push('Invalid STRIPE_PRICE_MONTHLY format (must start with price_)')
    }
    if (prices.yearly && !prices.yearly.startsWith('price_')) {
      errors.push('Invalid STRIPE_PRICE_YEARLY format (must start with price_)')
    }
    if (prices.oneoff && !prices.oneoff.startsWith('price_')) {
      errors.push('Invalid STRIPE_PRICE_ONEOFF format (must start with price_)')
    }

    // Return early if format errors found
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          errors,
        },
        { status: 400 }
      )
    }

    // 4. Detect mode (test vs live)
    const secretMode = apiKeys.secret!.includes('_test_') ? 'test' : 'live'
    const publishableMode = apiKeys.publishable!.includes('_test_') ? 'test' : 'live'

    // 5. Check for mode mismatch
    if (secretMode !== publishableMode) {
      errors.push(
        `API key mode mismatch: secret key is in ${secretMode} mode, publishable key is in ${publishableMode} mode`
      )
      return NextResponse.json(
        {
          success: false,
          errors,
        },
        { status: 400 }
      )
    }

    // 6. Check for webhook placeholder
    if (apiKeys.webhookSecret === 'whsec_placeholder') {
      warnings.push(
        'Webhook secret is set to placeholder. Configure a real webhook secret in Phase 3.3 for production use.'
      )
    }

    // 7. Build success response
    return NextResponse.json({
      success: true,
      mode: secretMode,
      config: {
        apiKeys: {
          secret: maskKey(apiKeys.secret!),
          publishable: maskKey(apiKeys.publishable!),
          webhookSecret: maskKey(apiKeys.webhookSecret!),
        },
        products: {
          monthly: products.monthly!,
          yearly: products.yearly!,
          oneoff: products.oneoff!,
        },
        prices: {
          monthly: prices.monthly!,
          yearly: prices.yearly!,
          oneoff: prices.oneoff!,
        },
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    })
  } catch (error) {
    console.error('Error validating Stripe configuration:', error)
    return NextResponse.json(
      {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      },
      { status: 500 }
    )
  }
}

/**
 * Mask sensitive keys for safe display
 * Shows first 8 characters and last 4 characters
 */
function maskKey(key: string): string {
  if (key === 'whsec_placeholder') return key
  if (key.length <= 12) return key.slice(0, 4) + '****'
  return key.slice(0, 8) + '****' + key.slice(-4)
}
