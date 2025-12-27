/**
 * Tests for Stripe Webhook Handler
 *
 * Phase: 3.3 (Stripe Webhooks)
 * Tests the /api/webhooks/stripe endpoint that handles Stripe webhook events
 * for subscription lifecycle management.
 */

import { POST } from './route'
import { NextRequest } from 'next/server'
import type Stripe from 'stripe'

// Mock Stripe client
const mockVerifyWebhookSignature = jest.fn()
jest.mock('@/lib/stripe/client', () => ({
  verifyWebhookSignature: (...args: unknown[]) => mockVerifyWebhookSignature(...args),
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
  captureMessage: jest.fn(),
}))

describe('POST /api/webhooks/stripe', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv }
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123'

    // Reset mocks
    jest.clearAllMocks()

    // Default Supabase mock implementation
    mockFrom.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('Webhook Signature Verification', () => {
    it('returns 400 when stripe-signature header is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('signature')
    })

    it('returns 400 when signature verification fails', async () => {
      mockVerifyWebhookSignature.mockImplementation(() => {
        throw new Error('Webhook signature verification failed')
      })

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'invalid_signature',
        },
        body: JSON.stringify({ type: 'test' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid signature')
    })
  })

  describe('checkout.session.completed Event', () => {
    const mockEvent: Partial<Stripe.Event> = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          mode: 'subscription',
          customer: 'cus_test_123',
          client_reference_id: 'user-123',
          subscription: 'sub_test_123',
          metadata: {
            userId: 'user-123',
            priceId: 'price_monthly123',
          },
        } as unknown as Stripe.Checkout.Session,
      },
    }

    it('upgrades user to Pro on successful subscription checkout', async () => {
      mockVerifyWebhookSignature.mockReturnValue(mockEvent)

      const updateMock = jest.fn().mockReturnThis()
      const selectMock = jest.fn().mockResolvedValue({
        data: { id: 'user-123', plan: 'pro' },
        error: null,
      })

      mockFrom.mockReturnValue({
        update: updateMock,
        eq: jest.fn().mockReturnThis(),
        select: selectMock,
      })

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: 'pro',
          stripe_customer_id: 'cus_test_123',
          stripe_subscription_id: 'sub_test_123',
          subscription_price_id: 'price_monthly123',
        })
      )
    })

    it('sets plan_expires_at to one month ahead for one-off payment', async () => {
      const oneOffEvent: Partial<Stripe.Event> = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            mode: 'payment', // One-time payment
            customer: 'cus_test_123',
            client_reference_id: 'user-123',
            subscription: null,
            metadata: {
              userId: 'user-123',
              priceId: 'price_oneoff123',
            },
          } as unknown as Stripe.Checkout.Session,
        },
      }

      mockVerifyWebhookSignature.mockReturnValue(oneOffEvent)

      const updateMock = jest.fn().mockReturnThis()
      const selectMock = jest.fn().mockResolvedValue({
        data: { id: 'user-123', plan: 'pro' },
        error: null,
      })

      mockFrom.mockReturnValue({
        update: updateMock,
        eq: jest.fn().mockReturnThis(),
        select: selectMock,
      })

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify(oneOffEvent),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: 'pro',
          plan_expires_at: expect.any(String), // Should be ~30 days from now
        })
      )

      // Verify the expiry date is approximately 30 days from now
      const call = updateMock.mock.calls[0][0]
      const expiresAt = new Date(call.plan_expires_at)
      const expectedExpiry = new Date()
      expectedExpiry.setDate(expectedExpiry.getDate() + 30)

      // Allow 1 minute difference for test execution time
      const diff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime())
      expect(diff).toBeLessThan(60000) // Less than 1 minute
    })

    it('handles database error gracefully', async () => {
      mockVerifyWebhookSignature.mockReturnValue(mockEvent)

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to update user')
    })
  })

  describe('customer.subscription.updated Event', () => {
    const mockEvent: Partial<Stripe.Event> = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_123',
          customer: 'cus_test_123',
          status: 'active',
          current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days from now
          items: {
            data: [
              {
                price: {
                  id: 'price_monthly123',
                },
              },
            ],
          },
          metadata: {
            userId: 'user-123',
          },
        } as unknown as Stripe.Subscription,
      },
    }

    it('updates plan_expires_at when subscription is renewed', async () => {
      mockVerifyWebhookSignature.mockReturnValue(mockEvent)

      const updateMock = jest.fn().mockReturnThis()
      const selectMock = jest.fn().mockResolvedValue({
        data: { id: 'user-123' },
        error: null,
      })

      mockFrom.mockReturnValue({
        update: updateMock,
        eq: jest.fn().mockReturnThis(),
        select: selectMock,
      })

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_expires_at: expect.any(String),
        })
      )
    })

    it('marks subscription as cancelled when status is canceled', async () => {
      const canceledEvent: Partial<Stripe.Event> = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            ...mockEvent.data!.object,
            status: 'canceled',
          } as Stripe.Subscription,
        },
      }

      mockVerifyWebhookSignature.mockReturnValue(canceledEvent)

      const updateMock = jest.fn().mockReturnThis()
      const selectMock = jest.fn().mockResolvedValue({
        data: { id: 'user-123' },
        error: null,
      })

      mockFrom.mockReturnValue({
        update: updateMock,
        eq: jest.fn().mockReturnThis(),
        select: selectMock,
      })

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify(canceledEvent),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: 'free',
          plan_expires_at: null,
        })
      )
    })
  })

  describe('customer.subscription.deleted Event', () => {
    const mockEvent: Partial<Stripe.Event> = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_test_123',
          customer: 'cus_test_123',
          metadata: {
            userId: 'user-123',
          },
        } as unknown as Stripe.Subscription,
      },
    }

    it('downgrades user to free plan', async () => {
      mockVerifyWebhookSignature.mockReturnValue(mockEvent)

      const updateMock = jest.fn().mockReturnThis()
      const selectMock = jest.fn().mockResolvedValue({
        data: { id: 'user-123', plan: 'free' },
        error: null,
      })

      mockFrom.mockReturnValue({
        update: updateMock,
        eq: jest.fn().mockReturnThis(),
        select: selectMock,
      })

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: 'free',
          plan_expires_at: null,
          stripe_subscription_id: null,
        })
      )
    })
  })

  describe('invoice.payment_failed Event', () => {
    const mockEvent: Partial<Stripe.Event> = {
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_test_123',
          customer: 'cus_test_123',
          subscription: 'sub_test_123',
          customer_email: 'test@example.com',
          metadata: {
            userId: 'user-123',
          },
        } as unknown as Stripe.Invoice,
      },
    }

    it('logs payment failure without downgrading immediately', async () => {
      mockVerifyWebhookSignature.mockReturnValue(mockEvent)

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      // Verify that no downgrade happens immediately
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  describe('Unknown Event Types', () => {
    it('returns 200 for unhandled event types', async () => {
      const unknownEvent: Partial<Stripe.Event> = {
        type: 'customer.created',
        data: {
          object: {} as Stripe.Customer,
        },
      }

      mockVerifyWebhookSignature.mockReturnValue(unknownEvent)

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify(unknownEvent),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })
})
