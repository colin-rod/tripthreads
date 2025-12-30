/**
 * Video Upload Integration Tests
 *
 * End-to-end integration tests for video upload functionality:
 * - Free user blocked with upgrade prompt
 * - Pro user full upload flow
 * - Pro user at storage limit
 * - Video appears in feed after upload
 * - Storage tracking and limits
 */

import { createClient } from '@supabase/supabase-js'
import { checkVideoLimit } from '@/lib/subscription/limits'
import { createMediaFile, getMediaFiles } from '@tripthreads/core'

// Mock Supabase client
jest.mock('@supabase/supabase-js')
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  storage: {
    from: jest.fn(),
  },
}

describe('Video Upload Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  describe('Free User Flow', () => {
    it('blocks free user from uploading videos', async () => {
      // Mock free user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      // Mock profile query - free tier
      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-1', plan: 'free', video_storage_bytes: 0 },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(profileQuery)

      // Check video limit
      const result = await checkVideoLimit('user-1', 50 * 1024 * 1024) // 50MB

      expect(result.allowed).toBe(false)
      expect(result.isProUser).toBe(false)
      expect(result.reason).toContain('Pro feature')
      expect(result.currentStorageGB).toBe(0)
      expect(result.limitGB).toBe(0)
      expect(result.remainingGB).toBe(0)
    })

    it('shows correct error message for free users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-1', plan: 'free' },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(profileQuery)

      const result = await checkVideoLimit('user-1', 1024)

      expect(result.reason).toBe(
        'Video uploads are a Pro feature. Upgrade to Pro to upload videos (10GB storage).'
      )
    })
  })

  describe('Pro User Upload Flow', () => {
    it('allows Pro user to upload video within storage limit', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-pro' } },
        error: null,
      })

      // Mock profile query - Pro tier with 2.5GB used
      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'user-pro',
            plan: 'pro',
            video_storage_bytes: 2.5 * 1024 * 1024 * 1024, // 2.5GB
          },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(profileQuery)

      // Attempt to upload 50MB video
      const result = await checkVideoLimit('user-pro', 50 * 1024 * 1024)

      expect(result.allowed).toBe(true)
      expect(result.isProUser).toBe(true)
      expect(result.currentStorageGB).toBe(2.5)
      expect(result.limitGB).toBe(10)
      expect(result.remainingGB).toBeCloseTo(7.5, 1)
    })

    it('creates media file record for uploaded video', async () => {
      const insertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'media-1',
            trip_id: 'trip-1',
            user_id: 'user-pro',
            type: 'video',
            url: 'https://storage.example.com/video.mp4',
            file_size_bytes: 50 * 1024 * 1024,
            caption: 'Amazing sunset',
            date_taken: '2025-01-15T10:00:00Z',
            created_at: '2025-01-15T10:05:00Z',
          },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(insertQuery)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mediaFile = await createMediaFile(mockSupabase as any, {
        trip_id: 'trip-1',
        user_id: 'user-pro',
        type: 'video',
        url: 'https://storage.example.com/video.mp4',
        thumbnail_url: null,
        caption: 'Amazing sunset',
        date_taken: '2025-01-15T10:00:00Z',
        file_size_bytes: 50 * 1024 * 1024,
      })

      expect(mediaFile).toBeDefined()
      expect(mediaFile.type).toBe('video')
      expect(mediaFile.file_size_bytes).toBe(50 * 1024 * 1024)
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'video',
          file_size_bytes: 50 * 1024 * 1024,
        })
      )
    })

    it('returns video in media files query', async () => {
      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'media-1',
              type: 'photo',
              url: 'https://storage.example.com/photo.jpg',
              user: { id: 'user-1', full_name: 'John Doe', avatar_url: null },
            },
            {
              id: 'media-2',
              type: 'video',
              url: 'https://storage.example.com/video.mp4',
              file_size_bytes: 50 * 1024 * 1024,
              user: { id: 'user-pro', full_name: 'Jane Pro', avatar_url: null },
            },
          ],
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(selectQuery)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mediaFiles = await getMediaFiles(mockSupabase as any, 'trip-1')

      expect(mediaFiles).toHaveLength(2)
      expect(mediaFiles[0].type).toBe('photo')
      expect(mediaFiles[1].type).toBe('video')
      expect(mediaFiles[1].file_size_bytes).toBe(50 * 1024 * 1024)
    })
  })

  describe('Pro User Storage Limit Enforcement', () => {
    it('blocks Pro user at 10GB storage limit', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-pro' } },
        error: null,
      })

      // Mock profile query - Pro tier with 10GB used (at limit)
      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'user-pro',
            plan: 'pro',
            video_storage_bytes: 10 * 1024 * 1024 * 1024, // 10GB
          },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(profileQuery)

      const result = await checkVideoLimit('user-pro', 1 * 1024 * 1024) // Try to upload 1MB

      expect(result.allowed).toBe(false)
      expect(result.isProUser).toBe(true)
      expect(result.currentStorageGB).toBe(10)
      expect(result.remainingGB).toBe(0)
      expect(result.reason).toContain('10GB video storage limit')
    })

    it('blocks Pro user when upload would exceed 10GB limit', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-pro' } },
        error: null,
      })

      // Mock profile query - Pro tier with 9.9GB used
      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'user-pro',
            plan: 'pro',
            video_storage_bytes: 9.9 * 1024 * 1024 * 1024, // 9.9GB
          },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(profileQuery)

      // Try to upload 200MB video (would exceed 10GB limit)
      const result = await checkVideoLimit('user-pro', 200 * 1024 * 1024)

      expect(result.allowed).toBe(false)
      expect(result.isProUser).toBe(true)
      expect(result.currentStorageGB).toBeCloseTo(9.9, 1)
      expect(result.remainingGB).toBeCloseTo(0.1, 1)
    })

    it('allows Pro user upload just under 10GB limit', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-pro' } },
        error: null,
      })

      // Mock profile query - Pro tier with 9.95GB used
      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'user-pro',
            plan: 'pro',
            video_storage_bytes: 9.95 * 1024 * 1024 * 1024, // 9.95GB
          },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(profileQuery)

      // Upload 40MB video (total = 9.99GB, under 10GB limit)
      const result = await checkVideoLimit('user-pro', 40 * 1024 * 1024)

      expect(result.allowed).toBe(true)
      expect(result.isProUser).toBe(true)
      expect(result.currentStorageGB).toBeCloseTo(9.95, 2)
      expect(result.remainingGB).toBeCloseTo(0.05, 2)
    })
  })

  describe('File Size Validation', () => {
    it('blocks files larger than 100MB', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-pro' } },
        error: null,
      })

      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-pro', plan: 'pro', video_storage_bytes: 0 },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(profileQuery)

      // Try to upload 150MB video
      const result = await checkVideoLimit('user-pro', 150 * 1024 * 1024)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('100MB limit')
    })

    it('allows files up to 100MB', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-pro' } },
        error: null,
      })

      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-pro', plan: 'pro', video_storage_bytes: 0 },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(profileQuery)

      // Upload exactly 100MB video
      const result = await checkVideoLimit('user-pro', 100 * 1024 * 1024)

      expect(result.allowed).toBe(true)
    })
  })

  describe('Storage Tracking', () => {
    it('tracks storage usage accurately', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-pro' } },
        error: null,
      })

      // Simulate multiple videos uploaded (total 5.5GB)
      const videos = [
        { size: 1.5 * 1024 * 1024 * 1024 }, // 1.5GB
        { size: 2.0 * 1024 * 1024 * 1024 }, // 2.0GB
        { size: 2.0 * 1024 * 1024 * 1024 }, // 2.0GB
      ]

      const totalStorage = videos.reduce((sum, v) => sum + v.size, 0)

      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'user-pro',
            plan: 'pro',
            video_storage_bytes: totalStorage, // 5.5GB
          },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(profileQuery)

      const result = await checkVideoLimit('user-pro', 50 * 1024 * 1024) // +50MB

      expect(result.allowed).toBe(true)
      expect(result.currentStorageGB).toBeCloseTo(5.5, 1)
      expect(result.remainingGB).toBeCloseTo(4.5, 1)
    })

    it('returns correct storage info for empty Pro account', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-pro-new' } },
        error: null,
      })

      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'user-pro-new',
            plan: 'pro',
            video_storage_bytes: 0,
          },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(profileQuery)

      const result = await checkVideoLimit('user-pro-new', 1024)

      expect(result.allowed).toBe(true)
      expect(result.currentStorageGB).toBe(0)
      expect(result.limitGB).toBe(10)
      expect(result.remainingGB).toBe(10)
    })
  })

  describe('Edge Cases', () => {
    it('handles user with null plan as free tier', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-null-plan' } },
        error: null,
      })

      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-null-plan', plan: null },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(profileQuery)

      const result = await checkVideoLimit('user-null-plan', 1024)

      expect(result.allowed).toBe(false)
      expect(result.isProUser).toBe(false)
    })

    it('handles missing video_storage_bytes field', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-pro' } },
        error: null,
      })

      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'user-pro',
            plan: 'pro',
            // video_storage_bytes missing (undefined)
          },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(profileQuery)

      const result = await checkVideoLimit('user-pro', 1024)

      expect(result.allowed).toBe(true)
      expect(result.currentStorageGB).toBe(0) // Defaults to 0
    })

    it('handles very small video files', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-pro' } },
        error: null,
      })

      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-pro', plan: 'pro', video_storage_bytes: 0 },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(profileQuery)

      // 1KB video
      const result = await checkVideoLimit('user-pro', 1024)

      expect(result.allowed).toBe(true)
      expect(result.currentStorageGB).toBe(0)
    })
  })
})
