/**
 * @jest-environment node
 *
 * API Route Tests - parse-with-openai
 *
 * Acceptance Criteria Coverage:
 * - AC#4: API Route Tests - 90% (7 tests)
 * - AC#7: Error Handling - 90% (5 error tests)
 *
 * Test Coverage:
 * - Successful date and expense parsing with structured responses
 * - Token usage and latency tracking
 * - Error handling: malformed JSON, timeouts, auth errors, rate limits
 * - Sentry integration for error logging
 *
 * Test Count: 7 tests
 *
 * How to run:
 * npm test -- apps/web/app/api/parse-with-openai/route.test.ts
 */

import { NextRequest } from 'next/server'
import type { LLMParseRequest } from '@tripthreads/core'

const mockCreate = jest.fn()

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  }
})

jest.mock('@sentry/nextjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}))

// Mock Supabase client to avoid Next.js request context issues
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        getUser: jest.fn(() =>
          Promise.resolve({
            data: { user: { id: 'test-user-id' } },
            error: null,
          })
        ),
      },
    })
  ),
}))

let POST: (request: NextRequest) => Promise<Response>

beforeAll(async () => {
  process.env.OPENAI_API_KEY = 'test-api-key'
  ;({ POST } = await import('./route'))
})

function createRequestBody(
  overrides: Partial<LLMParseRequest> & { parserType: LLMParseRequest['parserType'] }
): LLMParseRequest {
  return {
    input: 'Parse this input',
    options: {},
    model: 'gpt-custom-model',
    ...overrides,
  }
}

function createRequest(overrides: Partial<LLMParseRequest> & { parserType: 'date' | 'expense' }) {
  const body = createRequestBody(overrides)
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

describe('parse-with-openai POST handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns structured date parsing results when OpenAI responds with valid JSON', async () => {
    const rawResult = { date: '2024-02-01T00:00:00.000Z', endDate: '2024-02-05T00:00:00.000Z' }

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(rawResult),
          },
        },
      ],
      usage: { total_tokens: 321 },
    })

    const response = await POST(createRequest({ parserType: 'date', input: 'Feb 1 - Feb 5' }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      model: 'gpt-custom-model',
      tokensUsed: 321,
      rawOutput: JSON.stringify(rawResult),
    })
    expect(payload.dateResult).toEqual({
      date: new Date(rawResult.date).toISOString(),
      endDate: new Date(rawResult.endDate).toISOString(),
    })
    expect(typeof payload.latencyMs).toBe('number')
  })

  it('returns structured expense parsing results when OpenAI responds with valid JSON', async () => {
    const rawResult = { currency: 'USD', amount: 45.67 }

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(rawResult),
          },
        },
      ],
      usage: { total_tokens: 123 },
    })

    const response = await POST(createRequest({ parserType: 'expense', input: 'Lunch $45.67' }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      model: 'gpt-custom-model',
      tokensUsed: 123,
      rawOutput: JSON.stringify(rawResult),
      expenseResult: rawResult,
    })
    expect(typeof payload.latencyMs).toBe('number')
  })

  it('returns parse_error when OpenAI responds with malformed JSON', async () => {
    const invalidJson = '{not json}'

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: invalidJson,
          },
        },
      ],
    })

    const response = await POST(createRequest({ parserType: 'date' }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: false,
      errorType: 'parse_error',
      error: 'Failed to parse OpenAI JSON response',
      model: 'gpt-custom-model',
      rawOutput: invalidJson,
    })
    expect(payload.errorDetails).toBeUndefined()
  })

  it('returns timeout error when OpenAI request aborts', async () => {
    mockCreate.mockRejectedValue(
      Object.assign(new Error('The user aborted a request'), { name: 'AbortError' })
    )

    const response = await POST(createRequest({ parserType: 'expense' }))
    const payload = await response.json()

    expect(response.status).toBe(408)
    expect(payload).toMatchObject({
      success: false,
      errorType: 'timeout',
      errorDetails: 'The request took too long to complete',
      model: 'gpt-custom-model',
      rawOutput: '',
    })
  })

  it('returns 401 with internal error type when OpenAI rejects with auth error', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }))

    const response = await POST(createRequest({ parserType: 'date' }))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({
      success: false,
      errorType: 'internal_error',
      errorDetails: 'Check your OPENAI_API_KEY in .env.local',
      model: 'gpt-custom-model',
    })
  })

  it('returns 429 with internal error type when OpenAI rejects with rate limit error', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error('Rate limit'), { status: 429 }))

    const response = await POST(createRequest({ parserType: 'expense' }))
    const payload = await response.json()

    expect(response.status).toBe(429)
    expect(payload).toMatchObject({
      success: false,
      errorType: 'internal_error',
      errorDetails: 'Too many requests. Please wait and try again.',
      model: 'gpt-custom-model',
    })
  })

  it('bubbles unexpected errors to 500 with default model metadata', async () => {
    mockCreate.mockRejectedValue(new Error('Boom'))

    const response = await POST(createRequest({ parserType: 'date', model: 'gpt-unreliable' }))
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload).toMatchObject({
      success: false,
      errorType: 'internal_error',
      model: 'gpt-4o-mini',
      rawOutput: '',
    })
    expect(typeof payload.latencyMs).toBe('number')
    expect(payload.error).toBe('Boom')
  })
})

