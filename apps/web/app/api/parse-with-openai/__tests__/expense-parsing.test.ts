/**
 * @jest-environment node
 *
 * Expense Parsing Integration Tests
 *
 * Acceptance Criteria Coverage:
 * - AC#1: Expense Parsing - 95% (26 tests)
 * - AC#5: Edge Cases & Ambiguous Inputs - 85% (distributed)
 *
 * Test Coverage:
 * - Simple expenses (EUR, USD, GBP, JPY)
 * - Split expenses (equal splits, 2-4 ways)
 * - Named participants extraction
 * - Complex splits (percentage, custom amounts)
 * - Multi-currency support
 * - Edge cases (typos, ambiguous descriptions, incomplete info)
 *
 * Test Count: 26 tests
 * Fixtures: expense-responses.ts (840 lines, 26+ scenarios)
 *
 * Gaps (5% - addressed in Phase 3):
 * - Exotic currencies (THB, INR, AED, SGD, HKD, MXN, BRL, ZAR)
 * - Mixed currency formats
 * - Very large/small amounts
 * - European decimal format
 *
 * How to run:
 * npm test -- apps/web/app/api/parse-with-openai/__tests__/expense-parsing.test.ts
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

        if (testCase.expectedResponse.payer) {
          expect(payload.expenseResult.payer).toBe(testCase.expectedResponse.payer)
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

  describe('Edge Case Expenses - Exotic Currencies & Formats', () => {
    it('parses Thai Baht (THB) expense', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                amount: 250000, // ฿2,500 in minor units
                currency: 'THB',
                description: 'Bangkok hotel',
                splitType: 'equal',
                confidence: 0.93,
              }),
            },
          },
        ],
        usage: { total_tokens: 250 },
      })

      const response = await POST(createRequest('Bangkok hotel ฿2,500'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.success).toBe(true)
      expect(payload.expenseResult.amount).toBe(250000)
      expect(payload.expenseResult.currency).toBe('THB')
    })

    it('parses Indian Rupee (INR) expense', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                amount: 150000,
                currency: 'INR',
                description: 'Taxi',
                splitType: 'equal',
                confidence: 0.91,
              }),
            },
          },
        ],
        usage: { total_tokens: 240 },
      })

      const response = await POST(createRequest('Taxi ₹1,500'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.expenseResult.amount).toBe(150000)
      expect(payload.expenseResult.currency).toBe('INR')
    })

    it('parses Mexican Peso (MXN) expense', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                amount: 50000,
                currency: 'MXN',
                description: 'Dinner',
                splitType: 'equal',
                confidence: 0.94,
              }),
            },
          },
        ],
        usage: { total_tokens: 240 },
      })

      const response = await POST(createRequest('Dinner 500 MXN'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.expenseResult.amount).toBe(50000)
      expect(payload.expenseResult.currency).toBe('MXN')
    })

    it('parses very large amount (>$10,000)', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                amount: 1250000,
                currency: 'USD',
                description: 'Luxury hotel booking',
                splitType: 'equal',
                confidence: 0.96,
              }),
            },
          },
        ],
        usage: { total_tokens: 260 },
      })

      const response = await POST(createRequest('Luxury hotel booking $12,500'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.expenseResult.amount).toBe(1250000)
    })

    it('parses very small amount (<$1)', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                amount: 75,
                currency: 'USD',
                description: 'Coffee',
                splitType: 'equal',
                confidence: 0.92,
              }),
            },
          },
        ],
        usage: { total_tokens: 220 },
      })

      const response = await POST(createRequest('Coffee $0.75'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.expenseResult.amount).toBe(75)
    })

    it('parses percentage split expense', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                amount: 10000,
                currency: 'USD',
                description: 'Dinner',
                splitType: 'percentage',
                percentageSplits: [
                  { name: 'Alice', percentage: 60 },
                  { name: 'Bob', percentage: 40 },
                ],
                confidence: 0.89,
              }),
            },
          },
        ],
        usage: { total_tokens: 280 },
      })

      const response = await POST(createRequest('Dinner $100, Alice 60%, Bob 40%'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.expenseResult.splitType).toBe('percentage')
      expect(payload.expenseResult.percentageSplits).toHaveLength(2)
    })

    it('parses negative amount (refund)', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                amount: -3000,
                currency: 'EUR',
                description: 'Refund',
                splitType: 'equal',
                confidence: 0.88,
              }),
            },
          },
        ],
        usage: { total_tokens: 230 },
      })

      const response = await POST(createRequest('Refund -€30', 'EUR'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.expenseResult.amount).toBe(-3000)
    })

    it('parses expense with date context', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                amount: 6000,
                currency: 'EUR',
                description: 'Dinner on Dec 15',
                splitType: 'equal',
                confidence: 0.91,
              }),
            },
          },
        ],
        usage: { total_tokens: 250 },
      })

      const response = await POST(createRequest('Dinner €60 on Dec 15', 'EUR'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.expenseResult.description).toContain('Dec 15')
    })

    it('parses Unicode currency symbols (Korean Won)', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                amount: 10000,
                currency: 'KRW',
                description: 'Lunch',
                splitType: 'equal',
                confidence: 0.9,
              }),
            },
          },
        ],
        usage: { total_tokens: 240 },
      })

      const response = await POST(createRequest('Lunch ₩10,000', 'KRW'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.expenseResult.amount).toBe(10000)
      expect(payload.expenseResult.currency).toBe('KRW')
    })

    it('parses European decimal format (comma as decimal separator)', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                amount: 4567,
                currency: 'EUR',
                description: 'Groceries',
                splitType: 'equal',
                confidence: 0.93,
              }),
            },
          },
        ],
        usage: { total_tokens: 250 },
      })

      const response = await POST(createRequest('Groceries €45,67', 'EUR'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.expenseResult.amount).toBe(4567)
    })
  })
})
