/**
 * Unit tests for trip queries
 *
 * Tests CRUD operations for trips table.
 * Uses mock Supabase client to avoid actual database calls.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getUserTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  isTripOwner,
} from '../trips'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
}

describe('Trip Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserTrips', () => {
    it('returns all trips user is a participant in', async () => {
      const mockTrips = [
        {
          id: '1',
          name: 'Paris Trip',
          start_date: '2025-06-15',
          end_date: '2025-06-22',
          owner: { id: 'user1', full_name: 'Alice' },
          trip_participants: [{ id: 'p1', role: 'owner' }],
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockTrips,
            error: null,
          }),
        }),
      })

      const result = await getUserTrips(mockSupabase as any)

      expect(result).toEqual(mockTrips)
      expect(mockSupabase.from).toHaveBeenCalledWith('trips')
    })

    it('returns empty array when user has no trips', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      const result = await getUserTrips(mockSupabase as any)

      expect(result).toEqual([])
    })

    it('throws error on database failure', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })

      await expect(getUserTrips(mockSupabase as any)).rejects.toThrow('Failed to fetch trips')
    })
  })

  describe('getTripById', () => {
    it('returns trip with owner and participants', async () => {
      const mockTrip = {
        id: '1',
        name: 'Paris Trip',
        owner: { id: 'user1', full_name: 'Alice' },
        trip_participants: [{ id: 'p1', role: 'owner', user: { id: 'user1' } }],
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockTrip,
              error: null,
            }),
          }),
        }),
      })

      const result = await getTripById(mockSupabase as any, '1')

      expect(result).toEqual(mockTrip)
    })

    it('throws error when trip not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      })

      await expect(getTripById(mockSupabase as any, '999')).rejects.toThrow(
        'Trip not found or you do not have access'
      )
    })
  })

  describe('createTrip', () => {
    it('creates trip and adds owner as participant', async () => {
      const newTrip = {
        name: 'New Trip',
        start_date: '2025-07-01',
        end_date: '2025-07-10',
        owner_id: 'user1',
      }

      const createdTrip = { id: 'trip1', ...newTrip }

      // Mock trip insert
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createdTrip,
              error: null,
            }),
          }),
        }),
      })

      // Mock participant insert
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      const result = await createTrip(mockSupabase as any, newTrip)

      expect(result).toEqual(createdTrip)
      expect(mockSupabase.from).toHaveBeenCalledTimes(2)
      expect(mockSupabase.from).toHaveBeenCalledWith('trips')
      expect(mockSupabase.from).toHaveBeenCalledWith('trip_participants')
    })

    it('throws error when end_date < start_date', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23514' },
            }),
          }),
        }),
      })

      const invalidTrip = {
        name: 'Invalid Trip',
        start_date: '2025-07-10',
        end_date: '2025-07-01', // Before start_date
        owner_id: 'user1',
      }

      await expect(createTrip(mockSupabase as any, invalidTrip)).rejects.toThrow(
        'Invalid date range'
      )
    })

    it('cleans up trip if participant insert fails', async () => {
      const newTrip = {
        name: 'New Trip',
        start_date: '2025-07-01',
        end_date: '2025-07-10',
        owner_id: 'user1',
      }

      const createdTrip = { id: 'trip1', ...newTrip }

      // Mock successful trip insert
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createdTrip,
              error: null,
            }),
          }),
        }),
      })

      // Mock failed participant insert
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Participant insert failed' },
        }),
      })

      // Mock cleanup delete
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })

      await expect(createTrip(mockSupabase as any, newTrip)).rejects.toThrow()
      expect(mockSupabase.from).toHaveBeenCalledTimes(3) // insert trip, insert participant, delete trip
    })
  })

  describe('updateTrip', () => {
    it('updates trip fields', async () => {
      const updates = { name: 'Updated Trip Name' }
      const updatedTrip = {
        id: '1',
        name: 'Updated Trip Name',
        updated_at: new Date().toISOString(),
      }

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedTrip,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await updateTrip(mockSupabase as any, '1', updates)

      expect(result.name).toBe('Updated Trip Name')
      expect(result).toHaveProperty('updated_at')
    })

    it('throws error when non-owner tries to update', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      })

      await expect(updateTrip(mockSupabase as any, '1', { name: 'Hacked' })).rejects.toThrow(
        'Trip not found or you are not the owner'
      )
    })

    it('validates date range on update', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: '23514' },
              }),
            }),
          }),
        }),
      })

      await expect(
        updateTrip(mockSupabase as any, '1', {
          start_date: '2025-07-10',
          end_date: '2025-07-01',
        })
      ).rejects.toThrow('Invalid date range')
    })
  })

  describe('deleteTrip', () => {
    it('deletes trip successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })

      await expect(deleteTrip(mockSupabase as any, '1')).resolves.toBeUndefined()
    })

    it('throws error when non-owner tries to delete', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
      })

      await expect(deleteTrip(mockSupabase as any, '1')).rejects.toThrow(
        'Trip not found or you are not the owner'
      )
    })
  })

  describe('isTripOwner', () => {
    it('returns true when user is owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { owner_id: 'user1' },
              error: null,
            }),
          }),
        }),
      })

      const result = await isTripOwner(mockSupabase as any, '1')

      expect(result).toBe(true)
    })

    it('returns false when user is not owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user2' } },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { owner_id: 'user1' },
              error: null,
            }),
          }),
        }),
      })

      const result = await isTripOwner(mockSupabase as any, '1')

      expect(result).toBe(false)
    })

    it('returns false when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await isTripOwner(mockSupabase as any, '1')

      expect(result).toBe(false)
    })
  })
})
