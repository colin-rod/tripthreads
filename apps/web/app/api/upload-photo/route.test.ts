import type { NextRequest } from 'next/server'
import { POST, GET } from './route'
import { createClient } from '@/lib/supabase/server'
import { createMediaFile, canUploadPhoto } from '@tripthreads/core/queries/media'

jest.mock('@sentry/nextjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@tripthreads/core/queries/media', () => ({
  createMediaFile: jest.fn(),
  canUploadPhoto: jest.fn(),
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateMediaFile = createMediaFile as jest.MockedFunction<typeof createMediaFile>
const mockCanUploadPhoto = canUploadPhoto as jest.MockedFunction<typeof canUploadPhoto>

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

function createGetRequest(url: string) {
  return { url } as unknown as NextRequest
}

function createMockFile(name: string) {
  return {
    name,
    size: 100,
    type: 'image/jpeg',
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

describe('POST /api/upload-photo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('uploads photo successfully', async () => {
    const { supabase, participantQuery, storageBucket } = createSupabaseMock()

    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    participantQuery.single.mockResolvedValue({ data: { id: 'participant-1', role: 'member' }, error: null })

    mockCanUploadPhoto.mockResolvedValue({
      canUpload: true,
      remaining: 5,
      total: 20,
      limit: 25,
    })

    const fullImageData = { path: 'trip-123/user-1/123-photo.jpg' }
    const thumbnailData = { path: 'trip-123/user-1/thumbnails/123-photo.jpg' }

    storageBucket.upload
      .mockResolvedValueOnce({ data: fullImageData, error: null })
      .mockResolvedValueOnce({ data: thumbnailData, error: null })
    storageBucket.getPublicUrl
      .mockReturnValueOnce({ data: { publicUrl: 'https://cdn/full.jpg' } })
      .mockReturnValueOnce({ data: { publicUrl: 'https://cdn/thumb.jpg' } })

    mockCreateMediaFile.mockResolvedValue({ id: 'media-1' } as never)
    mockCreateClient.mockResolvedValue(supabase as never)

    const fullImageFile = createMockFile('photo.jpg')
    const thumbnailFile = createMockFile('photo-thumb.jpg')

    const request = createPostRequest({
      fullImage: fullImageFile,
      thumbnail: thumbnailFile,
      tripId: 'trip-123',
      caption: 'Great trip',
      dateTaken: '2024-01-01T00:00:00.000Z',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      success: true,
      media: { id: 'media-1' },
      remaining: 4,
    })

    expect(mockCreateMediaFile).toHaveBeenCalledWith(expect.anything(), {
      trip_id: 'trip-123',
      user_id: 'user-1',
      type: 'photo',
      url: 'https://cdn/full.jpg',
      thumbnail_url: 'https://cdn/thumb.jpg',
      caption: 'Great trip',
      date_taken: '2024-01-01T00:00:00.000Z',
    })
  })

  it('denies upload when user is not a participant', async () => {
    const { supabase, participantQuery } = createSupabaseMock()
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    participantQuery.single.mockResolvedValue({ data: null, error: { message: 'not allowed' } })

    mockCreateClient.mockResolvedValue(supabase as never)

    const request = createPostRequest({
      fullImage: createMockFile('photo.jpg'),
      thumbnail: createMockFile('photo-thumb.jpg'),
      tripId: 'trip-123',
      dateTaken: '2024-01-01T00:00:00.000Z',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('You must be a trip participant to upload photos')
    expect(mockCanUploadPhoto).not.toHaveBeenCalled()
  })

  it('rejects uploads when plan limit is reached', async () => {
    const { supabase, participantQuery } = createSupabaseMock()
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    participantQuery.single.mockResolvedValue({ data: { id: 'participant-1' }, error: null })

    mockCanUploadPhoto.mockResolvedValue({
      canUpload: false,
      remaining: 0,
      total: 25,
      limit: 25,
    })

    mockCreateClient.mockResolvedValue(supabase as never)

    const request = createPostRequest({
      fullImage: createMockFile('photo.jpg'),
      thumbnail: createMockFile('photo-thumb.jpg'),
      tripId: 'trip-123',
      dateTaken: '2024-01-01T00:00:00.000Z',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toMatchObject({
      error: 'Photo limit reached',
      limit: 25,
      total: 25,
    })
    expect(mockCreateMediaFile).not.toHaveBeenCalled()
  })

  it('returns an error when full image upload fails', async () => {
    const { supabase, participantQuery, storageBucket } = createSupabaseMock()

    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    participantQuery.single.mockResolvedValue({ data: { id: 'participant-1' }, error: null })

    mockCanUploadPhoto.mockResolvedValue({
      canUpload: true,
      remaining: 5,
      total: 20,
      limit: 25,
    })

    storageBucket.upload.mockResolvedValueOnce({ data: null, error: { message: 'failed' } })

    mockCreateClient.mockResolvedValue(supabase as never)

    const request = createPostRequest({
      fullImage: createMockFile('photo.jpg'),
      thumbnail: createMockFile('photo-thumb.jpg'),
      tripId: 'trip-123',
      dateTaken: '2024-01-01T00:00:00.000Z',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Failed to upload photo')
    expect(storageBucket.upload).toHaveBeenCalledTimes(1)
  })

  it('rolls back full image when thumbnail upload fails', async () => {
    const { supabase, participantQuery, storageBucket } = createSupabaseMock()

    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    participantQuery.single.mockResolvedValue({ data: { id: 'participant-1' }, error: null })

    mockCanUploadPhoto.mockResolvedValue({
      canUpload: true,
      remaining: 5,
      total: 20,
      limit: 25,
    })

    const fullImageData = { path: 'trip-123/user-1/123-photo.jpg' }

    storageBucket.upload
      .mockResolvedValueOnce({ data: fullImageData, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'thumb failed' } })

    mockCreateClient.mockResolvedValue(supabase as never)

    const request = createPostRequest({
      fullImage: createMockFile('photo.jpg'),
      thumbnail: createMockFile('photo-thumb.jpg'),
      tripId: 'trip-123',
      dateTaken: '2024-01-01T00:00:00.000Z',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Failed to upload thumbnail')
    expect(storageBucket.remove).toHaveBeenCalledWith([fullImageData.path])
    expect(mockCreateMediaFile).not.toHaveBeenCalled()
  })

  it('rolls back uploads when database write fails', async () => {
    const { supabase, participantQuery, storageBucket } = createSupabaseMock()

    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    participantQuery.single.mockResolvedValue({ data: { id: 'participant-1' }, error: null })

    mockCanUploadPhoto.mockResolvedValue({
      canUpload: true,
      remaining: 5,
      total: 20,
      limit: 25,
    })

    const fullImageData = { path: 'trip-123/user-1/123-photo.jpg' }
    const thumbnailData = { path: 'trip-123/user-1/thumbnails/123-photo.jpg' }

    storageBucket.upload
      .mockResolvedValueOnce({ data: fullImageData, error: null })
      .mockResolvedValueOnce({ data: thumbnailData, error: null })
    storageBucket.getPublicUrl
      .mockReturnValueOnce({ data: { publicUrl: 'https://cdn/full.jpg' } })
      .mockReturnValueOnce({ data: { publicUrl: 'https://cdn/thumb.jpg' } })

    mockCreateMediaFile.mockRejectedValue(new Error('db failure'))
    mockCreateClient.mockResolvedValue(supabase as never)

    const request = createPostRequest({
      fullImage: createMockFile('photo.jpg'),
      thumbnail: createMockFile('photo-thumb.jpg'),
      tripId: 'trip-123',
      dateTaken: '2024-01-01T00:00:00.000Z',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Failed to save photo metadata')
    expect(storageBucket.remove).toHaveBeenCalledWith([fullImageData.path, thumbnailData.path])
  })
})

describe('GET /api/upload-photo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 when tripId is missing', async () => {
    const request = createGetRequest('https://example.com/api/upload-photo')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Missing tripId parameter')
  })

  it('returns 401 for unauthenticated users', async () => {
    const { supabase } = createSupabaseMock()
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    mockCreateClient.mockResolvedValue(supabase as never)

    const request = createGetRequest('https://example.com/api/upload-photo?tripId=trip-123')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Authentication required')
    expect(mockCanUploadPhoto).not.toHaveBeenCalled()
  })

  it('returns upload permissions when authenticated', async () => {
    const { supabase } = createSupabaseMock()
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    mockCanUploadPhoto.mockResolvedValue({
      canUpload: true,
      remaining: 3,
      total: 2,
      limit: 25,
    })

    mockCreateClient.mockResolvedValue(supabase as never)

    const request = createGetRequest('https://example.com/api/upload-photo?tripId=trip-123')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      canUpload: true,
      remaining: 3,
      total: 2,
      limit: 25,
    })
  })

  it('handles Supabase errors when checking permissions', async () => {
    const { supabase } = createSupabaseMock()
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    mockCanUploadPhoto.mockRejectedValue(new Error('failed'))

    mockCreateClient.mockResolvedValue(supabase as never)

    const request = createGetRequest('https://example.com/api/upload-photo?tripId=trip-123')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Failed to check upload permission')
  })
})