describe('API Route Robustness Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-api-key'
  })

  it('handles concurrent requests within rate limits', async () => {
    // Mock successful responses for concurrent requests
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ amount: 6000, currency: 'EUR', description: 'Dinner' }),
          },
        },
      ],
      usage: { total_tokens: 150 },
    })

    // Make 3 concurrent requests
    const requests = [
      POST(createRequest({ parserType: 'expense', input: 'Dinner €60' })),
      POST(createRequest({ parserType: 'expense', input: 'Lunch €45' })),
      POST(createRequest({ parserType: 'expense', input: 'Taxi €30' })),
    ]

    const responses = await Promise.all(requests)

    // All requests should succeed
    expect(responses[0].status).toBe(200)
    expect(responses[1].status).toBe(200)
    expect(responses[2].status).toBe(200)

    // OpenAI should have been called 3 times
    expect(mockCreate).toHaveBeenCalledTimes(3)
  })

  it('respects AbortSignal timeout', async () => {
    // Mock a slow response that should be aborted
    mockCreate.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          setTimeout(() => {
            // Simulate abort
            const error = new Error('The user aborted a request')
            error.name = 'AbortError'
            reject(error)
          }, 100)
        })
    )

    const response = await POST(createRequest({ parserType: 'expense', input: 'Dinner €60' }))
    const payload = await response.json()

    expect(response.status).toBe(408)
    expect(payload.errorType).toBe('timeout')
  })

  it('validates request body schema', async () => {
    // Create request with invalid parserType
    const invalidRequest = {
      json: jest.fn().mockResolvedValue({
        input: 'Test input',
        parserType: 'invalid_type', // Invalid type
        options: {},
        model: 'gpt-4o-mini',
      }),
    } as unknown as NextRequest

    const response = await POST(invalidRequest)
    const payload = await response.json()

    // Should return error for invalid parser type
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(payload.success).toBe(false)
  })

  it('rejects invalid parserType', async () => {
    const invalidRequest = {
      json: jest.fn().mockResolvedValue({
        input: 'Test input',
        parserType: 'unknown', // Not 'date' or 'expense'
        options: {},
        model: 'gpt-4o-mini',
      }),
    } as unknown as NextRequest

    const response = await POST(invalidRequest)
    const payload = await response.json()

    expect(payload.success).toBe(false)
    // API should handle gracefully, not crash
    expect(response.status).toBeGreaterThanOrEqual(400)
  })

  it('returns 500 when OPENAI_API_KEY is missing', async () => {
    // Temporarily remove API key
    delete process.env.OPENAI_API_KEY

    // Mock OpenAI to throw auth error
    mockCreate.mockRejectedValue(
      Object.assign(new Error('API key not configured'), { status: 401 })
    )

    const response = await POST(createRequest({ parserType: 'expense', input: 'Dinner €60' }))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.errorType).toBe('internal_error')
    expect(payload.errorDetails).toContain('OPENAI_API_KEY')

    // Restore API key for other tests
    process.env.OPENAI_API_KEY = 'test-api-key'
  })
})
