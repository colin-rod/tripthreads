import type { NextRequest } from 'next/server'
import { POST } from './route'
import { createClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'

type SupabaseAuthResponse = {
  data: { user: { id: string } | null }
  error: Error | null
}

type SupabaseParticipantResponse = {
  data: { id: string } | null
  error: Error | null
}

type SupabaseUploadResponse = {
  data: { path: string } | null
  error: Error | null
}

type MockFile = {
  name: string
  size: number
  type: string
  arrayBuffer: () => Promise<ArrayBuffer>
}

declare global {
  interface FormData {
    get(name: string): unknown
  }
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

const createClientMock = createClient as jest.MockedFunction<typeof createClient>
const captureExceptionMock = jest.spyOn(Sentry, 'captureException')

function createSupabaseClient({
  authResponse = { data: { user: { id: 'user-123' } }, error: null } as SupabaseAuthResponse,
  participantResponse = {
    data: { id: 'participant-1' },
    error: null,
  } as SupabaseParticipantResponse,
  uploadResponse = { data: { path: 'trip/user/file.png' }, error: null } as SupabaseUploadResponse,
  publicUrl = 'https://example.com/trip/user/file.png',
} = {}) {
  const singleMock = jest.fn().mockResolvedValue(participantResponse)
  const secondEqMock = jest.fn(() => ({
    single: singleMock,
  }))
  const firstEqMock = jest.fn(() => ({
    eq: secondEqMock,
  }))
  const selectMock = jest.fn(() => ({
    eq: firstEqMock,
  }))
  const fromMock = jest.fn((table: string) => {
    if (table === 'trip_participants') {
      return { select: selectMock }
    }

    throw new Error(`Unexpected table queried: ${table}`)
  })

  const uploadMock = jest.fn().mockResolvedValue(uploadResponse)
  const getPublicUrlMock = jest.fn(() => ({ data: { publicUrl } }))
  const storageFromMock = jest.fn(() => ({
    upload: uploadMock,
    getPublicUrl: getPublicUrlMock,
  }))

  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue(authResponse),
    },
    from: fromMock,
    storage: {
      from: storageFromMock,
    },
    __mocks: {
      selectMock,
      firstEqMock,
      secondEqMock,
      singleMock,
      uploadMock,
      getPublicUrlMock,
      storageFromMock,
    },
  }

  return supabase
}

function createMockFile(): MockFile {
  return {
    name: 'example.png',
    size: 128,
    type: 'image/png',
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  }
}

function createRequest({
  file = createMockFile(),
  tripId = 'trip-123',
}: {
  file?: MockFile | null
  tripId?: string | null
}) {
  const entries = new Map<string, unknown>()

  if (file !== undefined) {
    entries.set('file', file)
  }

  if (tripId !== undefined) {
    entries.set('tripId', tripId)
  }

  return {
    formData: jest.fn(async () => ({
      get: (key: string) => entries.get(key) ?? null,
    })),
  } as unknown as NextRequest
}

describe('POST /api/upload-attachment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when authentication fails', async () => {
    const supabase = createSupabaseClient({
      authResponse: { data: { user: null }, error: new Error('not authenticated') },
    })

    createClientMock.mockResolvedValue(supabase as any)

    const response = await POST(createRequest({}))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: 'Authentication required' })
    expect(supabase.auth.getUser).toHaveBeenCalledTimes(1)
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it('returns 403 when user is not a participant', async () => {
    const participantError = new Error('not a participant')
    const supabase = createSupabaseClient({
      participantResponse: { data: null, error: participantError },
    })

    createClientMock.mockResolvedValue(supabase as any)

    const response = await POST(createRequest({}))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'You must be a trip participant to upload files' })
    expect(supabase.__mocks.selectMock).toHaveBeenCalledWith('id')
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it('uploads file and returns public URL', async () => {
    const supabase = createSupabaseClient()

    createClientMock.mockResolvedValue(supabase as any)

    const response = await POST(createRequest({}))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      url: 'https://example.com/trip/user/file.png',
      path: 'trip/user/file.png',
    })

    expect(supabase.__mocks.uploadMock).toHaveBeenCalledTimes(1)
    const uploadArgs = supabase.__mocks.uploadMock.mock.calls[0]
    expect(uploadArgs[0]).toMatch(/^trip-123\//)
    expect(uploadArgs[2]).toMatchObject({
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: false,
    })
    expect(supabase.__mocks.getPublicUrlMock).toHaveBeenCalledWith('trip/user/file.png')
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it('logs error to Sentry when upload fails', async () => {
    const uploadError = new Error('upload failure')
    const supabase = createSupabaseClient({
      uploadResponse: { data: null, error: uploadError },
    })

    createClientMock.mockResolvedValue(supabase as any)

    const response = await POST(createRequest({}))
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload).toEqual({ error: 'Failed to upload attachment' })
    expect(captureExceptionMock).toHaveBeenCalledWith(
      uploadError,
      expect.objectContaining({
        tags: expect.objectContaining({
          feature: 'storage',
          operation: 'upload_attachment',
        }),
        contexts: expect.objectContaining({
          file: expect.objectContaining({
            tripId: 'trip-123',
            name: 'example.png',
            size: 128,
            type: 'image/png',
          }),
          storage: expect.objectContaining({
            bucket: 'chat-attachments',
            path: expect.stringMatching(/^trip-123\//),
          }),
        }),
      })
    )
  })
})
