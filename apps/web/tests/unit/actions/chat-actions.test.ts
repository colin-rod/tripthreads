import { describe, it, expect, jest, afterEach, afterAll } from '@jest/globals'
import {
  addAttachmentToGallery,
  addReaction,
  createBotMessage,
  createMessage,
  getChatMessages,
  getReactions,
  removeAttachmentFromGallery,
  uploadAttachment,
} from '@/app/actions/chat'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as Sentry from '@sentry/nextjs'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('../../../../../packages/core/src/queries/media', () => ({
  moveAttachmentToGallery: jest.fn(),
  removeFromGallery: jest.fn(),
}))

type SupabaseAuthResponse = {
  data: { user: { id: string } | null }
  error: { message: string } | null
}

type SupabaseMock = {
  auth: {
    getUser: jest.MockedFunction<() => Promise<SupabaseAuthResponse>>
  }
  from: jest.MockedFunction<(table: string) => any>
  storage: {
    from: jest.MockedFunction<(bucket: string) => any>
  }
}

const createMockSupabase = (): SupabaseMock => ({
  auth: {
    getUser: jest.fn() as jest.MockedFunction<() => Promise<SupabaseAuthResponse>>,
  },
  from: jest.fn() as jest.MockedFunction<(table: string) => any>,
  storage: {
    from: jest.fn() as jest.MockedFunction<(bucket: string) => any>,
  },
})

const createClientMock = createClient as jest.MockedFunction<typeof createClient>
const revalidatePathMock = revalidatePath as jest.MockedFunction<typeof revalidatePath>
const captureExceptionMock = Sentry.captureException as jest.MockedFunction<
  typeof Sentry.captureException
>

// Type-safe references to mocked media functions (module is mocked above)
const mediaQueryModule = jest.requireMock('../../../../../packages/core/src/queries/media') as any
const moveAttachmentToGalleryMock =
  mediaQueryModule.moveAttachmentToGallery as jest.MockedFunction<any>
const removeFromGalleryMock = mediaQueryModule.removeFromGallery as jest.MockedFunction<any>

const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

