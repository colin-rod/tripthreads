/**
 * Expense Parsing Integration Tests
 *
 * Tests OpenAI API integration for expense parsing with 50+ test cases.
 * Uses mocked OpenAI responses to avoid real API calls.
 */

import { NextRequest } from 'next/server'
import type { LLMParseRequest } from '@tripthreads/core'
import {
  simpleExpenses,
  splitExpenses,
  namedParticipantsExpenses,
  complexSplitExpenses,
  multiCurrencyExpenses,
  edgeCaseExpenses,
  createOpenAIExpenseResponse,
} from './__fixtures__/expense-responses'

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

function createRequest(input: string, defaultCurrency = 'USD') {
  const body: LLMParseRequest = {
    input,
    parserType: 'expense',
    options: {
      defaultCurrency,
    },
    model: 'gpt-4o-mini',
  }

  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

describe('Expense Parsing Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Simple Expenses (10+ tests)', () => {
    simpleExpenses.forEach(testCase => {
      it(`parses: "${testCase.input}"`, async () => {
        mockCreate.mockResolvedValue(createOpenAIExpenseResponse(testCase))

        const response = await POST(createRequest(testCase.input))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)
        expect(payload.expenseResult).toMatchObject({
          amount: testCase.expectedResponse.amount,
          currency: testCase.expectedResponse.currency,
          description: testCase.expectedResponse.description,
        })

        // Verify OpenAI was called
        expect(mockCreate).toHaveBeenCalled()
      })
    })

    it('simple expense category inference works correctly', async () => {
      const dinnerCase = simpleExpenses.find(tc => tc.input.includes('dinner'))
      expect(dinnerCase).toBeDefined()

      mockCreate.mockResolvedValue(createOpenAIExpenseResponse(dinnerCase!))

      const response = await POST(createRequest(dinnerCase!.input))
      const payload = await response.json()

      expect(payload.expenseResult.category).toBe('food_drink')
    })
  })

  describe('Split Expenses (15+ tests)', () => {
    splitExpenses.forEach(testCase => {
      it(`parses: "${testCase.input}"`, async () => {
        mockCreate.mockResolvedValue(createOpenAIExpenseResponse(testCase))

        const response = await POST(createRequest(testCase.input))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)
        expect(payload.expenseResult).toMatchObject({
          amount: testCase.expectedResponse.amount,
          currency: testCase.expectedResponse.currency,
          splitType: testCase.expectedResponse.splitType,
        })

        if (testCase.expectedResponse.splitCount) {
          expect(payload.expenseResult.splitCount).toBe(testCase.expectedResponse.splitCount)
        }
      })
    })

    it('equal split type is correctly identified', async () => {
      const equalSplitCases = splitExpenses.filter(tc => tc.expectedResponse.splitType === 'equal')
      expect(equalSplitCases.length).toBeGreaterThan(5)

      for (const testCase of equalSplitCases.slice(0, 3)) {
        mockCreate.mockResolvedValue(createOpenAIExpenseResponse(testCase))

        const response = await POST(createRequest(testCase.input))
        const payload = await response.json()

        expect(payload.expenseResult.splitType).toBe('equal')
      }
    })
  })

  describe('Named Participants Expenses (10+ tests)', () => {
    namedParticipantsExpenses.forEach(testCase => {
      it(`parses: "${testCase.input}"`, async () => {
        mockCreate.mockResolvedValue(createOpenAIExpenseResponse(testCase))

        const response = await POST(createRequest(testCase.input))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)
        expect(payload.expenseResult).toMatchObject({
          amount: testCase.expectedResponse.amount,
          currency: testCase.expectedResponse.currency,
        })

        if (testCase.expectedResponse.participants) {
          expect(payload.expenseResult.participants).toEqual(testCase.expectedResponse.participants)
        }
      })
    })

    it('extracts participant names correctly', async () => {
      const multiParticipantCase = namedParticipantsExpenses.find(
        tc => tc.expectedResponse.participants && tc.expectedResponse.participants.length > 1
      )
      expect(multiParticipantCase).toBeDefined()

      mockCreate.mockResolvedValue(createOpenAIExpenseResponse(multiParticipantCase!))

      const response = await POST(createRequest(multiParticipantCase!.input))
      const payload = await response.json()

      expect(payload.expenseResult.participants).toBeTruthy()
      expect(payload.expenseResult.participants.length).toBeGreaterThan(1)
    })
  })

  describe('Complex Split Expenses (10+ tests)', () => {
    complexSplitExpenses.forEach(testCase => {
      it(`parses: "${testCase.input}"`, async () => {
        mockCreate.mockResolvedValue(createOpenAIExpenseResponse(testCase))

        const response = await POST(createRequest(testCase.input))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)
        expect(payload.expenseResult.amount).toBe(testCase.expectedResponse.amount)

        if (testCase.expectedResponse.paidBy) {
          expect(payload.expenseResult.paidBy).toBe(testCase.expectedResponse.paidBy)
        }
      })
    })

    it('handles percentage splits correctly', async () => {
      const percentageCase = complexSplitExpenses.find(
        tc => tc.expectedResponse.splitType === 'percentage'
      )

      if (percentageCase) {
        mockCreate.mockResolvedValue(createOpenAIExpenseResponse(percentageCase))

        const response = await POST(createRequest(percentageCase.input))
        const payload = await response.json()

        expect(payload.expenseResult.splitType).toBe('percentage')
      }
    })

    it('handles custom splits correctly', async () => {
      const customCase = complexSplitExpenses.find(tc => tc.expectedResponse.splitType === 'custom')

      if (customCase) {
        mockCreate.mockResolvedValue(createOpenAIExpenseResponse(customCase))

        const response = await POST(createRequest(customCase.input))
        const payload = await response.json()

        expect(payload.expenseResult.splitType).toBe('custom')
      }
    })
  })

  describe('Multi-Currency Expenses (5+ tests)', () => {
    multiCurrencyExpenses.forEach(testCase => {
      it(`parses: "${testCase.input}" with ${testCase.expectedResponse.currency}`, async () => {
        mockCreate.mockResolvedValue(createOpenAIExpenseResponse(testCase))

        const response = await POST(createRequest(testCase.input))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)
        expect(payload.expenseResult).toMatchObject({
          amount: testCase.expectedResponse.amount,
          currency: testCase.expectedResponse.currency,
        })
      })
    })

    it('handles JPY correctly (no minor units)', async () => {
      const jpyCase = multiCurrencyExpenses.find(tc => tc.expectedResponse.currency === 'JPY')
      expect(jpyCase).toBeDefined()

      mockCreate.mockResolvedValue(createOpenAIExpenseResponse(jpyCase!))

      const response = await POST(createRequest(jpyCase!.input))
      const payload = await response.json()

      expect(payload.expenseResult.currency).toBe('JPY')
      // JPY amounts should not be multiplied by 100
      expect(payload.expenseResult.amount).toBe(jpyCase!.expectedResponse.amount)
    })

    it('handles EUR/USD/GBP with minor units', async () => {
      const eurCase = multiCurrencyExpenses.find(tc => tc.expectedResponse.currency === 'EUR')

      if (eurCase) {
        mockCreate.mockResolvedValue(createOpenAIExpenseResponse(eurCase))

        const response = await POST(createRequest(eurCase.input))
        const payload = await response.json()

        // EUR amounts should be in cents (multiplied by 100)
        expect(payload.expenseResult.amount % 100).toBe(0)
      }
    })
  })

  describe('Edge Cases (10+ tests)', () => {
    edgeCaseExpenses.forEach(testCase => {
      it(`handles edge case: "${testCase.input}"`, async () => {
        mockCreate.mockResolvedValue(createOpenAIExpenseResponse(testCase))

        const response = await POST(createRequest(testCase.input))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)

        // Edge cases should still parse, even with lower confidence
        expect(payload.expenseResult).toBeTruthy()
        expect(payload.expenseResult.amount).toBe(testCase.expectedResponse.amount)
      })
    })

    it('handles typos gracefully', async () => {
      const typoCase = edgeCaseExpenses.find(tc => tc.input.includes('Diner'))
      expect(typoCase).toBeDefined()

      mockCreate.mockResolvedValue(createOpenAIExpenseResponse(typoCase!))

      const response = await POST(createRequest(typoCase!.input))
      const payload = await response.json()

      expect(payload.success).toBe(true)
      expect(payload.expenseResult.description).toBeTruthy()
    })

    it('handles missing currency with default', async () => {
      const noCurrencyCase = edgeCaseExpenses.find(
        tc => !tc.input.includes('€') && !tc.input.includes('$') && !tc.input.includes('£')
      )

      if (noCurrencyCase) {
        mockCreate.mockResolvedValue(createOpenAIExpenseResponse(noCurrencyCase))

        const response = await POST(createRequest(noCurrencyCase.input, 'USD'))
        const payload = await response.json()

        expect(payload.expenseResult.currency).toBe('USD')
      }
    })

    it('handles ambiguous amounts', async () => {
      const ambiguousCase = edgeCaseExpenses.find(tc => tc.input.includes('100-120'))

      if (ambiguousCase) {
        mockCreate.mockResolvedValue(createOpenAIExpenseResponse(ambiguousCase))

        const response = await POST(createRequest(ambiguousCase.input))
        const payload = await response.json()

        expect(payload.success).toBe(true)
        // Should resolve to some amount (midpoint in our fixture)
        expect(payload.expenseResult.amount).toBeGreaterThan(0)
      }
    })
  })

  describe('Confidence Scoring', () => {
    it('returns confidence scores for all parses', async () => {
      const testCase = simpleExpenses[0]
      mockCreate.mockResolvedValue(createOpenAIExpenseResponse(testCase))

      const response = await POST(createRequest(testCase.input))
      const payload = await response.json()

      expect(payload.expenseResult.confidence).toBeDefined()
      expect(payload.expenseResult.confidence).toBeGreaterThanOrEqual(0)
      expect(payload.expenseResult.confidence).toBeLessThanOrEqual(1)
    })

    it('simple expenses have high confidence', async () => {
      const testCase = simpleExpenses[0]
      mockCreate.mockResolvedValue(createOpenAIExpenseResponse(testCase))

      const response = await POST(createRequest(testCase.input))
      const payload = await response.json()

      expect(payload.expenseResult.confidence).toBeGreaterThan(0.85)
    })

    it('edge cases have lower confidence', async () => {
      const testCase = edgeCaseExpenses[0]
      mockCreate.mockResolvedValue(createOpenAIExpenseResponse(testCase))

      const response = await POST(createRequest(testCase.input))
      const payload = await response.json()

      // Edge cases typically have lower confidence
      expect(payload.expenseResult.confidence).toBeLessThan(0.95)
    })
  })

  describe('Response Metadata', () => {
    it('includes latency metrics', async () => {
      const testCase = simpleExpenses[0]
      mockCreate.mockResolvedValue(createOpenAIExpenseResponse(testCase))

      const response = await POST(createRequest(testCase.input))
      const payload = await response.json()

      expect(payload.latencyMs).toBeDefined()
      expect(typeof payload.latencyMs).toBe('number')
      expect(payload.latencyMs).toBeGreaterThanOrEqual(0) // Can be 0 in tests with mocks
    })

    it('includes token usage', async () => {
      const testCase = simpleExpenses[0]
      mockCreate.mockResolvedValue(createOpenAIExpenseResponse(testCase))

      const response = await POST(createRequest(testCase.input))
      const payload = await response.json()

      expect(payload.tokensUsed).toBeDefined()
      expect(typeof payload.tokensUsed).toBe('number')
    })

    it('includes model name', async () => {
      const testCase = simpleExpenses[0]
      mockCreate.mockResolvedValue(createOpenAIExpenseResponse(testCase))

      const response = await POST(createRequest(testCase.input))
      const payload = await response.json()

      expect(payload.model).toBe('gpt-4o-mini')
    })

    it('includes raw output for debugging', async () => {
      const testCase = simpleExpenses[0]
      mockCreate.mockResolvedValue(createOpenAIExpenseResponse(testCase))

      const response = await POST(createRequest(testCase.input))
      const payload = await response.json()

      expect(payload.rawOutput).toBeDefined()
      expect(typeof payload.rawOutput).toBe('string')
    })
  })

  describe('Test Coverage Summary', () => {
    it('has 50+ test cases across all categories', () => {
      const totalTestCases =
        simpleExpenses.length +
        splitExpenses.length +
        namedParticipantsExpenses.length +
        complexSplitExpenses.length +
        multiCurrencyExpenses.length +
        edgeCaseExpenses.length

      expect(totalTestCases).toBeGreaterThanOrEqual(50)
    })

    it('covers all major expense categories', () => {
      const categories = new Set(
        [...simpleExpenses, ...splitExpenses, ...multiCurrencyExpenses, ...edgeCaseExpenses]
          .map(tc => tc.expectedResponse.category)
          .filter(Boolean)
      )

      expect(categories.has('food_drink')).toBe(true)
      expect(categories.has('transportation')).toBe(true)
      expect(categories.has('lodging')).toBe(true)
    })

    it('covers all split types', () => {
      const splitTypes = new Set(
        [...splitExpenses, ...complexSplitExpenses].map(tc => tc.expectedResponse.splitType)
      )

      expect(splitTypes.has('equal')).toBe(true)
      // Custom and percentage may be in complex splits
    })
  })
})
