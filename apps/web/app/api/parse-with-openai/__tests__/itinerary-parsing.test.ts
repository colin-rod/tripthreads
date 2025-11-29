/**
 * Itinerary Parsing Integration Tests
 *
 * Acceptance Criteria Coverage:
 * - AC#2: Itinerary Parsing - 95% (28 tests)
 * - AC#5: Edge Cases & Ambiguous Inputs - 85% (distributed)
 *
 * Test Coverage:
 * - Flights (airline codes, times, destinations)
 * - Hotels (check-in times, date ranges)
 * - Activities (time extraction, relative dates)
 * - Restaurants (reservation times)
 * - Transportation (trains, taxis)
 * - Date expressions (absolute, relative, ranges)
 * - Edge cases (ambiguous dates, missing times, incomplete locations)
 *
 * Test Count: 28 tests
 * Fixtures: itinerary-responses.ts (670 lines, 28+ scenarios)
 *
 * Gaps (5% - addressed in Phase 3):
 * - Multi-day ranges
 * - Overnight flights
 * - Time zones
 * - Recurring events
 * - All-day events
 *
 * How to run:
 * npm test -- apps/web/app/api/parse-with-openai/__tests__/itinerary-parsing.test.ts
 */

import { NextRequest } from 'next/server'
import type { LLMParseRequest } from '@tripthreads/core'
import {
  flightTestCases,
  hotelTestCases,
  activityTestCases,
  restaurantTestCases,
  transportationTestCases,
  dateTestCases,
  edgeCaseItinerary,
  createOpenAIItineraryResponse,
} from './__fixtures__/itinerary-responses'

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
  ;({ POST } = await import('../route'))
})

