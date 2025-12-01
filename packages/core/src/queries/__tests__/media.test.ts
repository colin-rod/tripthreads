/**
 * Unit tests for media queries
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getMediaFiles,
  getMediaFilesGroupedByDate,
  getMediaFileCount,
  canUploadPhoto,
  createMediaFile,
  deleteMediaFileFromStorage,
  moveAttachmentToGallery,
  removeFromGallery,
  getMediaFileByUrl,
} from '../media'

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  storage: {
    from: jest.fn(),
  },
} as unknown as SupabaseClient

describe('Media Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getMediaFiles', () => {
    it('should fetch media files for a trip', async () => {
      const mockData = [
        {
          id: '1',
          url: 'https://example.com/photo1.jpg',
          thumbnail_url: 'https://example.com/thumb1.jpg',
          caption: 'Test photo 1',
          date_taken: '2025-01-15T10:00:00Z',
          user: { id: 'user1', full_name: 'Alice', avatar_url: null },
        },
      ]

      ;(mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      })

      const result = await getMediaFiles(mockSupabase, 'trip-1')

      expect(result).toEqual(mockData)
      expect(mockSupabase.from).toHaveBeenCalledWith('media_files')
    })

    it('should throw error on database failure', async () => {
      ;(mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })

      await expect(getMediaFiles(mockSupabase, 'trip-1')).rejects.toThrow(
        'Failed to fetch media files'
      )
    })
  })

  describe('getMediaFilesGroupedByDate', () => {
    it('should group media files by date', async () => {
      const mockData = [
        {
          id: '1',
          date_taken: '2025-01-15T10:00:00Z',
          url: 'photo1.jpg',
          user: { id: 'user1', full_name: 'Alice', avatar_url: null },
        },
        {
          id: '2',
          date_taken: '2025-01-15T14:00:00Z',
          url: 'photo2.jpg',
          user: { id: 'user1', full_name: 'Alice', avatar_url: null },
        },
        {
          id: '3',
          date_taken: '2025-01-16T10:00:00Z',
          url: 'photo3.jpg',
          user: { id: 'user2', full_name: 'Bob', avatar_url: null },
        },
      ]

      ;(mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      })

      const result = await getMediaFilesGroupedByDate(mockSupabase, 'trip-1')

      expect(Object.keys(result)).toHaveLength(2)
      expect(result['2025-01-15']).toHaveLength(2)
      expect(result['2025-01-16']).toHaveLength(1)
    })
  })

  describe('getMediaFileCount', () => {
    it('should return count of media files', async () => {
      ;(mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 15,
            error: null,
          }),
        }),
      })

      const count = await getMediaFileCount(mockSupabase, 'trip-1')

      expect(count).toBe(15)
    })

    it('should return 0 when no media files exist', async () => {
      ;(mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 0,
            error: null,
          }),
        }),
      })

      const count = await getMediaFileCount(mockSupabase, 'trip-1')

      expect(count).toBe(0)
    })
  })

  describe('canUploadPhoto', () => {
    it('should allow pro users unlimited uploads', async () => {
      ;(mockSupabase.from as jest.Mock).mockImplementation(table => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { plan: 'pro' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'media_files') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                count: 50,
                error: null,
              }),
            }),
          }
        }
      })

      const result = await canUploadPhoto(mockSupabase, 'trip-1', 'user-1')

      expect(result).toEqual({
        canUpload: true,
        remaining: Infinity,
        total: 50,
        limit: Infinity,
      })
    })

    it('should enforce 25 photo limit for free users', async () => {
      ;(mockSupabase.from as jest.Mock).mockImplementation(table => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { plan: 'free' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'media_files') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                count: 20,
                error: null,
              }),
            }),
          }
        }
      })

      const result = await canUploadPhoto(mockSupabase, 'trip-1', 'user-1')

      expect(result).toEqual({
        canUpload: true,
        remaining: 5,
        total: 20,
        limit: 25,
      })
    })

    it('should block uploads when free limit reached', async () => {
      ;(mockSupabase.from as jest.Mock).mockImplementation(table => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { plan: 'free' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'media_files') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                count: 25,
                error: null,
              }),
            }),
          }
        }
      })

      const result = await canUploadPhoto(mockSupabase, 'trip-1', 'user-1')

      expect(result).toEqual({
        canUpload: false,
        remaining: 0,
        total: 25,
        limit: 25,
      })
    })
  })

  describe('createMediaFile', () => {
    it('should create a media file', async () => {
      const mockMediaFile = {
        id: '1',
        trip_id: 'trip-1',
        user_id: 'user-1',
        type: 'photo',
        url: 'https://example.com/photo.jpg',
        thumbnail_url: 'https://example.com/thumb.jpg',
        caption: 'Test photo',
        date_taken: '2025-01-15T10:00:00Z',
        created_at: '2025-01-15T10:00:00Z',
      }

      ;(mockSupabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMediaFile,
              error: null,
            }),
          }),
        }),
      })

      const result = await createMediaFile(mockSupabase, {
        trip_id: 'trip-1',
        user_id: 'user-1',
        type: 'photo',
        url: 'https://example.com/photo.jpg',
        thumbnail_url: 'https://example.com/thumb.jpg',
        caption: 'Test photo',
        date_taken: '2025-01-15T10:00:00Z',
      })

      expect(result).toEqual(mockMediaFile)
    })
  })

  describe('moveAttachmentToGallery', () => {
    it('should move chat attachment to gallery', async () => {
      const mockMediaFile = {
        id: 'media-1',
        trip_id: 'trip-1',
        user_id: 'user-1',
        type: 'photo',
        url: 'https://example.com/chat-attachment.jpg',
        thumbnail_url: null,
        caption: 'From chat',
        date_taken: expect.any(String),
        created_at: expect.any(String),
      }

      ;(mockSupabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMediaFile,
              error: null,
            }),
          }),
        }),
      })

      const result = await moveAttachmentToGallery(
        mockSupabase,
        'https://example.com/chat-attachment.jpg',
        'trip-1',
        'user-1',
        'From chat'
      )

      expect(result.success).toBe(true)
      expect(result.mediaFileId).toBe('media-1')
    })

    it('should handle errors gracefully', async () => {
      ;(mockSupabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      })

      const result = await moveAttachmentToGallery(
        mockSupabase,
        'https://example.com/photo.jpg',
        'trip-1',
        'user-1'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('removeFromGallery', () => {
    it('should remove media file from gallery', async () => {
      ;(mockSupabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      const result = await removeFromGallery(mockSupabase, 'media-1')

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('media_files')
    })

    it('should handle deletion errors', async () => {
      ;(mockSupabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: 'Deletion failed' },
          }),
        }),
      })

      const result = await removeFromGallery(mockSupabase, 'media-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Deletion failed')
    })
  })

  describe('getMediaFileByUrl', () => {
    it('should return media file ID if URL exists in gallery', async () => {
      ;(mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: 'media-1' },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await getMediaFileByUrl(
        mockSupabase,
        'https://example.com/photo.jpg',
        'trip-1'
      )

      expect(result).toBe('media-1')
    })

    it('should return null if URL not in gallery', async () => {
      ;(mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await getMediaFileByUrl(
        mockSupabase,
        'https://example.com/not-found.jpg',
        'trip-1'
      )

      expect(result).toBeNull()
    })
  })

  describe('deleteMediaFileFromStorage', () => {
    it('should delete file from storage', async () => {
      const mockStorage = {
        from: jest.fn().mockReturnValue({
          remove: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mockSupabase as any).storage = mockStorage

      await deleteMediaFileFromStorage(mockSupabase, 'trip-1/user-1/photo.jpg')

      expect(mockStorage.from).toHaveBeenCalledWith('trip-media')
    })
  })
})
