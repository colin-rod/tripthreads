/**
 * Component Tests: ItineraryItemDialog
 *
 * Tests the dialog component for viewing, creating, and editing itinerary items.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItineraryItemDialog } from '@/components/features/itinerary/ItineraryItemDialog'
import type { ItineraryItemWithParticipants } from '@/../../packages/shared/types/itinerary'

// Mock server actions
vi.mock('@/app/actions/itinerary', () => ({
  createItineraryItem: vi.fn(),
  updateItineraryItem: vi.fn(),
}))

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

const mockItem: ItineraryItemWithParticipants = {
  id: 'item-123',
  trip_id: 'trip-123',
  type: 'transport',
  title: 'Flight to Lisbon',
  description: 'Morning flight',
  notes: 'Bring passport',
  links: [{ title: 'Booking', url: 'https://example.com/booking' }],
  start_time: '2025-06-15T08:00:00Z',
  end_time: '2025-06-15T11:00:00Z',
  is_all_day: false,
  location: 'Lisbon Airport',
  metadata: { flight_number: 'TP123' },
  created_by: 'user-123',
  created_at: '2025-06-01T10:00:00Z',
  updated_at: '2025-06-01T10:00:00Z',
  participants: [],
}

const mockParticipants = [
  { id: 'user-1', full_name: 'Alice Smith' },
  { id: 'user-2', full_name: 'Bob Jones' },
]

describe('ItineraryItemDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('View Mode', () => {
    it('should display item details in read-only mode', () => {
      render(
        <ItineraryItemDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="view"
          item={mockItem}
          tripId="trip-123"
          tripParticipants={mockParticipants}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('Itinerary Item Details')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Flight to Lisbon')).toBeDisabled()
      expect(screen.getByDisplayValue('Morning flight')).toBeDisabled()
      expect(screen.getByDisplayValue('Bring passport')).toBeDisabled()
      expect(screen.getByDisplayValue('Lisbon Airport')).toBeDisabled()
    })

    it('should display links in read-only mode', () => {
      render(
        <ItineraryItemDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="view"
          item={mockItem}
          tripId="trip-123"
          tripParticipants={mockParticipants}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('Booking')).toBeInTheDocument()
      expect(screen.getByText('https://example.com/booking')).toBeInTheDocument()
    })

    it('should only show Close button in view mode', () => {
      render(
        <ItineraryItemDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="view"
          item={mockItem}
          tripId="trip-123"
          tripParticipants={mockParticipants}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument()
    })
  })

  describe('Create Mode', () => {
    it('should display empty form for creating new item', () => {
      render(
        <ItineraryItemDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          tripId="trip-123"
          tripParticipants={mockParticipants}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('Add Itinerary Item')).toBeInTheDocument()
      expect(screen.getByLabelText(/title/i)).toHaveValue('')
      expect(screen.getByLabelText(/description/i)).toHaveValue('')
    })

    it('should allow filling out form fields', async () => {
      const user = userEvent.setup()

      render(
        <ItineraryItemDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          tripId="trip-123"
          tripParticipants={mockParticipants}
          onSuccess={mockOnSuccess}
        />
      )

      const titleInput = screen.getByLabelText(/title/i)
      const descriptionInput = screen.getByLabelText(/description/i)
      const notesInput = screen.getByLabelText(/notes/i)
      const locationInput = screen.getByLabelText(/location/i)

      await user.type(titleInput, 'Museum Visit')
      await user.type(descriptionInput, 'National Museum of Art')
      await user.type(notesInput, 'Student discount available')
      await user.type(locationInput, 'Downtown Lisbon')

      expect(titleInput).toHaveValue('Museum Visit')
      expect(descriptionInput).toHaveValue('National Museum of Art')
      expect(notesInput).toHaveValue('Student discount available')
      expect(locationInput).toHaveValue('Downtown Lisbon')
    })

    it('should allow adding and removing links', async () => {
      const user = userEvent.setup()

      render(
        <ItineraryItemDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          tripId="trip-123"
          tripParticipants={mockParticipants}
          onSuccess={mockOnSuccess}
        />
      )

      // Add a link
      const linkTitleInput = screen.getByPlaceholderText('Link title')
      const linkUrlInput = screen.getByPlaceholderText('URL')
      const addButton = screen.getByRole('button', { name: '' }) // Plus icon button

      await user.type(linkTitleInput, 'Museum Website')
      await user.type(linkUrlInput, 'https://museum.example.com')
      await user.click(addButton)

      // Verify link was added
      expect(screen.getByText('Museum Website')).toBeInTheDocument()
      expect(screen.getByText('https://museum.example.com')).toBeInTheDocument()

      // Remove link
      const removeButton = screen.getByRole('button', { name: '' }) // X icon button
      await user.click(removeButton)

      // Verify link was removed
      expect(screen.queryByText('Museum Website')).not.toBeInTheDocument()
    })

    it('should toggle all-day switch', async () => {
      const user = userEvent.setup()

      render(
        <ItineraryItemDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          tripId="trip-123"
          tripParticipants={mockParticipants}
          onSuccess={mockOnSuccess}
        />
      )

      const allDaySwitch = screen.getByRole('switch')
      expect(allDaySwitch).not.toBeChecked()

      await user.click(allDaySwitch)
      expect(allDaySwitch).toBeChecked()

      // Labels should change
      expect(screen.getByText('Start Date *')).toBeInTheDocument()
      expect(screen.getByText('End Date')).toBeInTheDocument()
    })

    it('should validate required fields', async () => {
      const user = userEvent.setup()

      render(
        <ItineraryItemDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          tripId="trip-123"
          tripParticipants={mockParticipants}
          onSuccess={mockOnSuccess}
        />
      )

      const createButton = screen.getByRole('button', { name: /create/i })
      await user.click(createButton)

      // Should show validation error for required title
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument()
      })
    })

    it('should call createItineraryItem on submit', async () => {
      const user = userEvent.setup()
      const { createItineraryItem } = await import('@/app/actions/itinerary')
      vi.mocked(createItineraryItem).mockResolvedValue({
        success: true,
        item: mockItem,
      })

      render(
        <ItineraryItemDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          tripId="trip-123"
          tripParticipants={mockParticipants}
          onSuccess={mockOnSuccess}
        />
      )

      // Fill required fields
      await user.type(screen.getByLabelText(/title/i), 'New Activity')
      await user.type(screen.getByLabelText(/start date & time/i), '2025-06-15T10:00')

      // Submit
      const createButton = screen.getByRole('button', { name: /create/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(createItineraryItem).toHaveBeenCalledWith(
          expect.objectContaining({
            tripId: 'trip-123',
            title: 'New Activity',
            type: 'activity',
          })
        )
        expect(mockOnSuccess).toHaveBeenCalled()
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('Edit Mode', () => {
    it('should display form pre-filled with item data', () => {
      render(
        <ItineraryItemDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="edit"
          item={mockItem}
          tripId="trip-123"
          tripParticipants={mockParticipants}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('Edit Itinerary Item')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Flight to Lisbon')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Morning flight')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Bring passport')).toBeInTheDocument()
    })

    it('should allow editing fields', async () => {
      const user = userEvent.setup()

      render(
        <ItineraryItemDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="edit"
          item={mockItem}
          tripId="trip-123"
          tripParticipants={mockParticipants}
          onSuccess={mockOnSuccess}
        />
      )

      const titleInput = screen.getByDisplayValue('Flight to Lisbon')
      await user.clear(titleInput)
      await user.type(titleInput, 'Flight to Porto')

      expect(titleInput).toHaveValue('Flight to Porto')
    })

    it('should call updateItineraryItem on submit', async () => {
      const user = userEvent.setup()
      const { updateItineraryItem } = await import('@/app/actions/itinerary')
      vi.mocked(updateItineraryItem).mockResolvedValue({
        success: true,
        item: { ...mockItem, title: 'Updated Title' },
      })

      render(
        <ItineraryItemDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="edit"
          item={mockItem}
          tripId="trip-123"
          tripParticipants={mockParticipants}
          onSuccess={mockOnSuccess}
        />
      )

      // Edit title
      const titleInput = screen.getByDisplayValue('Flight to Lisbon')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Title')

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(updateItineraryItem).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'item-123',
            title: 'Updated Title',
          })
        )
        expect(mockOnSuccess).toHaveBeenCalled()
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('Type Selection', () => {
    it('should allow selecting different item types', async () => {
      const user = userEvent.setup()

      render(
        <ItineraryItemDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          tripId="trip-123"
          tripParticipants={mockParticipants}
          onSuccess={mockOnSuccess}
        />
      )

      // Open type selector
      const typeButton = screen.getByRole('combobox')
      await user.click(typeButton)

      // All types should be available
      expect(screen.getByText('Transport')).toBeInTheDocument()
      expect(screen.getByText('Accommodation')).toBeInTheDocument()
      expect(screen.getByText('Dining')).toBeInTheDocument()
      expect(screen.getByText('Activity')).toBeInTheDocument()
      expect(screen.getByText('Sightseeing')).toBeInTheDocument()
      expect(screen.getByText('General')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error toast on create failure', async () => {
      const user = userEvent.setup()
      const { createItineraryItem } = await import('@/app/actions/itinerary')
      vi.mocked(createItineraryItem).mockResolvedValue({
        success: false,
        error: 'Failed to create item',
      })

      render(
        <ItineraryItemDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          tripId="trip-123"
          tripParticipants={mockParticipants}
          onSuccess={mockOnSuccess}
        />
      )

      // Fill and submit
      await user.type(screen.getByLabelText(/title/i), 'New Activity')
      await user.type(screen.getByLabelText(/start date & time/i), '2025-06-15T10:00')
      await user.click(screen.getByRole('button', { name: /create/i }))

      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled()
        expect(mockOnOpenChange).not.toHaveBeenCalledWith(false)
      })
    })
  })
})
