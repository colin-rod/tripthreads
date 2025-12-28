import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT, type ItineraryItemMetadata } from '@tripthreads/core'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const DEFAULT_MODEL = 'gpt-4o-mini'
const TIMEOUT_MS = 30000 // 30 seconds

interface ParseChatMessageRequest {
  message: string
  tripId: string
  defaultCurrency?: string
  referenceDate?: string
}

interface ParsedExpense {
  amount: number
  currency: string
  description: string
  category?: string
  payer?: string
  splitType?: 'equal' | 'custom' | 'percentage'
  splitCount?: number
  participants?: string[]
  date?: string
}

interface ParsedItinerary {
  type: 'flight' | 'stay' | 'activity'
  title: string
  description?: string
  startDate: string
  endDate?: string
  location?: string
  links?: Array<{ title: string; url: string }>
  isAllDay?: boolean
  metadata?: ItineraryItemMetadata
}

interface ParseChatMessageResponse {
  success: boolean
  hasExpense: boolean
  hasItinerary: boolean
  expense?: ParsedExpense
  itinerary?: ParsedItinerary
  error?: string
  errorType?: string
  latencyMs: number
  model: string
  rawOutput?: string
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now()

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check for API key
    if (!OPENAI_API_KEY) {
      return NextResponse.json<ParseChatMessageResponse>(
        {
          success: false,
          hasExpense: false,
          hasItinerary: false,
          error: 'OpenAI API key not configured',
          errorType: 'internal_error',
          model: DEFAULT_MODEL,
          latencyMs: 0,
        },
        { status: 500 }
      )
    }

    const body: ParseChatMessageRequest = await request.json()
    const {
      message,
      tripId,
      defaultCurrency = 'USD',
      referenceDate = new Date().toISOString(),
    } = body

    if (!message || !tripId) {
      return NextResponse.json<ParseChatMessageResponse>(
        {
          success: false,
          hasExpense: false,
          hasItinerary: false,
          error: 'Missing required fields: message, tripId',
          errorType: 'internal_error',
          model: DEFAULT_MODEL,
          latencyMs: 0,
        },
        { status: 400 }
      )
    }

    const { data: participant, error: participantError } = await supabase
      .from('trip_participants')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (participantError) {
      console.error('[Parse Chat] Error verifying trip participant:', participantError)
      return NextResponse.json<ParseChatMessageResponse>(
        {
          success: false,
          hasExpense: false,
          hasItinerary: false,
          error: 'Unable to verify trip membership',
          errorType: 'internal_error',
          model: DEFAULT_MODEL,
          latencyMs: 0,
        },
        { status: 500 }
      )
    }

