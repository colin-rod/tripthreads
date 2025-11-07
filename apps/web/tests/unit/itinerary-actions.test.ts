/**
 * Unit Tests: Itinerary Server Actions
 *
 * Tests the server action functions for creating, updating, and deleting itinerary items.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
} from '@/app/actions/itinerary'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

// Mock createClient
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('createItineraryItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create itinerary item successfully', async () => {
    const mockUser = { id: 'user-123' }
    const mockItem = {
      id: 'item-123',
      trip_id: 'trip-123',
      type: 'transport',
      title: 'Flight to Paris',
      start_time: '2025-06-15T08:00:00Z',
    }

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockSelect = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockItem,
        error: null,
      }),
    })

    const mockInsert = vi.fn().mockReturnValue({
      select: mockSelect,
    })

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'participant-123', role: 'owner' },
              error: null,
            }),
          }),
        }),
      }),
      insert: mockInsert,
    })

    const result = await createItineraryItem({
      tripId: 'trip-123',
      type: 'transport',
      title: 'Flight to Paris',
      startTime: '2025-06-15T08:00:00Z',
    })

    expect(result.success).toBe(true)
    expect(result.item).toBeDefined()
    expect(mockInsert).toHaveBeenCalled()
  })

  it('should reject creation if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const result = await createItineraryItem({
      tripId: 'trip-123',
      type: 'activity',
      title: 'City Tour',
      startTime: '2025-06-16T10:00:00Z',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Authentication required')
  })

  it('should reject creation if user is a viewer', async () => {
    const mockUser = { id: 'user-123' }

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'participant-123', role: 'viewer' },
              error: null,
            }),
          }),
        }),
      }),
    })

    const result = await createItineraryItem({
      tripId: 'trip-123',
      type: 'activity',
      title: 'City Tour',
      startTime: '2025-06-16T10:00:00Z',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Viewers cannot add itinerary items')
  })

  it('should create item with all new fields', async () => {
    const mockUser = { id: 'user-123' }
    const mockItem = {
      id: 'item-123',
      notes: 'Bring passport',
      links: [{ title: 'Booking', url: 'https://example.com' }],
      is_all_day: false,
      metadata: { flight_number: 'AF123' },
    }

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockSelect = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockItem,
        error: null,
      }),
    })

    const mockInsert = vi.fn().mockReturnValue({
      select: mockSelect,
    })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'trip_participants') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'owner' },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      return { insert: mockInsert }
    })

    const result = await createItineraryItem({
      tripId: 'trip-123',
      type: 'transport',
      title: 'Flight',
      startTime: '2025-06-15T08:00:00Z',
      notes: 'Bring passport',
      links: [{ title: 'Booking', url: 'https://example.com' }],
      isAllDay: false,
      metadata: { flight_number: 'AF123' },
    })

    expect(result.success).toBe(true)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: 'Bring passport',
        links: [{ title: 'Booking', url: 'https://example.com' }],
        is_all_day: false,
        metadata: { flight_number: 'AF123' },
      })
    )
  })

  it('should add participants when participantIds provided', async () => {
    const mockUser = { id: 'user-123' }
    const mockItem = { id: 'item-123', trip_id: 'trip-123' }

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockParticipantInsert = vi.fn().mockResolvedValue({ error: null })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'trip_participants') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'owner' },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'itinerary_items') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockItem,
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'itinerary_item_participants') {
        return { insert: mockParticipantInsert }
      }
    })

    await createItineraryItem({
      tripId: 'trip-123',
      type: 'activity',
      title: 'Group Tour',
      startTime: '2025-06-16T10:00:00Z',
      participantIds: ['user-456', 'user-789'],
    })

    expect(mockParticipantInsert).toHaveBeenCalledWith([
      { itinerary_item_id: 'item-123', user_id: 'user-456' },
      { itinerary_item_id: 'item-123', user_id: 'user-789' },
    ])
  })
})

describe('updateItineraryItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update itinerary item successfully', async () => {
    const mockUser = { id: 'user-123' }
    const mockItem = {
      id: 'item-123',
      title: 'Updated Title',
      description: 'Updated description',
    }

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockItem,
            error: null,
          }),
        }),
      }),
    })

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { trip_id: 'trip-123' },
            error: null,
          }),
        }),
      }),
      update: mockUpdate,
    })

    const result = await updateItineraryItem({
      id: 'item-123',
      title: 'Updated Title',
      description: 'Updated description',
    })

    expect(result.success).toBe(true)
    expect(result.item).toBeDefined()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('should reject update if item not found', async () => {
    const mockUser = { id: 'user-123' }

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      }),
    })

    const result = await updateItineraryItem({
      id: 'nonexistent',
      title: 'New Title',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Itinerary item not found')
  })

  it('should only update provided fields', async () => {
    const mockUser = { id: 'user-123' }

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'item-123' },
            error: null,
          }),
        }),
      }),
    })

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { trip_id: 'trip-123' },
            error: null,
          }),
        }),
      }),
      update: mockUpdate,
    })

    await updateItineraryItem({
      id: 'item-123',
      title: 'New Title',
      // Only title provided
    })

    expect(mockUpdate).toHaveBeenCalledWith({
      title: 'New Title',
      // Only title in update object
    })
  })
})

describe('deleteItineraryItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete itinerary item successfully', async () => {
    const mockUser = { id: 'user-123' }

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { trip_id: 'trip-123', created_by: 'user-123' },
            error: null,
          }),
        }),
      }),
      delete: mockDelete,
    })

    const result = await deleteItineraryItem('item-123')

    expect(result.success).toBe(true)
    expect(mockDelete).toHaveBeenCalled()
  })

  it('should reject deletion if item not found', async () => {
    const mockUser = { id: 'user-123' }

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      }),
    })

    const result = await deleteItineraryItem('nonexistent')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Itinerary item not found')
  })

  it('should reject deletion if not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const result = await deleteItineraryItem('item-123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Authentication required')
  })
})
