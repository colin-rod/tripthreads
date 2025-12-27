/**
 * Tests for Stripe Checkout Session Creation Endpoint
 *
 * Phase: 3.2 (CRO-XXX - Stripe Checkout)
 * Tests the /api/create-checkout endpoint that creates Stripe Checkout
 * sessions for Pro subscriptions with adaptive pricing.
 */

import { POST } from './route'
import { NextRequest } from 'next/server'

// Mock function declarations (hoisted)
const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockCreate = jest.fn()

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

// Mock rate limiting
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  createRateLimitResponse: jest.fn(),
}))

// Mock Stripe client
jest.mock('@/lib/stripe/client', () => ({
  getStripe: jest.fn(() => ({
    checkout: {
      sessions: {
        create: mockCreate,
      },
    },
  })),
}))

// Mock Stripe config to use test price IDs
jest.mock('@/lib/stripe/config', () => ({
  STRIPE_PRICES: {
    monthly: 'price_monthly123',
    yearly: 'price_yearly123',
    oneoff: 'price_oneoff123',
  },
}))

describe('POST /api/create-checkout', () => {
  const originalEnv = process.env
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  }

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv }
    process.env.STRIPE_SECRET_KEY = 'sk_test_123456789'
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123456789'
    process.env.STRIPE_PRICE_MONTHLY = 'price_monthly123'
    process.env.STRIPE_PRICE_YEARLY = 'price_yearly123'
    process.env.STRIPE_PRICE_ONEOFF = 'price_oneoff123'
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'

    // Reset mocks
    jest.clearAllMocks()

    // Default mock implementations
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const request = new NextRequest('http://localhost:3000/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_monthly123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('Request Validation', () => {
    it('returns 400 when priceId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('priceId')
    })

    it('returns 400 when priceId format is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'invalid_price' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid priceId format')
    })

    it('accepts valid monthly price ID', async () => {
      mockCreate.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      })

      const request = new NextRequest('http://localhost:3000/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_monthly123' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('accepts valid yearly price ID', async () => {
      mockCreate.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      })

      const request = new NextRequest('http://localhost:3000/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_yearly123' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('accepts valid oneoff price ID', async () => {
      mockCreate.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      })

      const request = new NextRequest('http://localhost:3000/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_oneoff123' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Active Subscription Check', () => {
    it('returns 400 when user already has an active subscription', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            plan: 'pro',
            plan_expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          },
          error: null,
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_monthly123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('already have an active subscription')
    })

    it('allows checkout when user has no subscription', async () => {
      mockCreate.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      })

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            plan: 'free',
            plan_expires_at: null,
          },
          error: null,
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_monthly123' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('allows checkout when user subscription has expired', async () => {
      mockCreate.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      })

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            plan: 'pro',
            plan_expires_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          },
          error: null,
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_monthly123' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Checkout Session Creation', () => {
    beforeEach(() => {
      mockCreate.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      })
    })

    it('creates checkout session with correct parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_monthly123' }),
      })

      await POST(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          line_items: [
            {
              price: 'price_monthly123',
              quantity: 1,
            },
          ],
          customer_email: mockUser.email,
          client_reference_id: mockUser.id,
          success_url: expect.stringContaining('/profile?checkout=success'),
          cancel_url: expect.stringContaining('/profile?checkout=cancel'),
        })
      )
    })

    it('creates one-time payment session for oneoff price', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_oneoff123' }),
      })

      await POST(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment', // One-time payment, not subscription
          line_items: [
            {
              price: 'price_oneoff123',
              quantity: 1,
            },
          ],
        })
      )
    })

    it('returns checkout session URL on success', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_monthly123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://checkout.stripe.com/test')
      expect(data.sessionId).toBe('cs_test_123')
    })

    it('includes metadata with user ID and price ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_monthly123' }),
      })

      await POST(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            userId: mockUser.id,
            priceId: 'price_monthly123',
          },
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('returns 500 when Stripe API fails', async () => {
      mockCreate.mockRejectedValue(new Error('Stripe API error'))

      const request = new NextRequest('http://localhost:3000/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_monthly123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to create checkout session')
    })

    it('returns 500 when Stripe client throws configuration error', async () => {
      // Mock getStripe to throw configuration error
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mockGetStripeError = require('@/lib/stripe/client').getStripe as jest.Mock
      mockGetStripeError.mockImplementationOnce(() => {
        throw new Error('STRIPE_SECRET_KEY environment variable is not set')
      })

      const request = new NextRequest('http://localhost:3000/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_monthly123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Stripe not configured')
    })
  })
})
