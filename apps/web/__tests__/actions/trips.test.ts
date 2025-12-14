/**
 * Tests for trip participant management server actions
 *
 * These are UNIT tests that verify server action behavior including:
 * - Permission checks (owner-only, role-based access)
 * - Sole owner protection (preventing orphaned trips)
 * - Database operations (delete, update)
 * - Error handling and validation
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { removeParticipant, updateParticipantRole, leaveTrip } from '@/app/actions/trips'

// Mock Supabase clients
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn<any, any>(),
  createServiceClient: jest.fn<any, any>(),
}))

// Mock Next.js cache revalidation
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn<any, any>(),
}))

import { createClient } from '@/lib/supabase/server'

describe('removeParticipant', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully remove a participant as trip owner', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn<any, any>()
          .mockResolvedValue({ data: { user: { id: 'owner-123' } }, error: null }),
      },
      from: jest.fn<any, any>((table: string) => {
        if (table === 'trip_participants') {
          return {
            select: jest.fn<any, any>().mockReturnThis(),
            eq: jest.fn<any, any>().mockReturnThis(),
            single: jest.fn<any, any>().mockResolvedValue({
              data: { user_id: 'owner-123', role: 'owner' },
              error: null,
            }),
            delete: jest.fn<any, any>().mockReturnThis(),
            maybeSingle: jest.fn<any, any>().mockResolvedValue({ data: null, error: null }),
          }
        }
        return {
          select: jest.fn<any, any>().mockReturnThis(),
          eq: jest.fn<any, any>().mockResolvedValue({
            data: [
              { user_id: 'owner-123', role: 'owner' },
              { user_id: 'participant-456', role: 'participant' },
            ],
            error: null,
          }),
        }
      }),
    } as any

    ;(createClient as any).mockResolvedValue(mockSupabase)

    const result = await removeParticipant('trip-123', 'participant-456')

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should fail if user is not authenticated', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
      },
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await removeParticipant('trip-123', 'participant-456')

    expect(result.success).toBe(false)
    expect(result.error).toBe('You must be logged in to manage participants')
  })

  it('should fail if user is not trip owner', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: 'participant-999' } }, error: null }),
      },
      from: jest.fn(() => ({
        select: jest.fn<any, any>().mockReturnThis(),
        eq: jest.fn<any, any>().mockReturnThis(),
        single: jest.fn<any, any>().mockResolvedValue({
          data: { user_id: 'participant-999', role: 'participant' },
          error: null,
        }),
      })),
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await removeParticipant('trip-123', 'participant-456')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Only trip owners can remove participants')
  })

  it('should prevent removing the sole owner', async () => {
    let fromCallCount = 0
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn<any, any>()
          .mockResolvedValue({ data: { user: { id: 'owner-123' } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === 'trip_participants') {
          fromCallCount++
          if (fromCallCount === 1) {
            // First call: Get current user's participant record (.select().eq().eq().single())
            const chainable: any = {
              select: jest.fn<any, any>().mockReturnThis(),
              eq: jest.fn<any, any>().mockReturnThis(),
              single: jest.fn<any, any>().mockResolvedValue({
                data: { user_id: 'owner-123', role: 'owner' },
                error: null,
              }),
            }
            return chainable
          } else if (fromCallCount === 2) {
            // Second call: Get all owners (.select().eq('trip_id').eq('role'))
            let eqCallCount = 0
            const chainable: any = {
              select: jest.fn<any, any>().mockReturnThis(),
              eq: jest.fn(() => {
                eqCallCount++
                if (eqCallCount === 1) {
                  // First .eq() call returns chainable
                  return chainable
                } else {
                  // Second .eq() call returns the final result
                  return Promise.resolve({
                    data: [{ user_id: 'owner-123', role: 'owner' }],
                    error: null,
                  })
                }
              }),
            }
            return chainable
          }
        }
        return {}
      }),
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await removeParticipant('trip-123', 'owner-123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Cannot remove the sole owner of the trip')
  })

  it('should allow removing a second owner if multiple owners exist', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn<any, any>()
          .mockResolvedValue({ data: { user: { id: 'owner-123' } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === 'trip_participants') {
          return {
            select: jest.fn<any, any>().mockReturnThis(),
            eq: jest.fn<any, any>().mockReturnThis(),
            single: jest.fn<any, any>().mockResolvedValue({
              data: { user_id: 'owner-123', role: 'owner' },
              error: null,
            }),
            delete: jest.fn<any, any>().mockReturnThis(),
            maybeSingle: jest.fn<any, any>().mockResolvedValue({ data: null, error: null }),
          }
        }
        return {
          select: jest.fn<any, any>().mockReturnThis(),
          eq: jest.fn<any, any>().mockResolvedValue({
            data: [
              { user_id: 'owner-123', role: 'owner' },
              { user_id: 'owner-789', role: 'owner' },
            ],
            error: null,
          }),
        }
      }),
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await removeParticipant('trip-123', 'owner-789')

    expect(result.success).toBe(true)
  })

  it('should handle database errors gracefully', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn<any, any>()
          .mockResolvedValue({ data: { user: { id: 'owner-123' } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === 'trip_participants') {
          return {
            select: jest.fn<any, any>().mockReturnThis(),
            eq: jest.fn<any, any>().mockReturnThis(),
            single: jest.fn<any, any>().mockResolvedValue({
              data: { user_id: 'owner-123', role: 'owner' },
              error: null,
            }),
            delete: jest.fn<any, any>().mockReturnThis(),
            maybeSingle: jest.fn<any, any>().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }
        }
        return {
          select: jest.fn<any, any>().mockReturnThis(),
          eq: jest.fn<any, any>().mockResolvedValue({
            data: [
              { user_id: 'owner-123', role: 'owner' },
              { user_id: 'participant-456', role: 'participant' },
            ],
            error: null,
          }),
        }
      }),
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await removeParticipant('trip-123', 'participant-456')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Database error')
  })
})

describe('updateParticipantRole', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully update participant role as trip owner', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn<any, any>()
          .mockResolvedValue({ data: { user: { id: 'owner-123' } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === 'trip_participants') {
          return {
            select: jest.fn<any, any>().mockReturnThis(),
            eq: jest.fn<any, any>().mockReturnThis(),
            single: jest.fn<any, any>().mockResolvedValue({
              data: { user_id: 'owner-123', role: 'owner' },
              error: null,
            }),
            update: jest.fn<any, any>().mockReturnThis(),
            maybeSingle: jest.fn<any, any>().mockResolvedValue({
              data: { user_id: 'participant-456', role: 'viewer' },
              error: null,
            }),
          }
        }
        return {
          select: jest.fn<any, any>().mockReturnThis(),
          eq: jest.fn<any, any>().mockResolvedValue({
            data: [
              { user_id: 'owner-123', role: 'owner' },
              { user_id: 'participant-456', role: 'participant' },
            ],
            error: null,
          }),
        }
      }),
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await updateParticipantRole('trip-123', 'participant-456', 'viewer')

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should fail if user is not authenticated', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
      },
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await updateParticipantRole('trip-123', 'participant-456', 'viewer')

    expect(result.success).toBe(false)
    expect(result.error).toBe('You must be logged in to manage participants')
  })

  it('should fail if user is not trip owner', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: 'participant-999' } }, error: null }),
      },
      from: jest.fn(() => ({
        select: jest.fn<any, any>().mockReturnThis(),
        eq: jest.fn<any, any>().mockReturnThis(),
        single: jest.fn<any, any>().mockResolvedValue({
          data: { user_id: 'participant-999', role: 'participant' },
          error: null,
        }),
      })),
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await updateParticipantRole('trip-123', 'participant-456', 'viewer')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Only trip owners can change participant roles')
  })

  it('should prevent demoting the sole owner', async () => {
    let fromCallCount = 0
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn<any, any>()
          .mockResolvedValue({ data: { user: { id: 'owner-123' } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === 'trip_participants') {
          fromCallCount++
          if (fromCallCount === 1) {
            // First call: Get current user's participant record
            const chainable: any = {
              select: jest.fn<any, any>().mockReturnThis(),
              eq: jest.fn<any, any>().mockReturnThis(),
              single: jest.fn<any, any>().mockResolvedValue({
                data: { user_id: 'owner-123', role: 'owner' },
                error: null,
              }),
            }
            return chainable
          } else if (fromCallCount === 2) {
            // Second call: Get all owners (.select().eq('trip_id').eq('role'))
            let eqCallCount = 0
            const chainable: any = {
              select: jest.fn<any, any>().mockReturnThis(),
              eq: jest.fn(() => {
                eqCallCount++
                if (eqCallCount === 1) {
                  // First .eq() call returns chainable
                  return chainable
                } else {
                  // Second .eq() call returns the final result
                  return Promise.resolve({
                    data: [{ user_id: 'owner-123', role: 'owner' }],
                    error: null,
                  })
                }
              }),
            }
            return chainable
          }
        }
        return {}
      }),
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await updateParticipantRole('trip-123', 'owner-123', 'participant')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Cannot demote the sole owner of the trip')
  })

  it('should allow demoting a second owner if multiple owners exist', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn<any, any>()
          .mockResolvedValue({ data: { user: { id: 'owner-123' } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === 'trip_participants') {
          return {
            select: jest.fn<any, any>().mockReturnThis(),
            eq: jest.fn<any, any>().mockReturnThis(),
            single: jest.fn<any, any>().mockResolvedValue({
              data: { user_id: 'owner-123', role: 'owner' },
              error: null,
            }),
            update: jest.fn<any, any>().mockReturnThis(),
            maybeSingle: jest.fn<any, any>().mockResolvedValue({
              data: { user_id: 'owner-789', role: 'participant' },
              error: null,
            }),
          }
        }
        return {
          select: jest.fn<any, any>().mockReturnThis(),
          eq: jest.fn<any, any>().mockResolvedValue({
            data: [
              { user_id: 'owner-123', role: 'owner' },
              { user_id: 'owner-789', role: 'owner' },
            ],
            error: null,
          }),
        }
      }),
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await updateParticipantRole('trip-123', 'owner-789', 'participant')

    expect(result.success).toBe(true)
  })

  it('should handle invalid role values', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn<any, any>()
          .mockResolvedValue({ data: { user: { id: 'owner-123' } }, error: null }),
      },
      from: jest.fn(() => ({
        select: jest.fn<any, any>().mockReturnThis(),
        eq: jest.fn<any, any>().mockReturnThis(),
        single: jest.fn<any, any>().mockResolvedValue({
          data: { user_id: 'owner-123', role: 'owner' },
          error: null,
        }),
      })),
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await updateParticipantRole('trip-123', 'participant-456', 'invalid' as any)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid role. Must be owner, participant, or viewer')
  })

  it('should handle database errors gracefully', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn<any, any>()
          .mockResolvedValue({ data: { user: { id: 'owner-123' } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === 'trip_participants') {
          return {
            select: jest.fn<any, any>().mockReturnThis(),
            eq: jest.fn<any, any>().mockReturnThis(),
            single: jest.fn<any, any>().mockResolvedValue({
              data: { user_id: 'owner-123', role: 'owner' },
              error: null,
            }),
            update: jest.fn<any, any>().mockReturnThis(),
            maybeSingle: jest.fn<any, any>().mockResolvedValue({
              data: null,
              error: { message: 'Update failed' },
            }),
          }
        }
        return {
          select: jest.fn<any, any>().mockReturnThis(),
          eq: jest.fn<any, any>().mockResolvedValue({
            data: [
              { user_id: 'owner-123', role: 'owner' },
              { user_id: 'participant-456', role: 'participant' },
            ],
            error: null,
          }),
        }
      }),
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await updateParticipantRole('trip-123', 'participant-456', 'viewer')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Update failed')
  })
})

describe('leaveTrip', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully allow non-owner to leave trip', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: 'participant-456' } }, error: null }),
      },
      from: jest.fn(() => ({
        select: jest.fn<any, any>().mockReturnThis(),
        eq: jest.fn<any, any>().mockReturnThis(),
        single: jest.fn<any, any>().mockResolvedValue({
          data: { user_id: 'participant-456', role: 'participant' },
          error: null,
        }),
        delete: jest.fn<any, any>().mockReturnThis(),
        maybeSingle: jest.fn<any, any>().mockResolvedValue({ data: null, error: null }),
      })),
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await leaveTrip('trip-123')

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should fail if user is not authenticated', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
      },
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await leaveTrip('trip-123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('You must be logged in to leave a trip')
  })

  it('should prevent owner from leaving if they are the sole owner', async () => {
    let fromCallCount = 0
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn<any, any>()
          .mockResolvedValue({ data: { user: { id: 'owner-123' } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === 'trip_participants') {
          fromCallCount++
          if (fromCallCount === 1) {
            // First call: Get current user's participant record
            const chainable: any = {
              select: jest.fn<any, any>().mockReturnThis(),
              eq: jest.fn<any, any>().mockReturnThis(),
              single: jest.fn<any, any>().mockResolvedValue({
                data: { user_id: 'owner-123', role: 'owner' },
                error: null,
              }),
            }
            return chainable
          } else if (fromCallCount === 2) {
            // Second call: Get all owners (.select().eq('trip_id').eq('role'))
            let eqCallCount = 0
            const chainable: any = {
              select: jest.fn<any, any>().mockReturnThis(),
              eq: jest.fn(() => {
                eqCallCount++
                if (eqCallCount === 1) {
                  // First .eq() call returns chainable
                  return chainable
                } else {
                  // Second .eq() call returns the final result
                  return Promise.resolve({
                    data: [{ user_id: 'owner-123', role: 'owner' }],
                    error: null,
                  })
                }
              }),
            }
            return chainable
          }
        }
        return {}
      }),
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await leaveTrip('trip-123')

    expect(result.success).toBe(false)
    expect(result.error).toBe(
      'Cannot leave trip as sole owner. Transfer ownership or delete the trip'
    )
  })

  it('should allow owner to leave if multiple owners exist', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn<any, any>()
          .mockResolvedValue({ data: { user: { id: 'owner-123' } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === 'trip_participants') {
          return {
            select: jest.fn<any, any>().mockReturnThis(),
            eq: jest.fn<any, any>().mockReturnThis(),
            single: jest.fn<any, any>().mockResolvedValue({
              data: { user_id: 'owner-123', role: 'owner' },
              error: null,
            }),
            delete: jest.fn<any, any>().mockReturnThis(),
            maybeSingle: jest.fn<any, any>().mockResolvedValue({ data: null, error: null }),
          }
        }
        return {
          select: jest.fn<any, any>().mockReturnThis(),
          eq: jest.fn<any, any>().mockResolvedValue({
            data: [
              { user_id: 'owner-123', role: 'owner' },
              { user_id: 'owner-789', role: 'owner' },
            ],
            error: null,
          }),
        }
      }),
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await leaveTrip('trip-123')

    expect(result.success).toBe(true)
  })

  it('should handle database errors gracefully', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: 'participant-456' } }, error: null }),
      },
      from: jest.fn(() => ({
        select: jest.fn<any, any>().mockReturnThis(),
        eq: jest.fn<any, any>().mockReturnThis(),
        single: jest.fn<any, any>().mockResolvedValue({
          data: { user_id: 'participant-456', role: 'participant' },
          error: null,
        }),
        delete: jest.fn<any, any>().mockReturnThis(),
        maybeSingle: jest.fn<any, any>().mockResolvedValue({
          data: null,
          error: { message: 'Delete failed' },
        }),
      })),
    }(createClient as any).mockResolvedValue(mockSupabase)

    const result = await leaveTrip('trip-123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Delete failed')
  })
})