describe('chat server actions', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('createMessage', () => {
    it('creates a message for an authenticated participant and revalidates chat', async () => {
      const mockSupabase = createMockSupabase()
      const mockUser = { id: 'user-1' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const participantSingle = jest
        .fn<() => Promise<any>>()
        .mockResolvedValue({ data: { id: 'participant-1' }, error: null })
      const participantEqUser = jest.fn<() => any>().mockReturnValue({ single: participantSingle })
      const participantEqTrip = jest.fn<() => any>().mockReturnValue({ eq: participantEqUser })
      const participantSelect = jest.fn<() => any>().mockReturnValue({ eq: participantEqTrip })

      const messageSingle = jest.fn<() => Promise<any>>().mockResolvedValue({
        data: { id: 'message-1', content: 'Hello', attachments: [] },
        error: null,
      })
      const messageSelect = jest.fn<() => any>().mockReturnValue({ single: messageSingle })
      const messageInsert = jest.fn<() => any>().mockReturnValue({ select: messageSelect })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'trip_participants') {
          return { select: participantSelect }
        }
        if (table === 'chat_messages') {
          return { insert: messageInsert }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await createMessage({
        tripId: 'trip-1',
        content: 'Hello',
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(expect.objectContaining({ id: 'message-1' }))
      expect(messageInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          trip_id: 'trip-1',
          user_id: mockUser.id,
          content: 'Hello',
        })
      )
      expect(revalidatePathMock).toHaveBeenCalledWith('/trips/trip-1/chat')
    })

    it('returns an authentication error when no user is present', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })
      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await createMessage({
        tripId: 'trip-1',
        content: 'Hello',
      })

      expect(result).toEqual({ success: false, error: 'Authentication required' })
      expect(revalidatePathMock).not.toHaveBeenCalled()
    })

    it('requires trip participation before sending a message', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const participantSingle = jest
        .fn<() => Promise<any>>()
        .mockResolvedValue({ data: null, error: { message: 'Missing' } })
      const participantEqUser = jest.fn<() => any>().mockReturnValue({ single: participantSingle })
      const participantEqTrip = jest.fn<() => any>().mockReturnValue({ eq: participantEqUser })
      const participantSelect = jest.fn<() => any>().mockReturnValue({ eq: participantEqTrip })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'trip_participants') {
          return { select: participantSelect }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await createMessage({ tripId: 'trip-1', content: 'Hello' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('You must be a trip participant to send messages')
      expect(revalidatePathMock).not.toHaveBeenCalled()
    })
  })

  describe('createBotMessage', () => {
    it('stores a bot message and triggers revalidation', async () => {
      const mockSupabase = createMockSupabase()
      const messageSingle = jest.fn<() => Promise<any>>().mockResolvedValue({
        data: { id: 'bot-message', message_type: 'bot' },
        error: null,
      })
      const messageSelect = jest.fn<() => any>().mockReturnValue({ single: messageSingle })
      const messageInsert = jest.fn<() => any>().mockReturnValue({ select: messageSelect })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'chat_messages') {
          return { insert: messageInsert }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await createBotMessage({ tripId: 'trip-1', content: 'AI reply' })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(expect.objectContaining({ id: 'bot-message' }))
      expect(revalidatePathMock).toHaveBeenCalledWith('/trips/trip-1/chat')
    })

    it('logs and reports insert errors', async () => {
      const mockSupabase = createMockSupabase()
      const insertError = { message: 'fail', code: '500', details: 'nope', hint: 'hint' }
      const messageSingle = jest
        .fn<() => Promise<any>>()
        .mockResolvedValue({ data: null, error: insertError })
      const messageSelect = jest.fn<() => any>().mockReturnValue({ single: messageSingle })
      const messageInsert = jest.fn<() => any>().mockReturnValue({ select: messageSelect })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'chat_messages') {
          return { insert: messageInsert }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await createBotMessage({ tripId: 'trip-1', content: 'AI reply' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to send bot message')
      expect(captureExceptionMock).toHaveBeenCalledWith(insertError, expect.any(Object))
      expect(revalidatePathMock).not.toHaveBeenCalled()
    })
  })

  describe('getChatMessages', () => {
    it('returns chat messages for an authenticated user', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const limit = jest.fn<() => Promise<any>>().mockResolvedValue({
        data: [
          {
            id: 'message-1',
            trip_id: 'trip-1',
            user_id: 'user-1',
          },
        ],
        error: null,
      })
      const order = jest.fn<() => any>().mockReturnValue({ limit })
      const eq = jest.fn<() => any>().mockReturnValue({ order })
      const select = jest.fn<() => any>().mockReturnValue({ eq })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'chat_messages') {
          return { select }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await getChatMessages('trip-1')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(limit).toHaveBeenCalledWith(50)
    })

    it('fails when authentication is missing', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'not auth' },
      })
      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await getChatMessages('trip-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication required')
      expect(result.data).toBeUndefined()
    })

    it('reports supabase errors', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const queryError = { message: 'broken', code: '500', details: 'details', hint: 'hint' }
      const limit = jest
        .fn<() => Promise<any>>()
        .mockResolvedValue({ data: null, error: queryError })
      const order = jest.fn<() => any>().mockReturnValue({ limit })
      const eq = jest.fn<() => any>().mockReturnValue({ order })
      const select = jest.fn<() => any>().mockReturnValue({ eq })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'chat_messages') {
          return { select }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await getChatMessages('trip-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch messages')
      expect(captureExceptionMock).toHaveBeenCalledWith(queryError, expect.any(Object))
    })
  })

  describe('uploadAttachment', () => {
    it('uploads a file and returns the public URL', async () => {
      const mockSupabase = createMockSupabase()
      const mockUser = { id: 'user-1' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const upload = jest.fn<() => Promise<any>>().mockResolvedValue({
        data: { path: 'trip-1/user-1/file.png' },
        error: null,
      })
      const getPublicUrl = jest
        .fn<() => any>()
        .mockReturnValue({ data: { publicUrl: 'https://example.com/file.png' } })
      const storageFrom = jest.fn<() => any>().mockReturnValue({ upload, getPublicUrl })
      mockSupabase.storage.from.mockImplementation(storageFrom)

      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const file = { name: 'file.png', size: 1234, type: 'image/png' } as unknown as File
      const result = await uploadAttachment('trip-1', file)

      expect(result.success).toBe(true)
      expect(result.url).toBe('https://example.com/file.png')
      expect(upload).toHaveBeenCalled()
    })

    it('handles upload failures and logs the error', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const uploadError = { message: 'upload failed' }
      const upload = jest
        .fn<() => Promise<any>>()
        .mockResolvedValue({ data: null, error: uploadError })
      const storageFrom = jest.fn<() => any>().mockReturnValue({ upload })
      mockSupabase.storage.from.mockImplementation(storageFrom)

      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const file = { name: 'file.png', size: 1234, type: 'image/png' } as unknown as File
      const result = await uploadAttachment('trip-1', file)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to upload attachment')
      expect(captureExceptionMock).toHaveBeenCalledWith(uploadError, expect.any(Object))
    })
  })

  describe('addReaction', () => {
    it('removes an existing reaction when toggled', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      // Mock the query chain: .select('id').eq('message_id').eq('user_id').eq('emoji').single()
      const single = jest
        .fn<() => Promise<any>>()
        .mockResolvedValue({ data: { id: 'reaction-1' }, error: null })
      const eqThird = jest.fn<() => any>().mockReturnValue({ single })
      const eqSecond = jest.fn<() => any>().mockReturnValue({ eq: eqThird })
      const eqFirst = jest.fn<() => any>().mockReturnValue({ eq: eqSecond })
      const select = jest.fn<() => any>().mockReturnValue({ eq: eqFirst })

      // Mock the delete query chain: .delete().eq('id')
      const deleteEq = jest.fn<() => Promise<any>>().mockResolvedValue({ error: null })
      const deleteFn = jest.fn<() => any>().mockReturnValue({ eq: deleteEq })

      const reactionTable = { select, delete: deleteFn }
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'message_reactions') {
          return reactionTable
        }
        throw new Error(`Unexpected table ${table}`)
      })

      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await addReaction('message-1', '👍')

      expect(result).toEqual({ success: true, action: 'removed' })
      expect(deleteEq).toHaveBeenCalledWith('id', 'reaction-1')
    })

    it('adds a new reaction when none exists', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      // Mock the query chain: .select('id').eq('message_id').eq('user_id').eq('emoji').single()
      const single = jest
        .fn<() => Promise<any>>()
        .mockResolvedValue({ data: null, error: { message: 'No row found' } })
      const eqThird = jest.fn<() => any>().mockReturnValue({ single })
      const eqSecond = jest.fn<() => any>().mockReturnValue({ eq: eqThird })
      const eqFirst = jest.fn<() => any>().mockReturnValue({ eq: eqSecond })
      const select = jest.fn<() => any>().mockReturnValue({ eq: eqFirst })

      const insert = jest.fn<() => Promise<any>>().mockResolvedValue({ error: null })

      const reactionTable = {
        select,
        insert,
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'message_reactions') {
          return reactionTable
        }
        throw new Error(`Unexpected table ${table}`)
      })

      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await addReaction('message-1', '🔥')

      expect(result).toEqual({ success: true, action: 'added' })
      expect(insert).toHaveBeenCalledWith({
        message_id: 'message-1',
        user_id: 'user-1',
        emoji: '🔥',
      })
    })
  })

  describe('getReactions', () => {
    it('groups reactions by emoji', async () => {
      const mockSupabase = createMockSupabase()

      const reactions = [
        { id: '1', emoji: '👍', user_id: 'user-1' },
        { id: '2', emoji: '🔥', user_id: 'user-2' },
        { id: '3', emoji: '👍', user_id: 'user-3' },
      ]
      const order = jest
        .fn<() => Promise<any>>()
        .mockResolvedValue({ data: reactions, error: null })
      const eq = jest.fn<() => any>().mockReturnValue({ order })
      const select = jest.fn<() => any>().mockReturnValue({ eq })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'message_reactions') {
          return { select }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await getReactions('message-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual([
        { emoji: '👍', count: 2, userIds: ['user-1', 'user-3'] },
        { emoji: '🔥', count: 1, userIds: ['user-2'] },
      ])
    })

    it('returns a failure payload when the query fails', async () => {
      const mockSupabase = createMockSupabase()
      const order = jest
        .fn<() => Promise<any>>()
        .mockResolvedValue({ data: null, error: { message: 'fail' } })
      const eq = jest.fn<() => any>().mockReturnValue({ order })
      const select = jest.fn<() => any>().mockReturnValue({ eq })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'message_reactions') {
          return { select }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await getReactions('message-1')

      expect(result).toEqual({ success: false, error: 'Failed to fetch reactions', data: [] })
      expect(captureExceptionMock).not.toHaveBeenCalled()
    })

    it('captures unexpected errors', async () => {
      const mockSupabase = createMockSupabase()
      const error = new Error('boom')
      const order = jest.fn<() => Promise<any>>().mockImplementation(() => {
        throw error
      })
      const eq = jest.fn<() => any>().mockReturnValue({ order })
      const select = jest.fn<() => any>().mockReturnValue({ eq })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'message_reactions') {
          return { select }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await getReactions('message-1')

      expect(result).toEqual({ success: false, error: 'An unexpected error occurred', data: [] })
      expect(captureExceptionMock).toHaveBeenCalledWith(error, expect.any(Object))
    })
  })

  describe('addAttachmentToGallery', () => {
    it('moves an attachment into the gallery when the user is a participant', async () => {
      const mockSupabase = createMockSupabase()
      const mockUser = { id: 'user-1' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const participantSingle = jest
        .fn<() => Promise<any>>()
        .mockResolvedValue({ data: { id: 'participant-1' }, error: null })
      const participantEqUser = jest.fn<() => any>().mockReturnValue({ single: participantSingle })
      const participantEqTrip = jest.fn<() => any>().mockReturnValue({ eq: participantEqUser })
      const participantSelect = jest.fn<() => any>().mockReturnValue({ eq: participantEqTrip })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'trip_participants') {
          return { select: participantSelect }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      moveAttachmentToGalleryMock.mockResolvedValue({ success: true, mediaFileId: 'media-1' })
      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await addAttachmentToGallery(
        'https://example.com/file.png',
        'trip-1',
        'Caption'
      )

      expect(result).toEqual({ success: true, mediaFileId: 'media-1' })
      expect(moveAttachmentToGalleryMock).toHaveBeenCalledWith(
        mockSupabase,
        'https://example.com/file.png',
        'trip-1',
        'user-1',
        'Caption'
      )
      expect(revalidatePathMock).toHaveBeenCalledWith('/trips/trip-1/chat')
      expect(revalidatePathMock).toHaveBeenCalledWith('/trips/trip-1')
    })

    it('rejects non-participants', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const participantSingle = jest
        .fn<() => Promise<any>>()
        .mockResolvedValue({ data: null, error: { message: 'nope' } })
      const participantEqUser = jest.fn<() => any>().mockReturnValue({ single: participantSingle })
      const participantEqTrip = jest.fn<() => any>().mockReturnValue({ eq: participantEqUser })
      const participantSelect = jest.fn<() => any>().mockReturnValue({ eq: participantEqTrip })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'trip_participants') {
          return { select: participantSelect }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await addAttachmentToGallery('https://example.com/file.png', 'trip-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('You must be a trip participant to add photos to gallery')
      expect(moveAttachmentToGalleryMock).not.toHaveBeenCalled()
    })

    it('returns an error when moving to gallery fails', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const participantSingle = jest
        .fn<() => Promise<any>>()
        .mockResolvedValue({ data: { id: 'participant-1' }, error: null })
      const participantEqUser = jest.fn<() => any>().mockReturnValue({ single: participantSingle })
      const participantEqTrip = jest.fn<() => any>().mockReturnValue({ eq: participantEqUser })
      const participantSelect = jest.fn<() => any>().mockReturnValue({ eq: participantEqTrip })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'trip_participants') {
          return { select: participantSelect }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      moveAttachmentToGalleryMock.mockResolvedValue({ success: false, error: 'storage failed' })
      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await addAttachmentToGallery('https://example.com/file.png', 'trip-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('storage failed')
      expect(captureExceptionMock).toHaveBeenCalledWith(expect.any(Error), expect.any(Object))
      expect(revalidatePathMock).not.toHaveBeenCalled()
    })
  })

  describe('removeAttachmentFromGallery', () => {
    it('removes an attachment and revalidates pages', async () => {
      const mockSupabase = createMockSupabase()
      const mockUser = { id: 'user-1' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const participantSingle = jest
        .fn<() => Promise<any>>()
        .mockResolvedValue({ data: { id: 'participant-1' }, error: null })
      const participantEqUser = jest.fn<() => any>().mockReturnValue({ single: participantSingle })
      const participantEqTrip = jest.fn<() => any>().mockReturnValue({ eq: participantEqUser })
      const participantSelect = jest.fn<() => any>().mockReturnValue({ eq: participantEqTrip })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'trip_participants') {
          return { select: participantSelect }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      removeFromGalleryMock.mockResolvedValue({ success: true })
      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await removeAttachmentFromGallery('media-1', 'trip-1')

      expect(result).toEqual({ success: true })
      expect(removeFromGalleryMock).toHaveBeenCalledWith(mockSupabase, 'media-1')
      expect(revalidatePathMock).toHaveBeenCalledWith('/trips/trip-1/chat')
      expect(revalidatePathMock).toHaveBeenCalledWith('/trips/trip-1')
    })

    it('returns an error when the removal fails', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const participantSingle = jest
        .fn<() => Promise<any>>()
        .mockResolvedValue({ data: { id: 'participant-1' }, error: null })
      const participantEqUser = jest.fn<() => any>().mockReturnValue({ single: participantSingle })
      const participantEqTrip = jest.fn<() => any>().mockReturnValue({ eq: participantEqUser })
      const participantSelect = jest.fn<() => any>().mockReturnValue({ eq: participantEqTrip })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'trip_participants') {
          return { select: participantSelect }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      removeFromGalleryMock.mockResolvedValue({ success: false, error: 'not found' })
      createClientMock.mockResolvedValue(mockSupabase as unknown as any)

      const result = await removeAttachmentFromGallery('media-1', 'trip-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('not found')
      expect(captureExceptionMock).toHaveBeenCalledWith(expect.any(Error), expect.any(Object))
      expect(revalidatePathMock).not.toHaveBeenCalled()
    })
  })
})
