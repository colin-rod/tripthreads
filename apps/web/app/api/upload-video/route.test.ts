/**
 * Video Upload API Tests
 *
 * Tests for video upload endpoint with Pro tier gating.
 * Covers:
 * - Free user blocking (0 videos allowed)
 * - Pro user uploads with 10GB storage limit
 * - File size validation (100MB max)
 * - File type validation (MP4, WebM, MOV, QuickTime)
 * - Storage tracking and rollback
 * - GET endpoint permissions check
 */

import type { NextRequest } from 'next/server'
import { POST, GET } from './route'
import { createClient } from '@/lib/supabase/server'
import { createMediaFile } from '@tripthreads/core'
import { checkVideoLimit } from '@/lib/subscription/limits'

jest.mock('@sentry/nextjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@tripthreads/core', () => ({
  createMediaFile: jest.fn(),
}))

jest.mock('@/lib/subscription/limits', () => ({
  checkVideoLimit: jest.fn(),
}))

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  createRateLimitResponse: jest.fn(),
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateMediaFile = createMediaFile as jest.MockedFunction<typeof createMediaFile>
const mockCheckVideoLimit = checkVideoLimit as jest.MockedFunction<typeof checkVideoLimit>

type ParticipantQuery = {
  select: jest.MockedFunction<() => ParticipantQuery>
  eq: jest.MockedFunction<() => ParticipantQuery>
  single: jest.MockedFunction<() => Promise<{ data: unknown; error: unknown }>>
}

function createPostRequest(fields: Record<string, unknown>) {
  return {
    formData: jest.fn().mockResolvedValue({
      get: (key: string) => (key in fields ? fields[key] : null),
    }),
  } as unknown as NextRequest
}

function createMockVideoFile(name: string, sizeBytes: number, type = 'video/mp4') {
  return {
    name,
    size: sizeBytes,
    type,
    arrayBuffer: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
  } as unknown as File
}

function createSupabaseMock() {
  const participantQuery: ParticipantQuery = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
  } as unknown as ParticipantQuery

  participantQuery.select.mockReturnValue(participantQuery)
  participantQuery.eq.mockReturnValue(participantQuery)

  const storageBucket = {
    upload: jest.fn(),
    remove: jest.fn().mockResolvedValue({ data: null, error: null }),
    getPublicUrl: jest.fn(),
  }

  const supabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn((table: string) => {
      if (table === 'trip_participants') {
        return participantQuery
      }
      throw new Error(`Unexpected table access: ${table}`)
    }),
    storage: {
      from: jest.fn(() => storageBucket),
    },
  }

  return { supabase, participantQuery, storageBucket }
}

