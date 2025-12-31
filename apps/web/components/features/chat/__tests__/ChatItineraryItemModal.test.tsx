import { render, screen, waitFor } from '@testing-library/react'
import { ChatItineraryItemModal } from '../ChatItineraryItemModal'
import { getItineraryItemForChat } from '@/app/actions/get-chat-items'

// Mock server action
jest.mock('@/app/actions/get-chat-items', () => ({
  getItineraryItemForChat: jest.fn(),
}))

// Mock ItineraryItemDialog
jest.mock('@/components/features/itinerary/ItineraryItemDialog', () => ({
  ItineraryItemDialog: ({ open, item }: { open: boolean; item: any }) => (
    <div data-testid="itinerary-dialog">{open ? `Itinerary: ${item?.title}` : null}</div>
  ),
}))

// Mock ItemErrorModal
jest.mock('../ItemErrorModal', () => ({
  ItemErrorModal: ({ open, errorType }: { open: boolean; errorType: string }) => (
    <div data-testid="error-modal">{open ? `Error: ${errorType}` : null}</div>
  ),
}))

describe('ChatItineraryItemModal', () => {
  const mockTripId = 'trip-123'
  const mockItemId = 'item-123'
  const mockTripParticipants = [
    { id: 'user-1', full_name: 'John Doe', email: 'john@example.com', avatar_url: null },
  ]

  const mockItem = {
    id: 'item-123',
    trip_id: 'trip-123',
    item_type: 'transport',
    title: 'Flight to Boston',
    description: 'Evening flight',
    start_date: '2024-12-25',
    created_by_user: {
      id: 'user-1',
      full_name: 'John Doe',
      avatar_url: null,
    },
    itinerary_participants: [],
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('fetches item when opened', async () => {
    ;(getItineraryItemForChat as jest.Mock).mockResolvedValue({
      success: true,
      item: mockItem,
    })

    render(
      <ChatItineraryItemModal
        itemId={mockItemId}
        tripId={mockTripId}
        open={true}
        onClose={() => {}}
        tripParticipants={mockTripParticipants}
      />
    )

    // Wait for fetch to be called
    await waitFor(() => {
      expect(getItineraryItemForChat).toHaveBeenCalledWith(mockItemId, mockTripId)
    })
  })

  it('renders ItineraryItemDialog in view mode on success', async () => {
    ;(getItineraryItemForChat as jest.Mock).mockResolvedValue({
      success: true,
      item: mockItem,
    })

    render(
      <ChatItineraryItemModal
        itemId={mockItemId}
        tripId={mockTripId}
        open={true}
        onClose={() => {}}
        tripParticipants={mockTripParticipants}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('itinerary-dialog')).toBeInTheDocument()
      expect(screen.getByText(/Itinerary: Flight to Boston/)).toBeInTheDocument()
    })

    expect(getItineraryItemForChat).toHaveBeenCalledWith(mockItemId, mockTripId)
  })

  it('shows error modal on 404', async () => {
    ;(getItineraryItemForChat as jest.Mock).mockResolvedValue({
      success: false,
      error: 'not_found',
    })

    render(
      <ChatItineraryItemModal
        itemId={mockItemId}
        tripId={mockTripId}
        open={true}
        onClose={() => {}}
        tripParticipants={mockTripParticipants}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('error-modal')).toBeInTheDocument()
      expect(screen.getByText(/Error: not_found/)).toBeInTheDocument()
    })
  })

  it('shows error modal on permission denied', async () => {
    ;(getItineraryItemForChat as jest.Mock).mockResolvedValue({
      success: false,
      error: 'permission_denied',
    })

    render(
      <ChatItineraryItemModal
        itemId={mockItemId}
        tripId={mockTripId}
        open={true}
        onClose={() => {}}
        tripParticipants={mockTripParticipants}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('error-modal')).toBeInTheDocument()
      expect(screen.getByText(/Error: permission_denied/)).toBeInTheDocument()
    })
  })
})
