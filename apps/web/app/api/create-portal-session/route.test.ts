/**
 * Tests for Stripe Customer Portal Session Creation
 *
 * Phase: 3.4 (Stripe Customer Portal)
 * Tests the /api/create-portal-session endpoint that creates Stripe Customer Portal sessions
 * for Pro users to manage their subscriptions.
 */

import { POST } from './route'
import { NextRequest } from 'next/server'
import type Stripe from 'stripe'

// Mock Stripe client
const mockBillingPortalSessionsCreate = jest.fn()
const mockGetStripe = jest.fn(() => ({
  billingPortal: {
    sessions: {
      create: mockBillingPortalSessionsCreate,
    },
  },
}))

jest.mock('@/lib/stripe/client', () => ({
  getStripe: () => mockGetStripe(),
}))

// Mock Supabase client
const mockGetUser = jest.fn()
const mockFrom = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

describe('POST /api/create-portal-session', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv }
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

    // Reset mocks
    jest.clearAllMocks()

    // Default user authentication mock
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/create-portal-session', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('authenticated')
    })
  })

  describe('User Validation', () => {
    it('returns 400 when user has no Stripe customer ID', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'user-123',
            stripe_customer_id: null,
            plan: 'free',
          },
          error: null,
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/create-portal-session', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('No active subscription')
    })

    it('returns 400 when user is not on Pro plan', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'user-123',
            stripe_customer_id: 'cus_test_123',
            plan: 'free',
          },
          error: null,
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/create-portal-session', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('No active subscription')
    })
  })

  describe('Portal Session Creation', () => {
    it('creates portal session for Pro user with valid Stripe customer ID', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'user-123',
            stripe_customer_id: 'cus_test_123',
            plan: 'pro',
          },
          error: null,
        }),
      })

      mockBillingPortalSessionsCreate.mockResolvedValue({
        id: 'bps_test_123',
        url: 'https://billing.stripe.com/session/test_xxx',
      } as Stripe.BillingPortal.Session)

      const request = new NextRequest('http://localhost:3000/api/create-portal-session', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://billing.stripe.com/session/test_xxx')
      expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
        customer: 'cus_test_123',
        return_url: 'http://localhost:3000/settings?tab=subscription',
      })
    })

    it('uses correct return URL with NEXT_PUBLIC_APP_URL', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://tripthreads.app'

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'user-123',
            stripe_customer_id: 'cus_test_123',
            plan: 'pro',
          },
          error: null,
        }),
      })

      mockBillingPortalSessionsCreate.mockResolvedValue({
        id: 'bps_test_123',
        url: 'https://billing.stripe.com/session/test_xxx',
      } as Stripe.BillingPortal.Session)

      const request = new NextRequest('https://tripthreads.app/api/create-portal-session', {
        method: 'POST',
      })

      await POST(request)

      expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
        customer: 'cus_test_123',
        return_url: 'https://tripthreads.app/settings?tab=subscription',
      })
    })
  })

  describe('Error Handling', () => {
    it('handles database error when fetching user profile', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/create-portal-session', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to create portal session')
    })

    it('handles Stripe API error when creating portal session', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'user-123',
            stripe_customer_id: 'cus_test_123',
            plan: 'pro',
          },
          error: null,
        }),
      })

      mockBillingPortalSessionsCreate.mockRejectedValue(new Error('Stripe API error'))

      const request = new NextRequest('http://localhost:3000/api/create-portal-session', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Stripe API error')
    })
  })
})