describe('POST /api/upload-video', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Success cases', () => {
    it('uploads video successfully for Pro user', async () => {
      const { supabase, participantQuery, storageBucket } = createSupabaseMock()

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      participantQuery.single.mockResolvedValue({
        data: { id: 'participant-1', role: 'member' },
        error: null,
      })

      // Pro user with plenty of storage remaining
      mockCheckVideoLimit.mockResolvedValue({
        allowed: true,
        currentCount: 0,
        limit: Infinity,
        isProUser: true,
        currentStorageGB: 2.5,
        limitGB: 10,
        remainingGB: 7.5,
      })

      const videoData = { path: 'trip-123/user-1/videos/123-video.mp4' }
      storageBucket.upload.mockResolvedValue({ data: videoData, error: null })
      storageBucket.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn/video.mp4' } })

      mockCreateMediaFile.mockResolvedValue({ id: 'media-1' } as never)
      mockCreateClient.mockResolvedValue(supabase as never)

      const videoFile = createMockVideoFile('video.mp4', 50 * 1024 * 1024) // 50MB

      const request = createPostRequest({
        video: videoFile,
        tripId: 'trip-123',
        caption: 'Amazing video',
        dateTaken: '2024-01-01T00:00:00.000Z',
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body).toEqual({
        success: true,
        media: { id: 'media-1' },
        storageInfo: {
          currentStorageGB: 2.5,
          limitGB: 10,
          remainingGB: 7.5,
        },
      })

      expect(mockCreateMediaFile).toHaveBeenCalledWith(expect.anything(), {
        trip_id: 'trip-123',
        user_id: 'user-1',
        type: 'video',
        url: 'https://cdn/video.mp4',
        thumbnail_url: null,
        caption: 'Amazing video',
        date_taken: '2024-01-01T00:00:00.000Z',
        file_size_bytes: 50 * 1024 * 1024,
      })
    })

    it('accepts different video formats (WebM, MOV, QuickTime)', async () => {
      const { supabase, participantQuery, storageBucket } = createSupabaseMock()

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      participantQuery.single.mockResolvedValue({
        data: { id: 'participant-1', role: 'member' },
        error: null,
      })

      mockCheckVideoLimit.mockResolvedValue({
        allowed: true,
        currentCount: 0,
        limit: Infinity,
        isProUser: true,
        currentStorageGB: 1.0,
        limitGB: 10,
        remainingGB: 9.0,
      })

      storageBucket.upload.mockResolvedValue({ data: { path: 'test.webm' }, error: null })
      storageBucket.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn/test.webm' } })
      mockCreateMediaFile.mockResolvedValue({ id: 'media-1' } as never)
      mockCreateClient.mockResolvedValue(supabase as never)

      const formats = ['video/webm', 'video/quicktime', 'video/x-m4v']

      for (const format of formats) {
        jest.clearAllMocks()
        mockCreateClient.mockResolvedValue(supabase as never)
        mockCheckVideoLimit.mockResolvedValue({
          allowed: true,
          currentCount: 0,
          limit: Infinity,
          isProUser: true,
          currentStorageGB: 1.0,
          limitGB: 10,
          remainingGB: 9.0,
        })
        mockCreateMediaFile.mockResolvedValue({ id: 'media-1' } as never)

        const videoFile = createMockVideoFile(
          `video.${format.split('/')[1]}`,
          10 * 1024 * 1024,
          format
        )
        const request = createPostRequest({
          video: videoFile,
          tripId: 'trip-123',
          dateTaken: '2024-01-01T00:00:00.000Z',
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
      }
    })
  })

  describe('Free user blocking', () => {
    it('blocks free user from uploading videos', async () => {
      const { supabase, participantQuery } = createSupabaseMock()

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      participantQuery.single.mockResolvedValue({
        data: { id: 'participant-1', role: 'member' },
        error: null,
      })

      // Free user - not allowed
      mockCheckVideoLimit.mockResolvedValue({
        allowed: false,
        reason: 'Video uploads are a Pro feature. Upgrade to Pro to upload videos (10GB storage).',
        currentCount: 0,
        limit: 0,
        isProUser: false,
        currentStorageGB: 0,
        limitGB: 0,
        remainingGB: 0,
      })

      mockCreateClient.mockResolvedValue(supabase as never)

      const videoFile = createMockVideoFile('video.mp4', 10 * 1024 * 1024)
      const request = createPostRequest({
        video: videoFile,
        tripId: 'trip-123',
        dateTaken: '2024-01-01T00:00:00.000Z',
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body).toMatchObject({
        error: 'Video upload limit reached',
        message: 'Video uploads are a Pro feature. Upgrade to Pro to upload videos (10GB storage).',
        limitInfo: {
          isProUser: false,
          currentStorageGB: 0,
          limitGB: 0,
          remainingGB: 0,
        },
      })
    })
  })

  describe('Pro user storage limits', () => {
    it('blocks Pro user when exceeding 10GB storage limit', async () => {
      const { supabase, participantQuery } = createSupabaseMock()

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      participantQuery.single.mockResolvedValue({
        data: { id: 'participant-1', role: 'member' },
        error: null,
      })

      // Pro user at limit
      mockCheckVideoLimit.mockResolvedValue({
        allowed: false,
        reason:
          "You've reached your 10GB video storage limit. Delete some videos or contact support.",
        currentCount: 0,
        limit: Infinity,
        isProUser: true,
        currentStorageGB: 9.95,
        limitGB: 10,
        remainingGB: 0.05,
      })

      mockCreateClient.mockResolvedValue(supabase as never)

      const videoFile = createMockVideoFile('video.mp4', 100 * 1024 * 1024) // 100MB (would exceed limit)
      const request = createPostRequest({
        video: videoFile,
        tripId: 'trip-123',
        dateTaken: '2024-01-01T00:00:00.000Z',
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body).toMatchObject({
        error: 'Video upload limit reached',
        message:
          "You've reached your 10GB video storage limit. Delete some videos or contact support.",
        limitInfo: {
          isProUser: true,
          currentStorageGB: 9.95,
          limitGB: 10,
          remainingGB: 0.05,
        },
      })
    })
  })

  describe('File validation', () => {
    it('rejects video files larger than 100MB', async () => {
      const videoFile = createMockVideoFile('huge-video.mp4', 150 * 1024 * 1024) // 150MB
      const request = createPostRequest({
        video: videoFile,
        tripId: 'trip-123',
        dateTaken: '2024-01-01T00:00:00.000Z',
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(413)
      expect(body.error).toBe('File size too large')
      expect(body.message).toContain('exceeds 100MB limit')
      expect(body.message).toContain('150.00MB')
    })

    it('rejects invalid video MIME types', async () => {
      const invalidTypes = ['image/jpeg', 'video/avi', 'application/pdf', 'text/plain']

      for (const invalidType of invalidTypes) {
        const videoFile = createMockVideoFile('file.avi', 10 * 1024 * 1024, invalidType)
        const request = createPostRequest({
          video: videoFile,
          tripId: 'trip-123',
          dateTaken: '2024-01-01T00:00:00.000Z',
        })

        const response = await POST(request)
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body.error).toBe('Invalid video format')
        expect(body.message).toContain('Supported formats: MP4, WebM, MOV, QuickTime')
      }
    })

    it('requires all required fields', async () => {
      const testCases = [
        { video: null, tripId: 'trip-123', dateTaken: '2024-01-01' },
        { video: createMockVideoFile('v.mp4', 1024), tripId: null, dateTaken: '2024-01-01' },
        { video: createMockVideoFile('v.mp4', 1024), tripId: 'trip-123', dateTaken: null },
      ]

      for (const fields of testCases) {
        const request = createPostRequest(fields)
        const response = await POST(request)
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body.error).toBe('Missing required fields: video, tripId, dateTaken')
      }
    })
  })

  describe('Authorization & permissions', () => {
    it('requires authentication', async () => {
      const { supabase } = createSupabaseMock()

      supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
      mockCreateClient.mockResolvedValue(supabase as never)

      const videoFile = createMockVideoFile('video.mp4', 10 * 1024 * 1024)
      const request = createPostRequest({
        video: videoFile,
        tripId: 'trip-123',
        dateTaken: '2024-01-01T00:00:00.000Z',
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toBe('Authentication required')
    })

    it('requires user to be trip participant', async () => {
      const { supabase, participantQuery } = createSupabaseMock()

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      participantQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      })

      mockCreateClient.mockResolvedValue(supabase as never)

      const videoFile = createMockVideoFile('video.mp4', 10 * 1024 * 1024)
      const request = createPostRequest({
        video: videoFile,
        tripId: 'trip-123',
        dateTaken: '2024-01-01T00:00:00.000Z',
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error).toBe('You must be a trip participant to upload videos')
    })
  })

  describe('Error handling & rollback', () => {
    it('rolls back storage upload on database insert failure', async () => {
      const { supabase, participantQuery, storageBucket } = createSupabaseMock()

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      participantQuery.single.mockResolvedValue({
        data: { id: 'participant-1', role: 'member' },
        error: null,
      })

      mockCheckVideoLimit.mockResolvedValue({
        allowed: true,
        currentCount: 0,
        limit: Infinity,
        isProUser: true,
        currentStorageGB: 1.0,
        limitGB: 10,
        remainingGB: 9.0,
      })

      const videoData = { path: 'trip-123/user-1/videos/123-video.mp4' }
      storageBucket.upload.mockResolvedValue({ data: videoData, error: null })
      storageBucket.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn/video.mp4' } })

      // Database insert fails
      mockCreateMediaFile.mockRejectedValue(new Error('Database error'))
      mockCreateClient.mockResolvedValue(supabase as never)

      const videoFile = createMockVideoFile('video.mp4', 10 * 1024 * 1024)
      const request = createPostRequest({
        video: videoFile,
        tripId: 'trip-123',
        dateTaken: '2024-01-01T00:00:00.000Z',
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.error).toBe('Failed to save video metadata')

      // Verify rollback: storage file deleted
      expect(storageBucket.remove).toHaveBeenCalledWith([videoData.path])
    })

    it('handles storage upload failure gracefully', async () => {
      const { supabase, participantQuery, storageBucket } = createSupabaseMock()

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      participantQuery.single.mockResolvedValue({
        data: { id: 'participant-1', role: 'member' },
        error: null,
      })

      mockCheckVideoLimit.mockResolvedValue({
        allowed: true,
        currentCount: 0,
        limit: Infinity,
        isProUser: true,
        currentStorageGB: 1.0,
        limitGB: 10,
        remainingGB: 9.0,
      })

      storageBucket.upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      })

      mockCreateClient.mockResolvedValue(supabase as never)

      const videoFile = createMockVideoFile('video.mp4', 10 * 1024 * 1024)
      const request = createPostRequest({
        video: videoFile,
        tripId: 'trip-123',
        dateTaken: '2024-01-01T00:00:00.000Z',
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.error).toBe('Failed to upload video')
    })
  })
})

describe('GET /api/upload-video', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns Pro user upload permissions with storage info', async () => {
    const { supabase } = createSupabaseMock()

    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    mockCheckVideoLimit.mockResolvedValue({
      allowed: true,
      currentCount: 0,
      limit: Infinity,
      isProUser: true,
      currentStorageGB: 3.25,
      limitGB: 10,
      remainingGB: 6.75,
    })

    mockCreateClient.mockResolvedValue(supabase as never)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      allowed: true,
      isProUser: true,
      currentStorageGB: 3.25,
      limitGB: 10,
      remainingGB: 6.75,
      reason: undefined,
    })
  })

  it('returns free user blocked with reason', async () => {
    const { supabase } = createSupabaseMock()

    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    mockCheckVideoLimit.mockResolvedValue({
      allowed: false,
      reason: 'Video uploads are a Pro feature. Upgrade to Pro to upload videos (10GB storage).',
      currentCount: 0,
      limit: 0,
      isProUser: false,
      currentStorageGB: 0,
      limitGB: 0,
      remainingGB: 0,
    })

    mockCreateClient.mockResolvedValue(supabase as never)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      allowed: false,
      isProUser: false,
      currentStorageGB: 0,
      limitGB: 0,
      remainingGB: 0,
      reason: 'Video uploads are a Pro feature. Upgrade to Pro to upload videos (10GB storage).',
    })
  })

  it('requires authentication', async () => {
    const { supabase } = createSupabaseMock()

    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    mockCreateClient.mockResolvedValue(supabase as never)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Authentication required')
  })
})