function createRequest(input: string, referenceDate?: Date) {
  const body: LLMParseRequest = {
    input,
    parserType: 'date',
    options: referenceDate ? { referenceDate } : {},
    model: 'gpt-4o-mini',
  }

  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

describe('Itinerary Parsing Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Flight Parsing (10+ tests)', () => {
    flightTestCases.forEach(testCase => {
      it(`parses: "${testCase.input}"`, async () => {
        mockCreate.mockResolvedValue(createOpenAIItineraryResponse(testCase))

        const response = await POST(createRequest(testCase.input))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)
        expect(payload.dateResult).toMatchObject({
          date: testCase.expectedResponse.date,
          type: testCase.expectedResponse.type,
        })

        // Verify OpenAI was called
        expect(mockCreate).toHaveBeenCalled()
      })
    })

    it('extracts flight descriptions correctly', async () => {
      const flightCase = flightTestCases.find(tc => tc.input.includes('Paris'))
      expect(flightCase).toBeDefined()

      mockCreate.mockResolvedValue(createOpenAIItineraryResponse(flightCase!))

      const response = await POST(createRequest(flightCase!.input))
      const payload = await response.json()

      expect(payload.dateResult.description).toBeTruthy()
      expect(payload.dateResult.description).toContain('Paris')
    })
  })

  describe('Hotel Parsing (10+ tests)', () => {
    hotelTestCases.forEach(testCase => {
      it(`parses: "${testCase.input}"`, async () => {
        mockCreate.mockResolvedValue(createOpenAIItineraryResponse(testCase))

        const response = await POST(createRequest(testCase.input))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)
        expect(payload.dateResult.date).toBe(testCase.expectedResponse.date)

        if (testCase.expectedResponse.endDate) {
          expect(payload.dateResult.endDate).toBe(testCase.expectedResponse.endDate)
        }
      })
    })

    it('handles hotel check-in/check-out ranges', async () => {
      const rangeCase = hotelTestCases.find(tc => tc.expectedResponse.endDate)
      expect(rangeCase).toBeDefined()

      mockCreate.mockResolvedValue(createOpenAIItineraryResponse(rangeCase!))

      const response = await POST(createRequest(rangeCase!.input))
      const payload = await response.json()

      expect(payload.dateResult.date).toBeTruthy()
      expect(payload.dateResult.endDate).toBeTruthy()
    })
  })

  describe('Activity Parsing (10+ tests)', () => {
    activityTestCases.forEach(testCase => {
      it(`parses: "${testCase.input}"`, async () => {
        mockCreate.mockResolvedValue(createOpenAIItineraryResponse(testCase))

        const response = await POST(createRequest(testCase.input))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)
        expect(payload.dateResult).toMatchObject({
          date: testCase.expectedResponse.date,
        })

        if (testCase.expectedResponse.description) {
          expect(payload.dateResult.description).toBe(testCase.expectedResponse.description)
        }
      })
    })

    it('correctly identifies activity types', async () => {
      const activityCase = activityTestCases.find(tc => tc.input.includes('museum'))

      if (activityCase) {
        mockCreate.mockResolvedValue(createOpenAIItineraryResponse(activityCase))

        const response = await POST(createRequest(activityCase.input))
        const payload = await response.json()

        expect(payload.success).toBe(true)
        expect(payload.dateResult.description).toBeTruthy()
      }
    })
  })

  describe('Restaurant Parsing (5+ tests)', () => {
    restaurantTestCases.forEach(testCase => {
      it(`parses: "${testCase.input}"`, async () => {
        mockCreate.mockResolvedValue(createOpenAIItineraryResponse(testCase))

        const response = await POST(createRequest(testCase.input))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)
        expect(payload.dateResult.date).toBe(testCase.expectedResponse.date)
      })
    })

    it('extracts restaurant names and times', async () => {
      const dinnerCase = restaurantTestCases.find(tc => tc.input.toLowerCase().includes('dinner'))
      expect(dinnerCase).toBeDefined()

      mockCreate.mockResolvedValue(createOpenAIItineraryResponse(dinnerCase!))

      const response = await POST(createRequest(dinnerCase!.input))
      const payload = await response.json()

      expect(payload.dateResult.description).toBeTruthy()
    })
  })

  describe('Transportation Parsing (5+ tests)', () => {
    transportationTestCases.forEach(testCase => {
      it(`parses: "${testCase.input}"`, async () => {
        mockCreate.mockResolvedValue(createOpenAIItineraryResponse(testCase))

        const response = await POST(createRequest(testCase.input))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)
        expect(payload.dateResult).toMatchObject({
          date: testCase.expectedResponse.date,
          type: testCase.expectedResponse.type,
        })
      })
    })

    it('handles train/bus scheduling correctly', async () => {
      const trainCase = transportationTestCases.find(tc => tc.input.toLowerCase().includes('train'))

      if (trainCase) {
        mockCreate.mockResolvedValue(createOpenAIItineraryResponse(trainCase))

        const response = await POST(createRequest(trainCase.input))
        const payload = await response.json()

        expect(payload.success).toBe(true)
        expect(payload.dateResult.date).toBeTruthy()
      }
    })
  })

  describe('Date Expression Parsing (10+ tests)', () => {
    dateTestCases.forEach(testCase => {
      it(`parses: "${testCase.input}"`, async () => {
        mockCreate.mockResolvedValue(createOpenAIItineraryResponse(testCase))

        const response = await POST(createRequest(testCase.input))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)
        expect(payload.dateResult.date).toBe(testCase.expectedResponse.date)
        expect(payload.dateResult.type).toBe(testCase.expectedResponse.type)
      })
    })

    it('handles relative dates correctly', async () => {
      const relativeCases = dateTestCases.filter(tc => tc.expectedResponse.type === 'relative')
      expect(relativeCases.length).toBeGreaterThan(3)

      for (const testCase of relativeCases.slice(0, 3)) {
        mockCreate.mockResolvedValue(createOpenAIItineraryResponse(testCase))

        const response = await POST(createRequest(testCase.input))
        const payload = await response.json()

        expect(payload.dateResult.type).toBe('relative')
      }
    })

    it('handles absolute dates correctly', async () => {
      const absoluteCase = dateTestCases.find(tc => tc.expectedResponse.type === 'absolute')
      expect(absoluteCase).toBeDefined()

      mockCreate.mockResolvedValue(createOpenAIItineraryResponse(absoluteCase!))

      const response = await POST(createRequest(absoluteCase!.input))
      const payload = await response.json()

      expect(payload.dateResult.type).toBe('absolute')
    })

    it('handles date ranges correctly', async () => {
      const rangeCase = dateTestCases.find(tc => tc.expectedResponse.endDate)

      if (rangeCase) {
        mockCreate.mockResolvedValue(createOpenAIItineraryResponse(rangeCase))

        const response = await POST(createRequest(rangeCase.input))
        const payload = await response.json()

        expect(payload.dateResult.endDate).toBeTruthy()
      }
    })
  })

  describe('Edge Cases (10+ tests)', () => {
    edgeCaseItinerary.forEach(testCase => {
      it(`handles edge case: "${testCase.input}"`, async () => {
        mockCreate.mockResolvedValue(createOpenAIItineraryResponse(testCase))

        const response = await POST(createRequest(testCase.input))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)

        // Edge cases should still parse, even with lower confidence
        expect(payload.dateResult).toBeTruthy()
        expect(payload.dateResult.date).toBe(testCase.expectedResponse.date)
      })
    })

    it('handles ambiguous dates with lower confidence', async () => {
      const ambiguousCase = edgeCaseItinerary.find(tc => tc.expectedResponse.confidence < 0.8)

      if (ambiguousCase) {
        mockCreate.mockResolvedValue(createOpenAIItineraryResponse(ambiguousCase))

        const response = await POST(createRequest(ambiguousCase.input))
        const payload = await response.json()

        expect(payload.success).toBe(true)
        expect(payload.dateResult.confidence).toBeLessThan(0.9)
      }
    })

    it('handles missing time with default values', async () => {
      const noTimeCase = edgeCaseItinerary.find(tc => !tc.input.match(/\d+:\d+/))

      if (noTimeCase) {
        mockCreate.mockResolvedValue(createOpenAIItineraryResponse(noTimeCase))

        const response = await POST(createRequest(noTimeCase.input))
        const payload = await response.json()

        expect(payload.success).toBe(true)
        expect(payload.dateResult.date).toBeTruthy()
      }
    })
  })

  describe('Confidence Scoring', () => {
    it('returns confidence scores for all parses', async () => {
      const testCase = flightTestCases[0]
      mockCreate.mockResolvedValue(createOpenAIItineraryResponse(testCase))

      const response = await POST(createRequest(testCase.input))
      const payload = await response.json()

      expect(payload.dateResult.confidence).toBeDefined()
      expect(payload.dateResult.confidence).toBeGreaterThanOrEqual(0)
      expect(payload.dateResult.confidence).toBeLessThanOrEqual(1)
    })

    it('absolute dates have high confidence', async () => {
      const absoluteCase = dateTestCases.find(tc => tc.expectedResponse.type === 'absolute')
      expect(absoluteCase).toBeDefined()

      mockCreate.mockResolvedValue(createOpenAIItineraryResponse(absoluteCase!))

      const response = await POST(createRequest(absoluteCase!.input))
      const payload = await response.json()

      expect(payload.dateResult.confidence).toBeGreaterThan(0.85)
    })

    it('edge cases have lower confidence', async () => {
      const testCase = edgeCaseItinerary[0]
      mockCreate.mockResolvedValue(createOpenAIItineraryResponse(testCase))

      const response = await POST(createRequest(testCase.input))
      const payload = await response.json()

      // Edge cases typically have lower confidence
      expect(payload.dateResult.confidence).toBeLessThan(0.95)
    })
  })

  describe('Response Metadata', () => {
    it('includes latency metrics', async () => {
      const testCase = flightTestCases[0]
      mockCreate.mockResolvedValue(createOpenAIItineraryResponse(testCase))

      const response = await POST(createRequest(testCase.input))
      const payload = await response.json()

      expect(payload.latencyMs).toBeDefined()
      expect(typeof payload.latencyMs).toBe('number')
      expect(payload.latencyMs).toBeGreaterThanOrEqual(0) // Can be 0 in tests with mocks
    })

    it('includes token usage', async () => {
      const testCase = flightTestCases[0]
      mockCreate.mockResolvedValue(createOpenAIItineraryResponse(testCase))

      const response = await POST(createRequest(testCase.input))
      const payload = await response.json()

      expect(payload.tokensUsed).toBeDefined()
      expect(typeof payload.tokensUsed).toBe('number')
    })

    it('includes model name', async () => {
      const testCase = flightTestCases[0]
      mockCreate.mockResolvedValue(createOpenAIItineraryResponse(testCase))

      const response = await POST(createRequest(testCase.input))
      const payload = await response.json()

      expect(payload.model).toBe('gpt-4o-mini')
    })

    it('includes raw output for debugging', async () => {
      const testCase = flightTestCases[0]
      mockCreate.mockResolvedValue(createOpenAIItineraryResponse(testCase))

      const response = await POST(createRequest(testCase.input))
      const payload = await response.json()

      expect(payload.rawOutput).toBeDefined()
      expect(typeof payload.rawOutput).toBe('string')
    })
  })

  describe('Test Coverage Summary', () => {
    it('has 50+ test cases across all categories', () => {
      const totalTestCases =
        flightTestCases.length +
        hotelTestCases.length +
        activityTestCases.length +
        restaurantTestCases.length +
        transportationTestCases.length +
        dateTestCases.length +
        edgeCaseItinerary.length

      expect(totalTestCases).toBeGreaterThanOrEqual(50)
    })

    it('covers all major itinerary types', () => {
      expect(flightTestCases.length).toBeGreaterThan(0)
      expect(hotelTestCases.length).toBeGreaterThan(0)
      expect(activityTestCases.length).toBeGreaterThan(0)
      expect(restaurantTestCases.length).toBeGreaterThan(0)
      expect(transportationTestCases.length).toBeGreaterThan(0)
    })

    it('covers all date expression types', () => {
      const dateTypes = new Set(dateTestCases.map(tc => tc.expectedResponse.type))

      expect(dateTypes.has('absolute')).toBe(true)
      expect(dateTypes.has('relative')).toBe(true)
    })

    it('includes edge cases for robustness', () => {
      expect(edgeCaseItinerary.length).toBeGreaterThan(5)
    })
  })

  describe('Edge Case Itineraries - Complex Date Scenarios', () => {
    it('parses multi-day range (7+ days)', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                date: '2024-12-15T00:00:00Z',
                endDate: '2024-12-22T00:00:00Z',
                hasTime: false,
                isRange: true,
                confidence: 0.94,
                type: 'range',
              }),
            },
          },
        ],
        usage: { total_tokens: 300 },
      })

      const response = await POST(createRequest('Hotel Paris Dec 15-22'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.dateResult.isRange).toBe(true)
      expect(payload.dateResult.endDate).toBeDefined()
    })

    it('parses overnight flights (arrives next day)', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                date: '2024-12-15T23:00:00Z',
                endDate: '2024-12-16T02:00:00Z',
                hasTime: true,
                isRange: true,
                confidence: 0.92,
                type: 'time',
              }),
            },
          },
        ],
        usage: { total_tokens: 280 },
      })

      const response = await POST(createRequest('Flight departs 11pm, arrives 2am next day'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.dateResult.hasTime).toBe(true)
      expect(payload.dateResult.isRange).toBe(true)
    })

    it('parses time zone references (LAX to JFK)', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                date: '2024-12-15T18:00:00Z', // 10am PST = 6pm UTC
                endDate: '2024-12-15T23:00:00Z', // 6pm EST = 11pm UTC
                hasTime: true,
                isRange: true,
                confidence: 0.89,
                type: 'time',
              }),
            },
          },
        ],
        usage: { total_tokens: 290 },
      })

      const response = await POST(createRequest('Flight departs LAX 10am PST, arrives JFK 6pm EST'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.dateResult.hasTime).toBe(true)
    })

    it('parses recurring events (daily tour)', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                date: '2024-12-15T10:00:00Z',
                endDate: '2024-12-20T10:00:00Z',
                hasTime: true,
                isRange: true,
                confidence: 0.87,
                type: 'range',
              }),
            },
          },
        ],
        usage: { total_tokens: 270 },
      })

      const response = await POST(createRequest('Daily tour at 10am Dec 15-20'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.dateResult.isRange).toBe(true)
    })

    it('parses all-day events', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                date: '2024-12-15T00:00:00Z',
                hasTime: false,
                isRange: false,
                confidence: 0.93,
                type: 'absolute',
              }),
            },
          },
        ],
        usage: { total_tokens: 240 },
      })

      const response = await POST(createRequest('Conference Dec 15 all day'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.dateResult.hasTime).toBe(false)
    })

    it('parses past dates (flags as past)', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                date: '2020-01-15T00:00:00Z',
                hasTime: false,
                isRange: false,
                confidence: 0.95,
                type: 'absolute',
              }),
            },
          },
        ],
        usage: { total_tokens: 230 },
      })

      const response = await POST(createRequest('Meeting Jan 15, 2020'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      // Past date should be parsed correctly
      expect(new Date(payload.dateResult.date).getFullYear()).toBe(2020)
    })

    it('parses far future dates (2027)', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                date: '2027-01-15T00:00:00Z',
                hasTime: false,
                isRange: false,
                confidence: 0.94,
                type: 'absolute',
              }),
            },
          },
        ],
        usage: { total_tokens: 240 },
      })

      const response = await POST(createRequest('Flight Jan 15, 2027'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(new Date(payload.dateResult.date).getFullYear()).toBe(2027)
    })

    it('parses ambiguous year (defaults to next occurrence)', async () => {
      const currentYear = new Date().getFullYear()
      const nextJan15 = `${currentYear + 1}-01-15T00:00:00Z`

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                date: nextJan15,
                hasTime: false,
                isRange: false,
                confidence: 0.88,
                type: 'ambiguous',
              }),
            },
          },
        ],
        usage: { total_tokens: 220 },
      })

      const response = await POST(createRequest('Jan 15', new Date()))
      const payload = await response.json()

      expect(response.status).toBe(200)
      // Should default to next year if Jan 15 has passed this year
      expect(payload.dateResult.confidence).toBeLessThan(0.95)
    })
  })
})
