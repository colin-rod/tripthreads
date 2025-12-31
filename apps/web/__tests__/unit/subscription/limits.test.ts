/**
 * Unit tests for subscription limit enforcement
 *
 * Tests all limit check functions with various user scenarios:
 * - Free users at/near/below limits
 * - Pro users (unlimited)
 * - Users in grace period
 * - Edge cases (missing data, invalid IDs)
 */

import {
  checkTripLimit,
  checkParticipantLimit,
  checkPhotoLimit,
  getUserSubscriptionStatus,
  isProUser,
  getLimitPercentage,
  isNearLimit,
  isAtLimit,
  FREE_TIER_LIMITS,
} from '@/lib/subscription/limits'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('Subscription Limits - Helper Functions', () => {
  describe('getLimitPercentage', () => {
    it('returns 0% when at 0 of any limit', () => {
      expect(getLimitPercentage(0, 5)).toBe(0)
      expect(getLimitPercentage(0, 25)).toBe(0)
    })

    it('returns 50% when at half of limit', () => {
      expect(getLimitPercentage(2, 4)).toBe(50)
      expect(getLimitPercentage(12, 24)).toBe(50)
    })

    it('returns 80% when at 4/5 of limit', () => {
      expect(getLimitPercentage(20, 25)).toBe(80)
    })

    it('returns 100% when at limit', () => {
      expect(getLimitPercentage(5, 5)).toBe(100)
      expect(getLimitPercentage(25, 25)).toBe(100)
    })

    it('returns 100% (capped) when over limit', () => {
      expect(getLimitPercentage(6, 5)).toBe(100)
      expect(getLimitPercentage(30, 25)).toBe(100)
    })

    it('returns 0% for Pro users (infinite limit)', () => {
      expect(getLimitPercentage(100, Infinity)).toBe(0)
    })

    it('returns 100% for zero limit', () => {
      expect(getLimitPercentage(1, 0)).toBe(100)
    })
  })

  describe('isNearLimit', () => {
    it('returns false when below 80%', () => {
      expect(isNearLimit(3, 5)).toBe(false) // 60%
      expect(isNearLimit(15, 25)).toBe(false) // 60%
    })

    it('returns true when at 80%+', () => {
      expect(isNearLimit(4, 5)).toBe(true) // 80%
      expect(isNearLimit(20, 25)).toBe(true) // 80%
      expect(isNearLimit(21, 25)).toBe(true) // 84%
    })

    it('returns true when at 100%', () => {
      expect(isNearLimit(5, 5)).toBe(true)
      expect(isNearLimit(25, 25)).toBe(true)
    })

    it('returns false for Pro users (infinite limit)', () => {
      expect(isNearLimit(1000, Infinity)).toBe(false)
    })
  })

  describe('isAtLimit', () => {
    it('returns false when below limit', () => {
      expect(isAtLimit(4, 5)).toBe(false)
      expect(isAtLimit(20, 25)).toBe(false)
    })

    it('returns true when at limit', () => {
      expect(isAtLimit(5, 5)).toBe(true)
      expect(isAtLimit(25, 25)).toBe(true)
    })

    it('returns true when over limit', () => {
      expect(isAtLimit(6, 5)).toBe(true)
      expect(isAtLimit(30, 25)).toBe(true)
    })

    it('returns false for Pro users (infinite limit)', () => {
      expect(isAtLimit(1000, Infinity)).toBe(false)
    })
  })
})

