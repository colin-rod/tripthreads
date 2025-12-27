/**
 * ParsedItemModal Component Tests
 *
 * Tests for the enhanced parsed items confirmation modal with metadata fields
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ParsedItemModal } from '@/components/features/chat/ParsedItemModal'
import { createItineraryItem } from '@/app/actions/itinerary'

// Mock server actions
jest.mock('@/app/actions/itinerary')
jest.mock('@/app/actions/expenses')

const mockCreateItineraryItem = createItineraryItem as jest.MockedFunction<
  typeof createItineraryItem
>

describe('ParsedItemModal - Itinerary Metadata', () => {
  const mockTripId = 'trip-123'
  const mockOnClose = jest.fn()
  const mockOnConfirm = jest.fn()

  const baseParsedData = {
    command: '@TripThread add flight to Boston',
    success: true,
    hasExpense: false,
    hasItinerary: true,
    itinerary: {
      type: 'flight' as const,
      title: 'Flight to Boston',
      description: '',
      startDate: '2025-01-15T14:30',
      endDate: '2025-01-15T16:30',
      location: 'Boston',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateItineraryItem.mockResolvedValue({ success: true, data: { id: 'item-123' } } as any)
  })

  describe('Accordion UI', () => {
    it('renders two accordion sections for optional fields', () => {
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      expect(screen.getByText('Additional Details (Optional)')).toBeInTheDocument()
      expect(screen.getByText('Flight Details (Optional)')).toBeInTheDocument()
    })

    it('starts with accordions collapsed by default', () => {
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      // Notes field should not be visible when accordion is collapsed
      expect(screen.queryByPlaceholderText('Additional notes or reminders...')).not.toBeVisible()
    })

    it('expands accordion on click and shows content', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const additionalDetailsButton = screen.getByText('Additional Details (Optional)')
      await user.click(additionalDetailsButton)

      // Notes field should be visible after expanding
      expect(screen.getByPlaceholderText('Additional notes or reminders...')).toBeVisible()
    })

    it('preserves field values when toggling accordion', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      // Expand accordion
      const additionalDetailsButton = screen.getByText('Additional Details (Optional)')
      await user.click(additionalDetailsButton)

      // Type in notes
      const notesField = screen.getByPlaceholderText('Additional notes or reminders...')
      await user.type(notesField, 'Test notes')

      // Collapse accordion
      await user.click(additionalDetailsButton)

      // Expand again
      await user.click(additionalDetailsButton)

      // Value should be preserved
      expect(notesField).toHaveValue('Test notes')
    })
  })

  describe('All-Day Toggle', () => {
    it('renders all-day checkbox', () => {
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      expect(screen.getByRole('checkbox', { name: /all-day event/i })).toBeInTheDocument()
    })

    it('changes datetime-local to date input when checked', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const startDateInput = screen.getByLabelText(/start date\/time/i) as HTMLInputElement
      expect(startDateInput.type).toBe('datetime-local')

      const allDayCheckbox = screen.getByRole('checkbox', { name: /all-day event/i })
      await user.click(allDayCheckbox)

      expect(startDateInput.type).toBe('date')
    })

    it('changes date to datetime-local input when unchecked', async () => {
      const user = userEvent.setup()
      const parsedDataWithAllDay = {
        ...baseParsedData,
        itinerary: {
          ...baseParsedData.itinerary!,
          isAllDay: true,
        },
      }

      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={parsedDataWithAllDay}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const startDateInput = screen.getByLabelText(/start date\/time/i) as HTMLInputElement
      expect(startDateInput.type).toBe('date')

      const allDayCheckbox = screen.getByRole('checkbox', { name: /all-day event/i })
      await user.click(allDayCheckbox)

      expect(startDateInput.type).toBe('datetime-local')
    })

    it('submits isAllDay: true when checked', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const allDayCheckbox = screen.getByRole('checkbox', { name: /all-day event/i })
      await user.click(allDayCheckbox)

      const confirmButton = screen.getByRole('button', { name: /confirm & save/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockCreateItineraryItem).toHaveBeenCalledWith(
          expect.objectContaining({
            isAllDay: true,
          })
        )
      })
    })
  })

  describe('Notes Field', () => {
    it('renders notes textarea in Additional Details accordion', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const additionalDetailsButton = screen.getByText('Additional Details (Optional)')
      await user.click(additionalDetailsButton)

      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Additional notes or reminders...')).toBeInTheDocument()
    })

    it('updates notes state on input change', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const additionalDetailsButton = screen.getByText('Additional Details (Optional)')
      await user.click(additionalDetailsButton)

      const notesField = screen.getByPlaceholderText('Additional notes or reminders...')
      await user.type(notesField, 'Remember to check-in online')

      expect(notesField).toHaveValue('Remember to check-in online')
    })

    it('disables textarea when create checkbox is unchecked', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const additionalDetailsButton = screen.getByText('Additional Details (Optional)')
      await user.click(additionalDetailsButton)

      const createCheckbox = screen.getByRole('checkbox', { name: /create this itinerary item/i })
      await user.click(createCheckbox)

      const notesField = screen.getByPlaceholderText('Additional notes or reminders...')
      expect(notesField).toBeDisabled()
    })

    it('submits notes value with itinerary item', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const additionalDetailsButton = screen.getByText('Additional Details (Optional)')
      await user.click(additionalDetailsButton)

      const notesField = screen.getByPlaceholderText('Additional notes or reminders...')
      await user.type(notesField, 'Bring passport')

      const confirmButton = screen.getByRole('button', { name: /confirm & save/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockCreateItineraryItem).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: 'Bring passport',
          })
        )
      })
    })
  })

  describe('Links Management', () => {
    it('displays existing links from parsed data', async () => {
      const user = userEvent.setup()
      const parsedDataWithLinks = {
        ...baseParsedData,
        itinerary: {
          ...baseParsedData.itinerary!,
          links: [{ title: 'Booking Confirmation', url: 'https://example.com/booking' }],
        },
      }

      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={parsedDataWithLinks}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const additionalDetailsButton = screen.getByText('Additional Details (Optional)')
      await user.click(additionalDetailsButton)

      expect(screen.getByText('Booking Confirmation')).toBeInTheDocument()
      expect(screen.getByText('https://example.com/booking')).toBeInTheDocument()
    })

    it('shows link title and URL', async () => {
      const user = userEvent.setup()
      const parsedDataWithLinks = {
        ...baseParsedData,
        itinerary: {
          ...baseParsedData.itinerary!,
          links: [{ title: 'Flight Details', url: 'https://airline.com/details' }],
        },
      }

      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={parsedDataWithLinks}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const additionalDetailsButton = screen.getByText('Additional Details (Optional)')
      await user.click(additionalDetailsButton)

      expect(screen.getByText('Flight Details')).toBeInTheDocument()
      expect(screen.getByText('https://airline.com/details')).toBeInTheDocument()
    })

    it('adds new link when both title and URL provided', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const additionalDetailsButton = screen.getByText('Additional Details (Optional)')
      await user.click(additionalDetailsButton)

      const titleInput = screen.getByPlaceholderText('Link title')
      const urlInput = screen.getByPlaceholderText('URL')
      await user.type(titleInput, 'Ticket')
      await user.type(urlInput, 'https://example.com/ticket')

      const addButton = screen.getByRole('button', { name: /add link/i })
      await user.click(addButton)

      expect(screen.getByText('Ticket')).toBeInTheDocument()
      expect(screen.getByText('https://example.com/ticket')).toBeInTheDocument()
    })

    it('disables add button when title or URL is empty', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const additionalDetailsButton = screen.getByText('Additional Details (Optional)')
      await user.click(additionalDetailsButton)

      const addButton = screen.getByRole('button', { name: /add link/i })
      expect(addButton).toBeDisabled()

      const titleInput = screen.getByPlaceholderText('Link title')
      await user.type(titleInput, 'Ticket')
      expect(addButton).toBeDisabled()
    })

    it('removes link when delete button clicked', async () => {
      const user = userEvent.setup()
      const parsedDataWithLinks = {
        ...baseParsedData,
        itinerary: {
          ...baseParsedData.itinerary!,
          links: [{ title: 'Booking', url: 'https://example.com/booking' }],
        },
      }

      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={parsedDataWithLinks}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const additionalDetailsButton = screen.getByText('Additional Details (Optional)')
      await user.click(additionalDetailsButton)

      expect(screen.getByText('Booking')).toBeInTheDocument()

      const deleteButton = screen.getByRole('button', { name: /delete link/i })
      await user.click(deleteButton)

      expect(screen.queryByText('Booking')).not.toBeInTheDocument()
    })

    it('submits links array with itinerary item', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const additionalDetailsButton = screen.getByText('Additional Details (Optional)')
      await user.click(additionalDetailsButton)

      const titleInput = screen.getByPlaceholderText('Link title')
      const urlInput = screen.getByPlaceholderText('URL')
      await user.type(titleInput, 'Confirmation')
      await user.type(urlInput, 'https://example.com/confirm')

      const addButton = screen.getByRole('button', { name: /add link/i })
      await user.click(addButton)

      const confirmButton = screen.getByRole('button', { name: /confirm & save/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockCreateItineraryItem).toHaveBeenCalledWith(
          expect.objectContaining({
            links: [{ title: 'Confirmation', url: 'https://example.com/confirm' }],
          })
        )
      })
    })

    it('clears input fields after adding link', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const additionalDetailsButton = screen.getByText('Additional Details (Optional)')
      await user.click(additionalDetailsButton)

      const titleInput = screen.getByPlaceholderText('Link title')
      const urlInput = screen.getByPlaceholderText('URL')
      await user.type(titleInput, 'Link 1')
      await user.type(urlInput, 'https://example.com/1')

      const addButton = screen.getByRole('button', { name: /add link/i })
      await user.click(addButton)

      expect(titleInput).toHaveValue('')
      expect(urlInput).toHaveValue('')
    })
  })

  describe('Type-Specific Metadata', () => {
    it('shows TransportMetadataFields for flight type', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const flightDetailsButton = screen.getByText('Flight Details (Optional)')
      await user.click(flightDetailsButton)

      // Check for transport-specific fields
      expect(screen.getByLabelText(/transport type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/flight number/i)).toBeInTheDocument()
    })

    it('shows AccommodationMetadataFields for stay type', async () => {
      const user = userEvent.setup()
      const stayParsedData = {
        ...baseParsedData,
        itinerary: {
          ...baseParsedData.itinerary!,
          type: 'stay' as const,
        },
      }

      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={stayParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const accommodationDetailsButton = screen.getByText('Accommodation Details (Optional)')
      await user.click(accommodationDetailsButton)

      // Check for accommodation-specific fields
      expect(screen.getByLabelText(/accommodation type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/check-in time/i)).toBeInTheDocument()
    })

    it('shows ActivityMetadataFields for activity type', async () => {
      const user = userEvent.setup()
      const activityParsedData = {
        ...baseParsedData,
        itinerary: {
          ...baseParsedData.itinerary!,
          type: 'activity' as const,
        },
      }

      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={activityParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const activityDetailsButton = screen.getByText('Activity Details (Optional)')
      await user.click(activityDetailsButton)

      // Check for activity-specific fields
      expect(screen.getByLabelText(/activity type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/duration/i)).toBeInTheDocument()
    })

    it('updates accordion title based on selected type', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      expect(screen.getByText('Flight Details (Optional)')).toBeInTheDocument()

      // Change type to Stay
      const typeSelect = screen.getByDisplayValue('Flight')
      await user.click(typeSelect)
      const stayOption = screen.getByRole('option', { name: /stay/i })
      await user.click(stayOption)

      expect(screen.getByText('Accommodation Details (Optional)')).toBeInTheDocument()
    })

    it('clears metadata when type changes from flight to stay', async () => {
      const user = userEvent.setup()
      const parsedDataWithMetadata = {
        ...baseParsedData,
        itinerary: {
          ...baseParsedData.itinerary!,
          metadata: {
            transport_type: 'flight',
            flight_number: 'AA123',
          },
        },
      }

      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={parsedDataWithMetadata}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      // Expand flight details and verify metadata
      const flightDetailsButton = screen.getByText('Flight Details (Optional)')
      await user.click(flightDetailsButton)

      const flightNumberInput = screen.getByLabelText(/flight number/i) as HTMLInputElement
      expect(flightNumberInput.value).toBe('AA123')

      // Change type to Stay
      const typeSelect = screen.getByDisplayValue('Flight')
      await user.click(typeSelect)
      const stayOption = screen.getByRole('option', { name: /stay/i })
      await user.click(stayOption)

      // Expand accommodation details and verify metadata is cleared
      const accommodationDetailsButton = screen.getByText('Accommodation Details (Optional)')
      await user.click(accommodationDetailsButton)

      const confirmationInput = screen.getByLabelText(/confirmation number/i) as HTMLInputElement
      expect(confirmationInput.value).toBe('')
    })

    it('disables metadata fields when create checkbox unchecked', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const createCheckbox = screen.getByRole('checkbox', { name: /create this itinerary item/i })
      await user.click(createCheckbox)

      const flightDetailsButton = screen.getByText('Flight Details (Optional)')
      await user.click(flightDetailsButton)

      const flightNumberInput = screen.getByLabelText(/flight number/i)
      expect(flightNumberInput).toBeDisabled()
    })
  })

  describe('Server Action Integration', () => {
    it('calls action with all new fields together', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      // Add notes
      const additionalDetailsButton = screen.getByText('Additional Details (Optional)')
      await user.click(additionalDetailsButton)
      const notesField = screen.getByPlaceholderText('Additional notes or reminders...')
      await user.type(notesField, 'Test notes')

      // Add link
      const titleInput = screen.getByPlaceholderText('Link title')
      const urlInput = screen.getByPlaceholderText('URL')
      await user.type(titleInput, 'Booking')
      await user.type(urlInput, 'https://example.com/booking')
      const addButton = screen.getByRole('button', { name: /add link/i })
      await user.click(addButton)

      // Toggle all-day
      const allDayCheckbox = screen.getByRole('checkbox', { name: /all-day event/i })
      await user.click(allDayCheckbox)

      // Add metadata
      const flightDetailsButton = screen.getByText('Flight Details (Optional)')
      await user.click(flightDetailsButton)
      const flightNumberInput = screen.getByLabelText(/flight number/i)
      await user.type(flightNumberInput, 'AA123')

      const confirmButton = screen.getByRole('button', { name: /confirm & save/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockCreateItineraryItem).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: 'Test notes',
            links: [{ title: 'Booking', url: 'https://example.com/booking' }],
            isAllDay: true,
            metadata: expect.objectContaining({
              flight_number: 'AA123',
            }),
          })
        )
      })
    })

    it('omits optional fields when empty', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const confirmButton = screen.getByRole('button', { name: /confirm & save/i })
      await user.click(confirmButton)

      await waitFor(() => {
        const call = mockCreateItineraryItem.mock.calls[0][0]
        expect(call.notes).toBeUndefined()
        expect(call.links).toBeUndefined()
      })
    })

    it('handles successful creation with metadata', async () => {
      const user = userEvent.setup()
      render(
        <ParsedItemModal
          open={true}
          onClose={mockOnClose}
          parsedData={baseParsedData}
          tripId={mockTripId}
          onConfirm={mockOnConfirm}
          currentIndex={0}
          totalCommands={1}
        />
      )

      const additionalDetailsButton = screen.getByText('Additional Details (Optional)')
      await user.click(additionalDetailsButton)
      const notesField = screen.getByPlaceholderText('Additional notes or reminders...')
      await user.type(notesField, 'Test')

      const confirmButton = screen.getByRole('button', { name: /confirm & save/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled()
      })
    })
  })
})
