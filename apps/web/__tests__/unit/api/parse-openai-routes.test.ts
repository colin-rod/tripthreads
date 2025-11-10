import { NextRequest } from 'next/server'

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const ORIGINAL_OPENAI_KEY = process.env.OPENAI_API_KEY
process.env.OPENAI_API_KEY = 'test-key'

import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { POST as parseWithOpenAI } from '@/app/api/parse-with-openai/route'
import { POST as parseChatMessage } from '@/app/api/parse-chat-message/route'

const createClientMock = createClient as jest.MockedFunction<typeof createClient>
const openAIConstructor = OpenAI as unknown as jest.Mock
const createChatCompletionMock = jest.fn()

afterAll(() => {
  process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_KEY
})

beforeEach(() => {
  jest.clearAllMocks()
  createChatCompletionMock.mockReset()
  openAIConstructor.mockImplementation(() => ({
    chat: {
      completions: {
        create: createChatCompletionMock,
      },
    },
  }))
})

type SupabaseUser = { id: string }

type SupabaseMockOptions = {
  user: SupabaseUser | null
  authError?: Error | null
  participant?: { id: string } | null
  participantError?: Error | null
}

function buildSupabaseClientMock({
  user,
  authError = null,
  participant = { id: 'participant-1' },
  participantError = null,
}: SupabaseMockOptions) {
  const maybeSingle = jest
    .fn()
    .mockResolvedValue({ data: participant ?? null, error: participantError })
  const eqUser = jest.fn().mockReturnValue({ maybeSingle })
  const eqTrip = jest.fn().mockReturnValue({ eq: eqUser })
  const select = jest.fn().mockReturnValue({ eq: eqTrip })
  const from = jest.fn().mockReturnValue({ select })

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: user ?? null },
        error: authError,
      }),
    },
    from,
  }
}

function createPostRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  })
}

describe('parse-with-openai route', () => {
  it('returns 401 when the user is not authenticated', async () => {
    const supabaseMock = buildSupabaseClientMock({ user: null })
    createClientMock.mockResolvedValueOnce(supabaseMock as any)

    const request = createPostRequest('http://localhost/api/parse-with-openai', {
      input: '2024-01-01',
      parserType: 'date',
    })

    const response = await parseWithOpenAI(request)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Authentication required' })
    expect(openAIConstructor).not.toHaveBeenCalled()
  })

  it('returns 403 when the user is not a trip participant', async () => {
    const supabaseMock = buildSupabaseClientMock({ user: { id: 'user-1' }, participant: null })
    createClientMock.mockResolvedValueOnce(supabaseMock as any)

    const request = createPostRequest('http://localhost/api/parse-with-openai', {
      input: '2024-01-01',
      parserType: 'date',
      tripId: 'trip-1',
    })

    const response = await parseWithOpenAI(request)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'You are not a participant in this trip' })
    expect(openAIConstructor).not.toHaveBeenCalled()
  })

  it('parses successfully for authenticated trip participants', async () => {
    const supabaseMock = buildSupabaseClientMock({ user: { id: 'user-1' } })
    createClientMock.mockResolvedValueOnce(supabaseMock as any)

    createChatCompletionMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({ date: '2024-01-01T00:00:00.000Z' }),
          },
        },
      ],
      usage: { total_tokens: 12 },
    })

    const request = createPostRequest('http://localhost/api/parse-with-openai', {
      input: 'January 1, 2024',
      parserType: 'date',
      tripId: 'trip-1',
    })

    const response = await parseWithOpenAI(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true, model: expect.any(String) })
    expect(openAIConstructor).toHaveBeenCalledTimes(1)
    expect(createChatCompletionMock).toHaveBeenCalledTimes(1)
  })
})

describe('parse-chat-message route', () => {
  it('returns 401 when the user is not authenticated', async () => {
    const supabaseMock = buildSupabaseClientMock({ user: null })
    createClientMock.mockResolvedValueOnce(supabaseMock as any)

    const request = createPostRequest('http://localhost/api/parse-chat-message', {
      message: 'Split dinner',
      tripId: 'trip-1',
    })

    const response = await parseChatMessage(request)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Authentication required' })
    expect(openAIConstructor).not.toHaveBeenCalled()
  })

  it('parses chat messages for authenticated trip participants', async () => {
    const supabaseMock = buildSupabaseClientMock({ user: { id: 'user-1' } })
    createClientMock.mockResolvedValueOnce(supabaseMock as any)

    createChatCompletionMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              success: true,
              hasExpense: true,
              hasItinerary: false,
              expense: { amount: 1000, currency: 'USD', description: 'Dinner' },
              hasNotes: false,
            }),
          },
        },
      ],
      usage: { total_tokens: 8 },
    })

    const request = createPostRequest('http://localhost/api/parse-chat-message', {
      message: 'Dinner $10 for everyone',
      tripId: 'trip-1',
    })

    const response = await parseChatMessage(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.hasExpense).toBe(true)
    expect(openAIConstructor).toHaveBeenCalledTimes(1)
    expect(createChatCompletionMock).toHaveBeenCalledTimes(1)
  })
})