describe('Subscription Limits - User Status', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  describe('getUserSubscriptionStatus', () => {
    it('returns free user status for users without profile', async () => {
      mockSupabase.single.mockResolvedValue({ data: null })

      const status = await getUserSubscriptionStatus('user-123')

      expect(status).toEqual({
        plan: 'free',
        isActive: false,
        expiresAt: null,
        isInGracePeriod: false,
        gracePeriodEnd: null,
      })
    })

    it('returns active Pro status for Pro user with no expiry', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          plan: 'pro',
          plan_expires_at: null,
          grace_period_end: null,
        },
      })

      const status = await getUserSubscriptionStatus('user-123')

      expect(status).toEqual({
        plan: 'pro',
        isActive: true,
        expiresAt: null,
        isInGracePeriod: false,
        gracePeriodEnd: null,
      })
    })

    it('returns active Pro status for Pro user with future expiry', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      mockSupabase.single.mockResolvedValue({
        data: {
          plan: 'pro',
          plan_expires_at: futureDate.toISOString(),
          grace_period_end: null,
        },
      })

      const status = await getUserSubscriptionStatus('user-123')

      expect(status.plan).toBe('pro')
      expect(status.isActive).toBe(true)
      expect(status.isInGracePeriod).toBe(false)
    })

    it('returns inactive Pro status for Pro user with past expiry', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      mockSupabase.single.mockResolvedValue({
        data: {
          plan: 'pro',
          plan_expires_at: pastDate.toISOString(),
          grace_period_end: null,
        },
      })

      const status = await getUserSubscriptionStatus('user-123')

      expect(status.plan).toBe('pro')
      expect(status.isActive).toBe(false)
      expect(status.isInGracePeriod).toBe(false)
    })

    it('returns active status for user in grace period', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10) // 10 days grace period remaining

      mockSupabase.single.mockResolvedValue({
        data: {
          plan: 'pro',
          plan_expires_at: null,
          grace_period_end: futureDate.toISOString(),
        },
      })

      const status = await getUserSubscriptionStatus('user-123')

      expect(status.plan).toBe('pro')
      expect(status.isActive).toBe(true)
      expect(status.isInGracePeriod).toBe(true)
    })

    it('returns inactive status for user with expired grace period', async () => {
      // Use a date clearly in the past to avoid timing issues
      const pastDate = new Date('2024-01-01T00:00:00Z')

      mockSupabase.single.mockResolvedValue({
        data: {
          plan: 'pro',
          plan_expires_at: null,
          grace_period_end: pastDate.toISOString(),
        },
      })

      const status = await getUserSubscriptionStatus('user-123')

      expect(status.isActive).toBe(false)
      expect(status.isInGracePeriod).toBe(false)
    })

    it('returns free user status', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          plan: 'free',
          plan_expires_at: null,
          grace_period_end: null,
        },
      })

      const status = await getUserSubscriptionStatus('user-123')

      expect(status).toEqual({
        plan: 'free',
        isActive: false,
        expiresAt: null,
        isInGracePeriod: false,
        gracePeriodEnd: null,
      })
    })
  })

  describe('isProUser', () => {
    it('returns true for active Pro user', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          plan: 'pro',
          plan_expires_at: null,
          grace_period_end: null,
        },
      })

      expect(await isProUser('user-123')).toBe(true)
    })

    it('returns true for user in grace period', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)

      mockSupabase.single.mockResolvedValue({
        data: {
          plan: 'pro',
          plan_expires_at: null,
          grace_period_end: futureDate.toISOString(),
        },
      })

      expect(await isProUser('user-123')).toBe(true)
    })

    it('returns false for free user', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          plan: 'free',
          plan_expires_at: null,
          grace_period_end: null,
        },
      })

      expect(await isProUser('user-123')).toBe(false)
    })

    it('returns false for expired Pro user', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      mockSupabase.single.mockResolvedValue({
        data: {
          plan: 'pro',
          plan_expires_at: pastDate.toISOString(),
          grace_period_end: null,
        },
      })

      expect(await isProUser('user-123')).toBe(false)
    })
  })
})

describe('Subscription Limits - Trip Limit', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  it('allows Pro user to create trip (unlimited)', async () => {
    // Mock Pro user status
    mockSupabase.single.mockResolvedValueOnce({
      data: { plan: 'pro', plan_expires_at: null, grace_period_end: null },
    })

    // Mock trip count query (returns { count: 5, head: true })
    const countMockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ count: 5 }),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(countMockSupabase)

    const result = await checkTripLimit('user-123')

    expect(result).toEqual({
      allowed: true,
      currentCount: 5,
      limit: Infinity,
      isProUser: true,
    })
  })

  it('allows free user to create first trip', async () => {
    // Mock free user status
    mockSupabase.single.mockResolvedValueOnce({
      data: { plan: 'free', plan_expires_at: null, grace_period_end: null },
    })

    // Mock trip count: 0 trips
    const countMockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ count: 0 }),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(countMockSupabase)

    const result = await checkTripLimit('user-123')

    expect(result.allowed).toBe(true)
    expect(result.currentCount).toBe(0)
    expect(result.limit).toBe(FREE_TIER_LIMITS.trips)
    expect(result.isProUser).toBe(false)
    expect(result.reason).toBeUndefined()
  })

  it('blocks free user from creating second trip', async () => {
    // Mock free user status
    mockSupabase.single.mockResolvedValueOnce({
      data: { plan: 'free', plan_expires_at: null, grace_period_end: null },
    })

    // Mock trip count: 1 trip (at limit)
    const countMockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ count: 1 }),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(countMockSupabase)

    const result = await checkTripLimit('user-123')

    expect(result.allowed).toBe(false)
    expect(result.currentCount).toBe(1)
    expect(result.limit).toBe(FREE_TIER_LIMITS.trips)
    expect(result.isProUser).toBe(false)
    expect(result.reason).toContain('free tier limit')
  })
})

