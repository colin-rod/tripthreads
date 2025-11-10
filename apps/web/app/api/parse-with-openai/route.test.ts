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
