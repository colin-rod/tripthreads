/**
 * Integration tests for Itinerary CRUD operations
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@tripthreads/core'
import { createItineraryItem, updateItineraryItem, deleteItineraryItem } from '@tripthreads/core'

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
}
const supabase = mockSupabase as unknown as SupabaseClient<Database>

describe('Itinerary CRUD Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createItineraryItem', () => {
    it('should create an itinerary item successfully', async () => {
      const mockItem = {
        id: 'item-123',
        trip_id: 'trip-123',
        type: 'activity' as const,
        title: 'Visit Eiffel Tower',
        description: 'Iconic landmark',
        notes: null,
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T12:00:00Z',
        is_all_day: false,
        location: 'Paris, France',
        created_by: 'user-123',
        links: [],
        metadata: {},
      }

      const mockResponse = {
        data: mockItem,
        error: null,
      }

      mockSupabase.from().insert().select().single.mockResolvedValue(mockResponse)

      const result = await createItineraryItem(supabase, mockItem)

      expect(result).toEqual(mockItem)
      expect(mockSupabase.from).toHaveBeenCalledWith('itinerary_items')
    })

    it('should handle creation errors', async () => {
      const mockError = {
        message: 'Database error',
        code: '23505',
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: mockError,
      })

      await expect(
        createItineraryItem(supabase, {
          trip_id: 'trip-123',
          type: 'activity',
          title: 'Test',
          start_time: '2024-01-15T10:00:00Z',
          created_by: 'user-123',
        })
      ).rejects.toThrow('Failed to create itinerary item')
    })
  })

  describe('updateItineraryItem', () => {
    it('should update an itinerary item successfully', async () => {
      const updatedItem = {
        id: 'item-123',
        title: 'Updated Title',
        description: 'Updated description',
      }

      const mockResponse = {
        data: updatedItem,
        error: null,
      }

      mockSupabase.from().update().eq().select().single.mockResolvedValue(mockResponse)

      const result = await updateItineraryItem(supabase, 'item-123', {
        title: 'Updated Title',
        description: 'Updated description',
      })

      expect(result).toEqual(updatedItem)
      expect(mockSupabase.from).toHaveBeenCalledWith('itinerary_items')
    })

    it('should handle update errors', async () => {
      mockSupabase
        .from()
        .update()
        .eq()
        .select()
        .single.mockResolvedValue({
          data: null,
          error: { message: 'Not found', code: 'PGRST116' },
        })

      await expect(updateItineraryItem(supabase, 'item-123', { title: 'Test' })).rejects.toThrow(
        'Failed to update itinerary item'
      )
    })
  })

  describe('deleteItineraryItem', () => {
    it('should delete an itinerary item successfully', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({
        error: null,
      })

      await deleteItineraryItem(supabase, 'item-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('itinerary_items')
    })

    it('should handle deletion errors', async () => {
      mockSupabase
        .from()
        .delete()
        .eq.mockResolvedValue({
          error: { message: 'Not found', code: 'PGRST116' },
        })

      await expect(deleteItineraryItem(supabase, 'item-123')).rejects.toThrow(
        'Failed to delete itinerary item'
      )
    })
  })

  describe('Full CRUD Flow', () => {
    it('should create, update, and delete an itinerary item', async () => {
      // Create
      const newItem = {
        trip_id: 'trip-123',
        type: 'activity' as const,
        title: 'Museum Visit',
        start_time: '2024-01-15T14:00:00Z',
        created_by: 'user-123',
      }

      mockSupabase
        .from()
        .insert()
        .select()
        .single.mockResolvedValue({
          data: { ...newItem, id: 'item-123' },
          error: null,
        })

      const created = await createItineraryItem(supabase, newItem)
      expect(created.id).toBe('item-123')

      // Update
      mockSupabase
        .from()
        .update()
        .eq()
        .select()
        .single.mockResolvedValue({
          data: { ...created, title: 'Art Museum Visit' },
          error: null,
        })

      const updated = await updateItineraryItem(supabase, 'item-123', {
        title: 'Art Museum Visit',
      })
      expect(updated.title).toBe('Art Museum Visit')

      // Delete
      mockSupabase.from().delete().eq.mockResolvedValue({ error: null })

      await deleteItineraryItem(supabase, 'item-123')
      expect(mockSupabase.from).toHaveBeenCalledWith('itinerary_items')
    })
  })
})