    if (!participant) {
      return NextResponse.json({ error: 'You are not a participant in this trip' }, { status: 403 })
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    })

    // Build unified prompt for dual parsing (expense + itinerary)
    const prompt = `
You are TripThread, an AI assistant that helps users manage trip expenses and itineraries.

Analyze the following message and determine if it contains:
1. An expense (money spent)
2. An itinerary item (scheduled activity, flight, hotel, etc.)
3. Both (e.g., "Hotel Marriott €200 check-in Dec 15 3pm")

Message: "${message}"

Reference date: ${referenceDate}
Default currency: ${defaultCurrency}

Parse the message and return a JSON object with this structure:
{
  "hasExpense": boolean,
  "hasItinerary": boolean,
  "expense": {
    "amount": number (in minor units, e.g., cents),
    "currency": "ISO 4217 code",
    "description": "brief description",
    "category": "food" | "transport" | "accommodation" | "activity" | "other" | null,
    "payer": "name of payer if mentioned" | null,
    "splitType": "equal" | "custom" | "percentage" | "none",
    "splitCount": number | null,
    "participants": ["participant names"] | null,
    "date": "ISO 8601 date" | null
  } | null,
  "itinerary": {
    "type": "flight" | "stay" | "activity",
    "title": "short title",
    "description": "optional description" | null,
    "startDate": "ISO 8601 datetime",
    "endDate": "ISO 8601 datetime" | null,
    "location": "location if mentioned" | null,
    "links": [{"title": "link title", "url": "https://..."}] | null,
    "isAllDay": boolean | null,
    "metadata": {} | null
  } | null
}

Examples:

1. Expense only:
   Input: "Dinner €60 split 4 ways"
   Output: {"hasExpense": true, "hasItinerary": false, "expense": {...}, "itinerary": null}

2. Itinerary only:
   Input: "Museum visit tomorrow 2pm"
   Output: {"hasExpense": false, "hasItinerary": true, "expense": null, "itinerary": {...}}

3. Both:
   Input: "Hotel Marriott €200 check-in Dec 15 3pm"
   Output: {"hasExpense": true, "hasItinerary": true, "expense": {...}, "itinerary": {...}}

4. Neither (general chat):
   Input: "What's the plan for dinner?"
   Output: {"hasExpense": false, "hasItinerary": false, "expense": null, "itinerary": null}

Return ONLY valid JSON, no additional text.
`.trim()

    // Call OpenAI with timeout
    const startTime = Date.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await openai.chat.completions.create(
        {
          model: DEFAULT_MODEL,
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
          temperature: 0.1,
        },
        {
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      const latencyMs = Date.now() - startTime
      const rawOutput = response.choices[0]?.message?.content || ''

      // Parse OpenAI response
      let parsedResult
      try {
        parsedResult = JSON.parse(rawOutput)
      } catch {
        return NextResponse.json<ParseChatMessageResponse>({
          success: false,
          hasExpense: false,
          hasItinerary: false,
          error: 'Failed to parse OpenAI JSON response',
          errorType: 'parse_error',
          model: DEFAULT_MODEL,
          latencyMs,
          rawOutput,
        })
      }

      // Convert date strings to proper format if needed
      if (parsedResult.itinerary?.startDate) {
        parsedResult.itinerary.startDate = new Date(parsedResult.itinerary.startDate).toISOString()
        if (parsedResult.itinerary.endDate) {
          parsedResult.itinerary.endDate = new Date(parsedResult.itinerary.endDate).toISOString()
        }
      }

      if (parsedResult.expense?.date) {
        parsedResult.expense.date = new Date(parsedResult.expense.date).toISOString()
      }

      // Return structured result
      const result: ParseChatMessageResponse = {
        success: true,
        hasExpense: parsedResult.hasExpense || false,
        hasItinerary: parsedResult.hasItinerary || false,
        expense: parsedResult.expense,
        itinerary: parsedResult.itinerary,
        model: DEFAULT_MODEL,
        latencyMs,
        rawOutput,
      }

      return NextResponse.json(result)
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId)
      const error = fetchError as Error & { name?: string }

      if (error.name === 'AbortError') {
        return NextResponse.json<ParseChatMessageResponse>(
          {
            success: false,
            hasExpense: false,
            hasItinerary: false,
            error: `Request timed out after ${TIMEOUT_MS}ms`,
            errorType: 'timeout',
            model: DEFAULT_MODEL,
            latencyMs: TIMEOUT_MS,
          },
          { status: 408 }
        )
      }

      // OpenAI API error
      if ('status' in error) {
        if (error.status === 401) {
          return NextResponse.json<ParseChatMessageResponse>(
            {
              success: false,
              hasExpense: false,
              hasItinerary: false,
              error: 'Invalid OpenAI API key',
              errorType: 'internal_error',
              model: DEFAULT_MODEL,
              latencyMs: Date.now() - startTime,
            },
            { status: 401 }
          )
        }

        if (error.status === 429) {
          return NextResponse.json<ParseChatMessageResponse>(
            {
              success: false,
              hasExpense: false,
              hasItinerary: false,
              error: 'OpenAI rate limit exceeded',
              errorType: 'internal_error',
              model: DEFAULT_MODEL,
              latencyMs: Date.now() - startTime,
            },
            { status: 429 }
          )
        }
      }

      throw error
    }
  } catch (outerError: unknown) {
    const error = outerError as Error
    console.error('[Parse Chat Message] Unhandled error:', error)
    return NextResponse.json<ParseChatMessageResponse>(
      {
        success: false,
        hasExpense: false,
        hasItinerary: false,
        error: error.message || 'Unknown error',
        errorType: 'internal_error',
        model: DEFAULT_MODEL,
        latencyMs: Date.now() - requestStartTime,
      },
      { status: 500 }
    )
  }
}
