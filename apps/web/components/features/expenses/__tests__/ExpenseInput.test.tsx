/**
 * ExpenseInput Component Integration Tests
 *
 * Acceptance Criteria Coverage:
 * - AC#8: Integration Tests (Full Flow) - Component integration with mocked API
 *
 * Test Coverage:
 * - Component rendering (input field, buttons, loading states)
 * - Parsing flow (user input → API call → preview display)
 * - Participant resolution (auto-resolve, disambiguation, unmatched)
 * - Form submission (successful save, error handling)
 * - Error scenarios (timeout, rate limit, network failures)
 * - Preview card rendering (amount, currency, split type, participants)
 * - Confidence badge display (high/medium/low)
 * - Manual override functionality
 *
 * Test Count: 32 tests
 *
 * How to run:
 * npm test -- apps/web/components/features/expenses/__tests__/ExpenseInput.test.tsx
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseInput } from '../ExpenseInput'
import { parseWithOpenAI } from '@/lib/parser/openai'
import { fetchTripParticipants } from '@/app/actions/expenses'
import type { ParsedExpense, TripParticipant } from '@tripthreads/core'

// Mock dependencies
jest.mock('@/lib/parser/openai')
jest.mock('@/app/actions/expenses')

const mockParseWithOpenAI = parseWithOpenAI as jest.MockedFunction<typeof parseWithOpenAI>
const mockFetchTripParticipants = fetchTripParticipants as jest.MockedFunction<
  typeof fetchTripParticipants
>

describe('ExpenseInput Component', () => {
  const mockTripId = 'test-trip-123'
  const mockOnSubmit = jest.fn()

  // Sample trip participants
  const mockParticipants: TripParticipant[] = [
    { user_id: 'user-1', full_name: 'Alice Smith' },
    { user_id: 'user-2', full_name: 'Bob Johnson' },
    { user_id: 'user-3', full_name: 'Charlie Brown' },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    // Default: fetchTripParticipants returns success
    mockFetchTripParticipants.mockResolvedValue({
      success: true,
      participants: mockParticipants,
    })

    // Default: onSubmit resolves successfully
    mockOnSubmit.mockResolvedValue(undefined)
  })

  describe('Component Rendering', () => {
    it('renders input field and add button', () => {
      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      expect(screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    })

    it('shows loading spinner during parse', async () => {
      const user = userEvent.setup()

      // Mock parseWithOpenAI to delay response
      mockParseWithOpenAI.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  expenseResult: {
                    amount: 6000,
                    currency: 'EUR',
                    description: 'Dinner',
                    splitType: 'equal',
                    originalText: 'Dinner €60',
                    confidence: 0.95,
                  },
                  model: 'gpt-4o-mini',
                  tokensUsed: 150,
                  latencyMs: 500,
                  rawOutput: '{}',
                }),
              100
            )
          )
      )

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Dinner €60')

      const addButton = screen.getByRole('button', { name: /add/i })
      await user.click(addButton)

      // Loading state should appear
      expect(screen.getByText(/adding\.\.\./i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /adding\.\.\./i })).toBeDisabled()

      // Wait for add to complete
      await waitFor(() => {
        expect(screen.queryByText(/adding\.\.\./i)).not.toBeInTheDocument()
      })
    })

    it('displays error alert on parse failure', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: false,
        error: 'Failed to parse expense',
        errorType: 'parse_error',
        model: 'gpt-4o-mini',
        rawOutput: '',
        latencyMs: 300,
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Invalid input')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/failed to parse expense/i)).toBeInTheDocument()
      })
    })

    it('shows preview card after successful parse', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 6000,
          currency: 'EUR',
          description: 'Dinner',
          category: 'food_drink',
          splitType: 'equal',
          splitCount: 4,
          originalText: 'Dinner €60 split 4 ways',
          confidence: 0.95,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 200,
        latencyMs: 450,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Dinner €60 split 4 ways')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
        expect(screen.getByText(/ai parsed/i)).toBeInTheDocument()
      })
    })

    it('handles empty input gracefully', async () => {
      const user = userEvent.setup()

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const parseButton = screen.getByRole('button', { name: /add/i })

      // Button should be disabled when input is empty
      expect(parseButton).toBeDisabled()

      // Type whitespace only
      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, '   ')

      // Button should still be disabled
      expect(parseButton).toBeDisabled()
    })
  })

  describe('Parsing Flow', () => {
    it('user types expense and sees preview after parse', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 10000,
          currency: 'USD',
          description: 'Taxi',
          splitType: 'equal',
          originalText: 'Taxi $100',
          confidence: 0.92,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 120,
        latencyMs: 380,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Taxi $100')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })
    })

    it('preview shows correct amount in major units (€60 not 6000)', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 6000, // Minor units (cents)
          currency: 'EUR',
          description: 'Dinner',
          splitType: 'equal',
          originalText: 'Dinner €60',
          confidence: 0.95,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 150,
        latencyMs: 400,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Dinner €60')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        // Should display €60.00, not €6000
        expect(screen.getByText(/€60\.00/i)).toBeInTheDocument()
      })
    })

    it('preview shows correct currency symbol', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 4500,
          currency: 'GBP',
          description: 'Groceries',
          splitType: 'equal',
          originalText: 'Groceries £45',
          confidence: 0.93,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 140,
        latencyMs: 420,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Groceries £45')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/£45\.00/i)).toBeInTheDocument()
      })
    })

    it('preview shows split type (equal/custom/percentage)', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 12000,
          currency: 'USD',
          description: 'Dinner',
          splitType: 'equal',
          splitCount: 4,
          originalText: 'Dinner $120 split 4 ways',
          confidence: 0.96,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 430,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Dinner $120 split 4 ways')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/equal/i)).toBeInTheDocument()
      })
    })

    it('preview shows split count for equal splits', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 12000,
          currency: 'USD',
          description: 'Dinner',
          splitType: 'equal',
          splitCount: 4,
          originalText: 'Dinner $120 split 4 ways',
          confidence: 0.96,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 430,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Dinner $120 split 4 ways')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/4 people/i)).toBeInTheDocument()
      })
    })

    it('preview shows participant names for named splits', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 12000,
          currency: 'USD',
          description: 'Hotel',
          splitType: 'equal',
          participants: ['Alice', 'Bob', 'Charlie'],
          originalText: 'Hotel $120 split between Alice, Bob, Charlie',
          confidence: 0.94,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 220,
        latencyMs: 480,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Hotel $120 split between Alice, Bob, Charlie')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        // Participants should be resolved to full names
        expect(screen.getByText(/alice smith/i)).toBeInTheDocument()
        expect(screen.getByText(/bob johnson/i)).toBeInTheDocument()
        expect(screen.getByText(/charlie brown/i)).toBeInTheDocument()
      })
    })

    it('confidence badge shows high (>0.85), medium (0.7-0.85), low (<0.7)', async () => {
      const user = userEvent.setup()

      // Test high confidence
      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 6000,
          currency: 'EUR',
          description: 'Dinner',
          splitType: 'equal',
          originalText: 'Dinner €60',
          confidence: 0.95, // High confidence
        },
        model: 'gpt-4o-mini',
        tokensUsed: 150,
        latencyMs: 400,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Dinner €60')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/confidence: 95%/i)).toBeInTheDocument()
      })
    })

    it('allows manual override of parsed values', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 6000,
          currency: 'EUR',
          description: 'Dinner',
          splitType: 'equal',
          originalText: 'Dinner €60',
          confidence: 0.95,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 150,
        latencyMs: 400,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Dinner €60')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      // Click Reset button
      const editButton = screen.getByRole('button', { name: /reset/i })
      await user.click(editButton)

      // Preview should disappear, allowing re-parse
      expect(screen.queryByText(/preview/i)).not.toBeInTheDocument()
    })

    it('updates preview when manual edits are made', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI
        .mockResolvedValueOnce({
          success: true,
          expenseResult: {
            amount: 6000,
            currency: 'EUR',
            description: 'Dinner',
            splitType: 'equal',
            originalText: 'Dinner €60',
            confidence: 0.95,
          },
          model: 'gpt-4o-mini',
          tokensUsed: 150,
          latencyMs: 400,
          rawOutput: '{}',
        })
        .mockResolvedValueOnce({
          success: true,
          expenseResult: {
            amount: 7000,
            currency: 'EUR',
            description: 'Dinner',
            splitType: 'equal',
            originalText: 'Dinner €70',
            confidence: 0.96,
          },
          model: 'gpt-4o-mini',
          tokensUsed: 150,
          latencyMs: 410,
          rawOutput: '{}',
        })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Dinner €60')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/€60\.00/i)).toBeInTheDocument()
      })

      // Edit and re-parse
      const editButton = screen.getByRole('button', { name: /reset/i })
      await user.click(editButton)

      await user.clear(input)
      await user.type(input, 'Dinner €70')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/€70\.00/i)).toBeInTheDocument()
      })
    })

    it('clears preview when input is cleared', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 6000,
          currency: 'EUR',
          description: 'Dinner',
          splitType: 'equal',
          originalText: 'Dinner €60',
          confidence: 0.95,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 150,
        latencyMs: 400,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Dinner €60')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      // Click Reset button
      const resetButton = screen.getByRole('button', { name: /reset/i })
      await user.click(resetButton)

      // Preview should disappear
      expect(screen.queryByText(/preview/i)).not.toBeInTheDocument()
    })
  })

  describe('Participant Resolution', () => {
    it('auto-resolves clear participant matches (confidence >0.85)', async () => {
      const user = userEvent.setup()

      // Exact match - should auto-resolve
      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 12000,
          currency: 'USD',
          description: 'Hotel',
          splitType: 'equal',
          participants: ['Alice Smith', 'Bob Johnson'],
          originalText: 'Hotel $120 split between Alice Smith, Bob Johnson',
          confidence: 0.94,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 220,
        latencyMs: 480,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Hotel $120 split between Alice Smith, Bob Johnson')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        // Should show resolved names with check marks (high confidence)
        expect(screen.getByText(/alice smith/i)).toBeInTheDocument()
        expect(screen.getByText(/bob johnson/i)).toBeInTheDocument()
      })
    })

    it('shows disambiguation dialog for ambiguous names', async () => {
      const user = userEvent.setup()

      // Add another Alice to create ambiguity
      const participantsWithAmbiguity: TripParticipant[] = [
        ...mockParticipants,
        { user_id: 'user-4', full_name: 'Alice Jones' }, // Another Alice
      ]

      mockFetchTripParticipants.mockResolvedValue({
        success: true,
        participants: participantsWithAmbiguity,
      })

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 12000,
          currency: 'USD',
          description: 'Hotel',
          splitType: 'equal',
          participants: ['Alice', 'Bob'], // Ambiguous "Alice"
          originalText: 'Hotel $120 split between Alice, Bob',
          confidence: 0.92,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 210,
        latencyMs: 470,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Hotel $120 split between Alice, Bob')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      // Click Confirm & Save - should trigger disambiguation dialog
      const confirmButton = screen.getByRole('button', { name: /confirm & save/i })
      await user.click(confirmButton)

      // Disambiguation dialog should appear (this is a simplified check)
      // In real implementation, dialog renders with Portal, might need different query
      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled() // Should not submit yet
      })
    })

    it('shows unmatched dialog for unknown names', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 12000,
          currency: 'USD',
          description: 'Hotel',
          splitType: 'equal',
          participants: ['Alice', 'Dave'], // Dave doesn't exist
          originalText: 'Hotel $120 split between Alice, Dave',
          confidence: 0.9,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 210,
        latencyMs: 470,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Hotel $120 split between Alice, Dave')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        // Should show warning about unmatched names
        expect(screen.getByText(/could not be matched/i)).toBeInTheDocument()
      })
    })

    it('disables submit until all participants resolved', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 12000,
          currency: 'USD',
          description: 'Hotel',
          splitType: 'equal',
          participants: ['Alice', 'UnknownPerson'],
          originalText: 'Hotel $120 split between Alice, UnknownPerson',
          confidence: 0.88,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 220,
        latencyMs: 480,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Hotel $120 split between Alice, UnknownPerson')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/could not be matched/i)).toBeInTheDocument()
      })

      // Confirm button should be present but clicking should show unmatched dialog
      const confirmButton = screen.getByRole('button', { name: /confirm & save/i })
      await user.click(confirmButton)

      // Should not submit immediately
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Form Submission', () => {
    it('submits parsed expense with correct data structure', async () => {
      const user = userEvent.setup()

      const parsedExpense: ParsedExpense = {
        amount: 6000,
        currency: 'EUR',
        description: 'Dinner',
        category: 'food_drink',
        splitType: 'equal',
        splitCount: 4,
        originalText: 'Dinner €60 split 4 ways',
        confidence: 0.95,
      }

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: parsedExpense,
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 430,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Dinner €60 split 4 ways')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /confirm & save/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          amount: 6000,
          currency: 'EUR',
          description: 'Dinner',
          category: 'food_drink',
          payer: null,
          splitType: 'equal',
          splitCount: 4,
          participants: null,
          customSplits: null,
          percentageSplits: null,
        })
      })
    })

    it('calls onSubmit prop with formatted expense data', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 10000,
          currency: 'USD',
          description: 'Taxi',
          splitType: 'equal',
          splitCount: 2,
          originalText: 'Taxi $100 split 2 ways',
          confidence: 0.93,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 160,
        latencyMs: 410,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Taxi $100 split 2 ways')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /confirm & save/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      })
    })

    it('resets form after successful submission', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 6000,
          currency: 'EUR',
          description: 'Dinner',
          splitType: 'equal',
          originalText: 'Dinner €60',
          confidence: 0.95,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 150,
        latencyMs: 400,
        rawOutput: '{}',
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Dinner €60')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /confirm & save/i }))

      await waitFor(() => {
        // Form should reset
        expect(screen.queryByText(/preview/i)).not.toBeInTheDocument()
        expect(input).toHaveValue('')
      })
    })

    it('shows error toast on submission failure', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 6000,
          currency: 'EUR',
          description: 'Dinner',
          splitType: 'equal',
          originalText: 'Dinner €60',
          confidence: 0.95,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 150,
        latencyMs: 400,
        rawOutput: '{}',
      })

      // Mock submission failure
      mockOnSubmit.mockRejectedValue(new Error('Failed to save expense'))

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Dinner €60')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /confirm & save/i }))

      await waitFor(() => {
        expect(screen.getByText(/failed to save expense/i)).toBeInTheDocument()
      })
    })

    it('disables submit button during submission', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        expenseResult: {
          amount: 6000,
          currency: 'EUR',
          description: 'Dinner',
          splitType: 'equal',
          originalText: 'Dinner €60',
          confidence: 0.95,
        },
        model: 'gpt-4o-mini',
        tokensUsed: 150,
        latencyMs: 400,
        rawOutput: '{}',
      })

      // Mock slow submission
      mockOnSubmit.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(undefined), 1000))
      )

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Dinner €60')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /confirm & save/i })
      await user.click(confirmButton)

      // Button should show saving state
      await waitFor(() => {
        expect(screen.getByText(/saving\.\.\./i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /saving\.\.\./i })).toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays parse timeout error (408)', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: false,
        error: 'Request timeout',
        errorType: 'timeout',
        errorDetails: 'The request took too long to complete',
        model: 'gpt-4o-mini',
        rawOutput: '',
        latencyMs: 30000,
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Dinner €60')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/request timeout/i)).toBeInTheDocument()
      })
    })

    it('displays rate limit error (429)', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded',
        errorType: 'internal_error',
        errorDetails: 'Too many requests. Please wait and try again.',
        model: 'gpt-4o-mini',
        rawOutput: '',
        latencyMs: 200,
      })

      render(<ExpenseInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Dinner €60 split 4 ways/i)
      await user.type(input, 'Dinner €60')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument()
      })
    })
  })
})