describe('Subscription Limits - Participant Limit', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  it('allows Pro trip owner to add participant (unlimited)', async () => {
    // First createClient() call: Used by checkParticipantLimit
    // The client is reused for TWO different query chains
    const checkParticipantMock = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { owner_id: 'owner-123' },
      }),
    }

    // First query chain: trips table (select -> eq -> single)
    checkParticipantMock.select.mockReturnValueOnce(checkParticipantMock)

    // Second query chain: trip_participants count (select -> eq -> resolve)
    checkParticipantMock.select.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ count: 10 }),
    })
    ;(createClient as jest.Mock).mockResolvedValueOnce(checkParticipantMock)

    // Second createClient() call: Used by isProUser -> getUserSubscriptionStatus
    const statusMockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { plan: 'pro', plan_expires_at: null, grace_period_end: null },
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(statusMockSupabase)

    const result = await checkParticipantLimit('trip-123')

    expect(result.allowed).toBe(true)
    expect(result.currentCount).toBe(10)
    expect(result.limit).toBe(Infinity)
    expect(result.isProUser).toBe(true)
  })

  it('allows free trip owner to add participant (under limit)', async () => {
    // First createClient() call: Used by checkParticipantLimit
    // The client is reused for TWO different query chains
    const checkParticipantMock = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { owner_id: 'owner-123' },
      }),
    }

    // First query chain: trips table (select -> eq -> single)
    checkParticipantMock.select.mockReturnValueOnce(checkParticipantMock)

    // Second query chain: trip_participants count (select -> eq -> resolve)
    checkParticipantMock.select.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ count: 3 }),
    })
    ;(createClient as jest.Mock).mockResolvedValueOnce(checkParticipantMock)

    // Second createClient() call: Used by isProUser -> getUserSubscriptionStatus
    const statusMockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { plan: 'free', plan_expires_at: null, grace_period_end: null },
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(statusMockSupabase)

    const result = await checkParticipantLimit('trip-123')

    expect(result.allowed).toBe(true)
    expect(result.currentCount).toBe(3)
    expect(result.limit).toBe(FREE_TIER_LIMITS.participants)
    expect(result.reason).toBeUndefined()
  })

  it('blocks free trip owner from adding 6th participant', async () => {
    // First createClient() call: Used by checkParticipantLimit
    // The client is reused for TWO different query chains
    const checkParticipantMock = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { owner_id: 'owner-123' },
      }),
    }

    // First query chain: trips table (select -> eq -> single)
    checkParticipantMock.select.mockReturnValueOnce(checkParticipantMock)

    // Second query chain: trip_participants count (select -> eq -> resolve)
    checkParticipantMock.select.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ count: 5 }),
    })
    ;(createClient as jest.Mock).mockResolvedValueOnce(checkParticipantMock)

    // Second createClient() call: Used by isProUser -> getUserSubscriptionStatus
    const statusMockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { plan: 'free', plan_expires_at: null, grace_period_end: null },
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(statusMockSupabase)

    const result = await checkParticipantLimit('trip-123')

    expect(result.allowed).toBe(false)
    expect(result.currentCount).toBe(5)
    expect(result.limit).toBe(FREE_TIER_LIMITS.participants)
    expect(result.reason).toContain('free tier limit')
  })

  it('returns error for non-existent trip', async () => {
    // Only one createClient() call since we return early when trip is not found
    const tripMockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(tripMockSupabase)

    const result = await checkParticipantLimit('invalid-trip')

    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Trip not found')
  })
})

describe('Subscription Limits - Photo Limit', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  it('allows Pro user to upload photo (unlimited)', async () => {
    // First createClient() call: Used by checkPhotoLimit for photo count query
    const checkPhotoMock = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { photo_count: 100 },
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(checkPhotoMock)

    // Second createClient() call: Used by isProUser
    const statusMockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { plan: 'pro', plan_expires_at: null, grace_period_end: null },
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(statusMockSupabase)

    const result = await checkPhotoLimit('user-123')

    expect(result.allowed).toBe(true)
    expect(result.currentCount).toBe(100)
    expect(result.limit).toBe(Infinity)
    expect(result.isProUser).toBe(true)
  })

  it('allows free user to upload photo (under limit)', async () => {
    // First createClient() call: Used by checkPhotoLimit for photo count query
    const checkPhotoMock = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { photo_count: 10 },
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(checkPhotoMock)

    // Second createClient() call: Used by isProUser
    const statusMockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { plan: 'free', plan_expires_at: null, grace_period_end: null },
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(statusMockSupabase)

    const result = await checkPhotoLimit('user-123')

    expect(result.allowed).toBe(true)
    expect(result.currentCount).toBe(10)
    expect(result.limit).toBe(FREE_TIER_LIMITS.photos)
  })

  it('blocks free user from uploading 26th photo', async () => {
    // First createClient() call: Used by checkPhotoLimit for photo count query
    const checkPhotoMock = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { photo_count: 25 },
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(checkPhotoMock)

    // Second createClient() call: Used by isProUser
    const statusMockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { plan: 'free', plan_expires_at: null, grace_period_end: null },
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(statusMockSupabase)

    const result = await checkPhotoLimit('user-123')

    expect(result.allowed).toBe(false)
    expect(result.currentCount).toBe(25)
    expect(result.limit).toBe(FREE_TIER_LIMITS.photos)
    expect(result.reason).toContain('free tier limit')
  })

  it('handles missing photo_count as 0', async () => {
    // First createClient() call: Used by checkPhotoLimit for photo count query (null)
    const checkPhotoMock = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { photo_count: null },
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(checkPhotoMock)

    // Second createClient() call: Used by isProUser
    const statusMockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { plan: 'free', plan_expires_at: null, grace_period_end: null },
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(statusMockSupabase)

    const result = await checkPhotoLimit('user-123')

    expect(result.allowed).toBe(true)
    expect(result.currentCount).toBe(0)
  })
})
