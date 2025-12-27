/**
 * Tests for Stripe Configuration Validation Endpoint
 *
 * Phase: 3.1 (CRO-747)
 * Tests the /api/stripe/validate-config endpoint that validates
 * all Stripe environment variables for adaptive pricing setup.
 */

import { GET } from './route'

describe('GET /api/stripe/validate-config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv
  })

  it('returns success when all 9 Stripe variables are configured', async () => {
    // Set all required environment variables
    process.env.STRIPE_SECRET_KEY = 'sk_test_123456789'
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123456789'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123'
    process.env.STRIPE_PRODUCT_PRO_MONTHLY = 'prod_monthly123'
    process.env.STRIPE_PRODUCT_PRO_YEARLY = 'prod_yearly123'
    process.env.STRIPE_PRODUCT_PRO_ONEOFF = 'prod_oneoff123'
    process.env.STRIPE_PRICE_MONTHLY = 'price_monthly123'
    process.env.STRIPE_PRICE_YEARLY = 'price_yearly123'
    process.env.STRIPE_PRICE_ONEOFF = 'price_oneoff123'

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.mode).toBe('test')
    expect(data.config).toBeDefined()
    expect(data.config.apiKeys).toBeDefined()
    expect(data.config.products).toBeDefined()
    expect(data.config.prices).toBeDefined()
  })

  it('detects missing STRIPE_SECRET_KEY', async () => {
    delete process.env.STRIPE_SECRET_KEY
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123456789'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123'
    process.env.STRIPE_PRODUCT_PRO_MONTHLY = 'prod_monthly123'
    process.env.STRIPE_PRODUCT_PRO_YEARLY = 'prod_yearly123'
    process.env.STRIPE_PRODUCT_PRO_ONEOFF = 'prod_oneoff123'
    process.env.STRIPE_PRICE_MONTHLY = 'price_monthly123'
    process.env.STRIPE_PRICE_YEARLY = 'price_yearly123'
    process.env.STRIPE_PRICE_ONEOFF = 'price_oneoff123'

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.errors).toContain('Missing STRIPE_SECRET_KEY')
  })

  it('detects missing product or price IDs', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123456789'
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123456789'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123'
    delete process.env.STRIPE_PRODUCT_PRO_MONTHLY
    delete process.env.STRIPE_PRICE_MONTHLY
    process.env.STRIPE_PRODUCT_PRO_YEARLY = 'prod_yearly123'
    process.env.STRIPE_PRODUCT_PRO_ONEOFF = 'prod_oneoff123'
    process.env.STRIPE_PRICE_YEARLY = 'price_yearly123'
    process.env.STRIPE_PRICE_ONEOFF = 'price_oneoff123'

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.errors).toContain('Missing STRIPE_PRODUCT_PRO_MONTHLY')
    expect(data.errors).toContain('Missing STRIPE_PRICE_MONTHLY')
  })

  it('validates ID formats (prod_, price_, sk_, pk_)', async () => {
    process.env.STRIPE_SECRET_KEY = 'invalid_secret_key' // Wrong format
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123456789'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123'
    process.env.STRIPE_PRODUCT_PRO_MONTHLY = 'invalid_product' // Wrong format
    process.env.STRIPE_PRODUCT_PRO_YEARLY = 'prod_yearly123'
    process.env.STRIPE_PRODUCT_PRO_ONEOFF = 'prod_oneoff123'
    process.env.STRIPE_PRICE_MONTHLY = 'invalid_price' // Wrong format
    process.env.STRIPE_PRICE_YEARLY = 'price_yearly123'
    process.env.STRIPE_PRICE_ONEOFF = 'price_oneoff123'

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.errors.length).toBeGreaterThan(0)
    // Should detect invalid formats
    expect(data.errors.some((e: string) => e.includes('Invalid') || e.includes('format'))).toBe(
      true
    )
  })

  it('detects test/live mode mismatch in API keys', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123456789' // Test mode
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_live_123456789' // Live mode (mismatch!)
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123'
    process.env.STRIPE_PRODUCT_PRO_MONTHLY = 'prod_monthly123'
    process.env.STRIPE_PRODUCT_PRO_YEARLY = 'prod_yearly123'
    process.env.STRIPE_PRODUCT_PRO_ONEOFF = 'prod_oneoff123'
    process.env.STRIPE_PRICE_MONTHLY = 'price_monthly123'
    process.env.STRIPE_PRICE_YEARLY = 'price_yearly123'
    process.env.STRIPE_PRICE_ONEOFF = 'price_oneoff123'

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.errors.some((e: string) => e.includes('mode') || e.includes('mismatch'))).toBe(true)
  })

  it('allows webhook secret placeholder and returns warnings', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123456789'
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123456789'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder' // Placeholder
    process.env.STRIPE_PRODUCT_PRO_MONTHLY = 'prod_monthly123'
    process.env.STRIPE_PRODUCT_PRO_YEARLY = 'prod_yearly123'
    process.env.STRIPE_PRODUCT_PRO_ONEOFF = 'prod_oneoff123'
    process.env.STRIPE_PRICE_MONTHLY = 'price_monthly123'
    process.env.STRIPE_PRICE_YEARLY = 'price_yearly123'
    process.env.STRIPE_PRICE_ONEOFF = 'price_oneoff123'

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.mode).toBe('test')
    expect(data.warnings).toBeDefined()
    expect(data.warnings.length).toBeGreaterThan(0)
    expect(
      data.warnings.some((w: string) => w.includes('placeholder') || w.includes('webhook'))
    ).toBe(true)
  })
})
