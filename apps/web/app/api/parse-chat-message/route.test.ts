/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'

const createMock = jest.fn<
  Promise<unknown>,
  [parameters: Record<string, unknown>, requestOptions?: { signal?: AbortSignal }]
>()

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      chat: {
        completions: {
          create: createMock,
        },
      },
    })),
  }
})

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
    },
  })),
}))

const buildRequest = (payload: string | object) => {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const request = new Request('http://localhost/api/parse-chat-message', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body,
  })

  return new NextRequest(request)
}

const expectBaseFailureShape = (
  json: Record<string, unknown>,
  overrides: Partial<Record<string, unknown>> = {}
) => {
  expect(json).toMatchObject({
    success: false,
    hasExpense: false,
    hasItinerary: false,
    model: 'gpt-4o-mini',
    ...overrides,
  })
  expect(typeof json.latencyMs).toBe('number')
}

describe('POST /api/parse-chat-message', () => {
  let postHandler: typeof import('./route').POST

  beforeEach(async () => {
    jest.clearAllMocks()
    jest.resetModules()
    process.env.OPENAI_API_KEY = 'test-key'
    ;({ POST: postHandler } = await import('./route'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns structured success response when OpenAI succeeds', async () => {
    const rawOutput = JSON.stringify({
      hasExpense: true,
      hasItinerary: false,
      expense: {
        amount: 6000,
        currency: 'EUR',
        description: 'Dinner in Paris',
      },
      itinerary: null,
    })

    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: rawOutput,
          },
        },
      ],
    })

    const request = buildRequest({
      message: 'Dinner €60 split 4 ways',
      tripId: 'trip-123',
      defaultCurrency: 'EUR',
      referenceDate: '2024-01-01T00:00:00.000Z',
    })

    const response = await postHandler(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      success: true,
      hasExpense: true,
      hasItinerary: false,
      model: 'gpt-4o-mini',
      rawOutput,
    })
    expect(json.latencyMs).toBeGreaterThanOrEqual(0)
    expect(json.expense).toMatchObject({
      amount: 6000,
      currency: 'EUR',
      description: 'Dinner in Paris',
    })
    expect(json).not.toHaveProperty('error')
  })

  it('returns 400 when required fields are missing', async () => {
    const request = buildRequest({ message: '' })

    const response = await postHandler(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expectBaseFailureShape(json, {
      error: 'Missing required fields: message, tripId',
      errorType: 'internal_error',
    })
  })

  it('handles invalid JSON payloads gracefully', async () => {
    const request = buildRequest('{ invalid json ')

    const response = await postHandler(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expectBaseFailureShape(json, {
      errorType: 'internal_error',
    })
    expect(typeof json.error === 'string').toBe(true)
  })

  it('surfaces timeout errors as 408 responses', async () => {
    jest.useFakeTimers({ advanceTimers: true })

    createMock.mockImplementationOnce((_, options) => {
      return new Promise((_, reject) => {
        options?.signal?.addEventListener('abort', () => {
          const error = new Error('aborted') as Error & { name: string }
          error.name = 'AbortError'
          reject(error)
        })
      })
    })

    const request = buildRequest({
      message: 'Will timeout',
      tripId: 'trip-123',
    })

    const responsePromise = postHandler(request)

    await jest.runOnlyPendingTimersAsync()

    const response = await responsePromise
    const json = await response.json()

    expect(response.status).toBe(408)
    expectBaseFailureShape(json, {
      error: 'Request timed out after 30000ms',
      errorType: 'timeout',
      latencyMs: 30000,
    })
  })

  it('maps OpenAI 401 errors to invalid API key responses', async () => {
    createMock.mockRejectedValueOnce({
      status: 401,
    })

    const request = buildRequest({
      message: 'Check key',
      tripId: 'trip-123',
    })

    const response = await postHandler(request)
    const json = await response.json()

    expect(response.status).toBe(401)
    expectBaseFailureShape(json, {
      error: 'Invalid OpenAI API key',
      errorType: 'internal_error',
    })
  })

  it('maps OpenAI 429 errors to rate limit responses', async () => {
    createMock.mockRejectedValueOnce({
      status: 429,
    })

    const request = buildRequest({
      message: 'Too many requests',
      tripId: 'trip-123',
    })

    const response = await postHandler(request)
    const json = await response.json()

    expect(response.status).toBe(429)
    expectBaseFailureShape(json, {
      error: 'OpenAI rate limit exceeded',
      errorType: 'internal_error',
    })
  })
})
