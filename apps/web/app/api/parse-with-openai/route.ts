import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  getDateParserPrompt,
  getExpenseParserPrompt,
  SYSTEM_PROMPT,
  type LLMParseRequest,
  type LLMParserResult,
} from '@tripthreads/shared'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const DEFAULT_MODEL = 'gpt-4o-mini'
const TIMEOUT_MS = 30000 // 30 seconds

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now()
  console.log('[OpenAI API] Request received')
  console.log('[OpenAI API] API Key exists:', !!OPENAI_API_KEY)
  console.log('[OpenAI API] API Key length:', OPENAI_API_KEY?.length || 0)

  try {
    // Check for API key
    if (!OPENAI_API_KEY) {
      console.log('[OpenAI API] ERROR: No API key found')
      return NextResponse.json<LLMParserResult>(
        {
          success: false,
          error: 'OpenAI API key not configured',
          errorType: 'internal_error',
          errorDetails: 'Add OPENAI_API_KEY to your .env.local file',
          model: DEFAULT_MODEL,
          latencyMs: 0,
          rawOutput: '',
        },
        { status: 500 }
      )
    }

    const body: LLMParseRequest = await request.json()
    const { input, parserType, options = {}, model = DEFAULT_MODEL } = body

    console.log('[OpenAI API] Request parsed:', { input, parserType, model })

    if (!input || !parserType) {
      return NextResponse.json<LLMParserResult>(
        {
          success: false,
          error: 'Missing required fields: input, parserType',
          errorType: 'internal_error',
          model: DEFAULT_MODEL,
          latencyMs: 0,
          rawOutput: '',
        },
        { status: 400 }
      )
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    })

    // Build prompt based on parser type
    const referenceDate = (options as any).referenceDate || new Date().toISOString()
    const defaultCurrency = (options as any).defaultCurrency || 'USD'

    console.log('[OpenAI API] Building prompt...')
    const prompt =
      parserType === 'date'
        ? getDateParserPrompt(input, referenceDate)
        : getExpenseParserPrompt(input, defaultCurrency)

    console.log('[OpenAI API] Prompt built, length:', prompt.length)
    console.log('[OpenAI API] Calling OpenAI with model:', model)

    // Call OpenAI with timeout
    const startTime = Date.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    console.log('[OpenAI API] Sending request to OpenAI...')

    try {
      const response = await openai.chat.completions.create(
        {
          model,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1, // Low temperature for consistent structured output
        },
        {
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)
      console.log('[OpenAI API] Received response from OpenAI')

      const latencyMs = Date.now() - startTime
      const rawOutput = response.choices[0]?.message?.content || ''
      const tokensUsed = response.usage?.total_tokens

      console.log('[OpenAI API] Response received, latency:', latencyMs, 'ms, tokens:', tokensUsed)

      // Parse OpenAI response
      console.log('[OpenAI API] Parsing JSON response...')
      let parsedResult
      try {
        parsedResult = JSON.parse(rawOutput)
        console.log('[OpenAI API] JSON parsed successfully')
      } catch {
        console.log('[OpenAI API] Failed to parse JSON:', rawOutput)
        return NextResponse.json<LLMParserResult>({
          success: false,
          error: 'Failed to parse OpenAI JSON response',
          errorType: 'parse_error',
          model,
          latencyMs,
          rawOutput,
        })
      }

      // Convert date strings back to Date objects for date parser
      if (parserType === 'date' && parsedResult.date) {
        parsedResult.date = new Date(parsedResult.date)
        if (parsedResult.endDate) {
          parsedResult.endDate = new Date(parsedResult.endDate)
        }
      }

      // Return structured result
      const result: LLMParserResult = {
        success: true,
        ...(parserType === 'date' ? { dateResult: parsedResult } : { expenseResult: parsedResult }),
        model,
        latencyMs,
        tokensUsed,
        rawOutput,
      }

      console.log(
        '[OpenAI API] Returning success response, total time:',
        Date.now() - requestStartTime,
        'ms'
      )
      return NextResponse.json(result)
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      console.log('[OpenAI API] Fetch error:', fetchError.name, fetchError.message)

      if (fetchError.name === 'AbortError') {
        console.log('[OpenAI API] Request timed out after', TIMEOUT_MS, 'ms')
        return NextResponse.json<LLMParserResult>(
          {
            success: false,
            error: `Request timed out after ${TIMEOUT_MS}ms`,
            errorType: 'timeout',
            errorDetails: 'The request took too long to complete',
            model,
            latencyMs: TIMEOUT_MS,
            rawOutput: '',
          },
          { status: 408 }
        )
      }

      // OpenAI API error
      if (fetchError.status === 401) {
        return NextResponse.json<LLMParserResult>(
          {
            success: false,
            error: 'Invalid OpenAI API key',
            errorType: 'internal_error',
            errorDetails: 'Check your OPENAI_API_KEY in .env.local',
            model,
            latencyMs: Date.now() - startTime,
            rawOutput: '',
          },
          { status: 401 }
        )
      }

      if (fetchError.status === 429) {
        return NextResponse.json<LLMParserResult>(
          {
            success: false,
            error: 'OpenAI rate limit exceeded',
            errorType: 'internal_error',
            errorDetails: 'Too many requests. Please wait and try again.',
            model,
            latencyMs: Date.now() - startTime,
            rawOutput: '',
          },
          { status: 429 }
        )
      }

      throw fetchError
    }
  } catch (error: any) {
    console.error('[OpenAI API] Unhandled error:', error)
    return NextResponse.json<LLMParserResult>(
      {
        success: false,
        error: error.message || 'Unknown error',
        errorType: 'internal_error',
        model: DEFAULT_MODEL,
        latencyMs: Date.now() - requestStartTime,
        rawOutput: '',
      },
      { status: 500 }
    )
  }
}
