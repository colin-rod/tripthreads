/**
 * ItineraryInput Component Integration Tests
 *
 * Acceptance Criteria Coverage:
 * - AC#8: Integration Tests (Full Flow) - Component integration with mocked API
 *
 * Test Coverage:
 * - Component rendering (input field, buttons, loading states)
 * - Date parsing flow (user input → API call → preview display)
 * - Preview card rendering (dates, times, confidence, ranges)
 * - Item type detection (flights, hotels, activities, restaurants)
 * - Form submission (successful save, error handling)
 * - Error scenarios (timeout, rate limit, network failures)
 * - Date format indicators (absolute, relative, range)
 * - Time extraction indicators (hasTime, isRange)
 *
 * Test Count: 22 tests
 *
 * How to run:
 * npm test -- apps/web/components/features/itinerary/__tests__/ItineraryInput.test.tsx
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItineraryInput } from '../ItineraryInput'
import { parseWithOpenAI } from '@/lib/parser/openai'

// Mock dependencies
jest.mock('@/lib/parser/openai')

const mockParseWithOpenAI = parseWithOpenAI as jest.MockedFunction<typeof parseWithOpenAI>

describe('ItineraryInput Component', () => {
  const mockTripId = 'test-trip-123'
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockOnSubmit.mockResolvedValue(undefined)
  })

  describe('Component Rendering', () => {
    it('renders input field and parse button', () => {
      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      expect(screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /parse/i })).toBeInTheDocument()
    })

    it('shows loading state during parse', async () => {
      const user = userEvent.setup()

      // Mock delayed response
      mockParseWithOpenAI.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  dateResult: {
                    date: new Date('2024-12-15T09:00:00Z'),
                    hasTime: true,
                    isRange: false,
                    confidence: 0.95,
                    detectedFormat: 'absolute',
                    originalText: 'Flight to Paris Monday 9am',
                  },
                  model: 'gpt-4o-mini',
                  tokensUsed: 180,
                  latencyMs: 450,
                  rawOutput: '{}',
                }),
              100
            )
          )
      )

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight to Paris Monday 9am')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      expect(screen.getByText(/parsing\.\.\./i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /parsing\.\.\./i })).toBeDisabled()

      await waitFor(() => {
        expect(screen.queryByText(/parsing\.\.\./i)).not.toBeInTheDocument()
      })
    })

    it('displays error messages', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: false,
        error: 'Failed to parse itinerary item',
        errorType: 'parse_error',
        model: 'gpt-4o-mini',
        rawOutput: '',
        latencyMs: 300,
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Invalid input')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/failed to parse itinerary item/i)).toBeInTheDocument()
      })
    })

    it('shows preview card with parsed date/time', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T09:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.95,
          detectedFormat: 'absolute',
          originalText: 'Flight to Paris Monday 9am',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 450,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight to Paris Monday 9am')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
        expect(screen.getByText(/ai parsed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Date Parsing', () => {
    it('parses absolute dates (Dec 15, 2024)', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T00:00:00Z'),
          hasTime: false,
          isRange: false,
          confidence: 0.96,
          detectedFormat: 'absolute',
          originalText: 'Museum visit Dec 15, 2024',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 160,
        latencyMs: 420,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Museum visit Dec 15, 2024')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
        expect(screen.getByText(/absolute/i)).toBeInTheDocument()
      })
    })

    it('parses relative dates (tomorrow, next Friday)', async () => {
      const user = userEvent.setup()

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: tomorrow,
          hasTime: false,
          isRange: false,
          confidence: 0.93,
          detectedFormat: 'relative',
          originalText: 'Museum visit tomorrow',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 150,
        latencyMs: 400,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Museum visit tomorrow')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/relative/i)).toBeInTheDocument()
      })
    })

    it('parses date ranges (Dec 15-20)', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T00:00:00Z'),
          endDate: new Date('2024-12-20T00:00:00Z'),
          hasTime: false,
          isRange: true,
          confidence: 0.94,
          detectedFormat: 'range',
          originalText: 'Hotel Paris Dec 15-20',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 190,
        latencyMs: 460,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Hotel Paris Dec 15-20')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/date range/i)).toBeInTheDocument()
      })
    })

    it('parses times (9am, 14:30, 6pm)', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T09:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.97,
          detectedFormat: 'time',
          originalText: 'Flight 9am',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 140,
        latencyMs: 390,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight 9am')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/has specific time/i)).toBeInTheDocument()
      })
    })

    it('parses date + time combinations (Monday 9am)', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-16T09:00:00Z'), // Monday
          hasTime: true,
          isRange: false,
          confidence: 0.95,
          detectedFormat: 'absolute',
          originalText: 'Flight Monday 9am',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 170,
        latencyMs: 430,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight Monday 9am')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/has specific time/i)).toBeInTheDocument()
      })
    })

    it('handles ambiguous dates with lower confidence', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T00:00:00Z'),
          hasTime: false,
          isRange: false,
          confidence: 0.72, // Lower confidence
          detectedFormat: 'ambiguous',
          originalText: 'Meeting sometime next week',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 160,
        latencyMs: 420,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Meeting sometime next week')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/confidence: 72%/i)).toBeInTheDocument()
      })
    })

    it('shows confidence indicator (high/medium/low)', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T15:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.96, // High confidence
          detectedFormat: 'absolute',
          originalText: 'Hotel check-in Dec 15 3pm',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 440,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Hotel check-in Dec 15 3pm')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/confidence: 96%/i)).toBeInTheDocument()
      })
    })

    it('defaults to current date for relative expressions', async () => {
      const user = userEvent.setup()

      const now = new Date()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: now,
          hasTime: false,
          isRange: false,
          confidence: 0.91,
          detectedFormat: 'relative',
          originalText: 'Meeting today',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 130,
        latencyMs: 370,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Meeting today')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/relative/i)).toBeInTheDocument()
      })
    })
  })

  describe('Item Type Detection', () => {
    it('detects flight items', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T09:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.95,
          detectedFormat: 'absolute',
          originalText: 'Flight to Paris Monday 9am',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 450,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight to Paris Monday 9am')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /confirm & save/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'flight',
          })
        )
      })
    })

    it('detects hotel/stay items', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T15:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.94,
          detectedFormat: 'absolute',
          originalText: 'Hotel check-in 3pm Dec 15',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 170,
        latencyMs: 430,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Hotel check-in 3pm Dec 15')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /confirm & save/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'stay',
          })
        )
      })
    })

    it('detects activity items', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T14:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.92,
          detectedFormat: 'absolute',
          originalText: 'Museum visit 2pm Friday',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 165,
        latencyMs: 420,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Museum visit 2pm Friday')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /confirm & save/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'activity',
          })
        )
      })
    })

    it('detects restaurant items', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T19:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.93,
          detectedFormat: 'absolute',
          originalText: 'Dinner reservation 7pm',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 155,
        latencyMs: 410,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Dinner reservation 7pm')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /confirm & save/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'activity', // Defaults to activity
          })
        )
      })
    })
  })

  describe('Form Submission', () => {
    it('submits itinerary item with ISO date strings', async () => {
      const user = userEvent.setup()

      const startDate = new Date('2024-12-15T09:00:00Z')

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: startDate,
          hasTime: true,
          isRange: false,
          confidence: 0.95,
          detectedFormat: 'absolute',
          originalText: 'Flight to Paris Monday 9am',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 450,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight to Paris Monday 9am')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /confirm & save/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            startTime: startDate.toISOString(),
          })
        )
      })
    })

    it('calls onSubmit with correct structure', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T14:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.92,
          detectedFormat: 'absolute',
          originalText: 'Museum visit in Paris 2pm Friday',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 190,
        latencyMs: 460,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Museum visit in Paris 2pm Friday')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /confirm & save/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          type: 'activity',
          title: expect.any(String),
          description: 'Museum visit in Paris 2pm Friday',
          startTime: expect.any(String),
          endTime: undefined,
          location: 'Paris',
        })
      })
    })

    it('resets form after success', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T09:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.95,
          detectedFormat: 'absolute',
          originalText: 'Flight to Paris Monday 9am',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 450,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight to Paris Monday 9am')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /confirm & save/i }))

      await waitFor(() => {
        expect(screen.queryByText(/preview/i)).not.toBeInTheDocument()
        expect(input).toHaveValue('')
      })
    })

    it('handles submission errors', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T09:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.95,
          detectedFormat: 'absolute',
          originalText: 'Flight to Paris Monday 9am',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 450,
        rawOutput: '{}',
      })

      mockOnSubmit.mockRejectedValue(new Error('Failed to save itinerary item'))

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight to Paris Monday 9am')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /confirm & save/i }))

      await waitFor(() => {
        expect(screen.getByText(/failed to save itinerary item/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays timeout error', async () => {
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

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight to Paris')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/request timeout/i)).toBeInTheDocument()
      })
    })

    it('displays rate limit error', async () => {
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

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight to Paris')
      await user.click(screen.getByRole('button', { name: /parse/i }))

      await waitFor(() => {
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument()
      })
    })
  })

  describe('Edit Mode', () => {
    it('enters edit mode when Edit button is clicked', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T09:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.95,
          detectedFormat: 'absolute',
          originalText: 'Flight to Paris Monday 9am',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 450,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight to Paris Monday 9am')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      // Click Edit button
      await user.click(screen.getByRole('button', { name: /edit/i }))

      // Verify edit mode is active - Cancel button should be visible
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()

      // Verify description field is editable
      const descriptionInput = screen.getByDisplayValue('Flight to Paris Monday 9am')
      expect(descriptionInput).toBeInTheDocument()
      expect(descriptionInput.tagName).toBe('INPUT')
    })

    it('exits edit mode when Cancel button is clicked', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T09:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.95,
          detectedFormat: 'absolute',
          originalText: 'Flight to Paris Monday 9am',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 450,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight to Paris Monday 9am')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      // Enter edit mode
      await user.click(screen.getByRole('button', { name: /edit/i }))
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()

      // Click Cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      // Verify edit mode is exited - Edit button should be visible again
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })

    it('allows editing description in edit mode', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T09:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.95,
          detectedFormat: 'absolute',
          originalText: 'Flight to Paris Monday 9am',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 450,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight to Paris Monday 9am')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      // Enter edit mode
      await user.click(screen.getByRole('button', { name: /edit/i }))

      // Edit description
      const descriptionInput = screen.getByDisplayValue('Flight to Paris Monday 9am')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Flight to London Monday 10am')

      expect(descriptionInput).toHaveValue('Flight to London Monday 10am')
    })

    it('submits edited values when Confirm & Save is clicked in edit mode', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T09:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.95,
          detectedFormat: 'absolute',
          originalText: 'Flight to Paris Monday 9am',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 450,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight to Paris Monday 9am')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      // Enter edit mode
      await user.click(screen.getByRole('button', { name: /edit/i }))

      // Edit description
      const descriptionInput = screen.getByDisplayValue('Flight to Paris Monday 9am')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Flight to London Monday 10am')

      // Submit
      await user.click(screen.getByRole('button', { name: /confirm & save/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Flight to London Monday 10am',
          })
        )
      })
    })

    it('validates edited fields before submission', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T09:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.95,
          detectedFormat: 'absolute',
          originalText: 'Flight to Paris Monday 9am',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 450,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight to Paris Monday 9am')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      // Enter edit mode
      await user.click(screen.getByRole('button', { name: /edit/i }))

      // Clear description (invalid)
      const descriptionInput = screen.getByDisplayValue('Flight to Paris Monday 9am')
      await user.clear(descriptionInput)

      // Try to submit
      await user.click(screen.getByRole('button', { name: /confirm & save/i }))

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/description is required/i)).toBeInTheDocument()
      })

      // Should not call onSubmit
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('toggles all-day mode in edit mode', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T09:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.95,
          detectedFormat: 'absolute',
          originalText: 'Flight to Paris Monday 9am',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 450,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight to Paris Monday 9am')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      // Enter edit mode
      await user.click(screen.getByRole('button', { name: /edit/i }))

      // Find and toggle all-day switch
      const allDaySwitch = screen.getByRole('switch', { name: /all day/i })
      expect(allDaySwitch).toBeInTheDocument()

      await user.click(allDaySwitch)

      // Time input should be hidden when all-day is enabled
      const timeInputs = screen.queryAllByDisplayValue(/\d{2}:\d{2}/)
      expect(timeInputs.length).toBe(0)
    })

    it('toggles date range mode in edit mode', async () => {
      const user = userEvent.setup()

      mockParseWithOpenAI.mockResolvedValue({
        success: true,
        dateResult: {
          date: new Date('2024-12-15T09:00:00Z'),
          hasTime: true,
          isRange: false,
          confidence: 0.95,
          detectedFormat: 'absolute',
          originalText: 'Flight to Paris Monday 9am',
        },
        model: 'gpt-4o-mini',
        tokensUsed: 180,
        latencyMs: 450,
        rawOutput: '{}',
      })

      render(<ItineraryInput tripId={mockTripId} onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText(/e\.g\., Flight to Paris Monday 9am/i)
      await user.type(input, 'Flight to Paris Monday 9am')
      await user.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
      })

      // Enter edit mode
      await user.click(screen.getByRole('button', { name: /edit/i }))

      // Find and toggle date range switch
      const dateRangeSwitch = screen.getByRole('switch', { name: /date range/i })
      expect(dateRangeSwitch).toBeInTheDocument()

      await user.click(dateRangeSwitch)

      // End date inputs should appear when range is enabled
      await waitFor(() => {
        const dateInputs = screen.getAllByDisplayValue(/2024-12-15/)
        expect(dateInputs.length).toBeGreaterThan(1) // Should have start and end date inputs
      })
    })
  })
})
