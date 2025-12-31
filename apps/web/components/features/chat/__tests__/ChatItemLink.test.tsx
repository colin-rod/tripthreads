import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatItemLink } from '../ChatItemLink'

// Mock the modal components
jest.mock('../ChatItineraryItemModal', () => ({
  ChatItineraryItemModal: ({ open, itemId }: { open: boolean; itemId: string }) => (
    <div data-testid="itinerary-modal">{open ? `Itinerary Modal: ${itemId}` : null}</div>
  ),
}))

jest.mock('../ChatExpenseModal', () => ({
  ChatExpenseModal: ({ open, itemId }: { open: boolean; itemId: string }) => (
    <div data-testid="expense-modal">{open ? `Expense Modal: ${itemId}` : null}</div>
  ),
}))

describe('ChatItemLink', () => {
  const mockTripId = 'trip-123'
  const mockParticipants = [
    { id: 'user-1', full_name: 'John Doe', email: 'john@example.com', avatar_url: null },
  ]

  it('renders link with correct text and icon', () => {
    render(
      <ChatItemLink
        itemId="item-123"
        itemType="itinerary"
        text="Added flight: Flight to Boston"
        tripId={mockTripId}
        tripParticipants={mockParticipants}
      />
    )

    const link = screen.getByRole('button', { name: /Added flight: Flight to Boston/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveClass('text-primary')
    expect(link).toHaveClass('underline')

    // Check for external link icon (svg)
    const svg = link.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('opens itinerary modal on click for itinerary items', async () => {
    const user = userEvent.setup()

    render(
      <ChatItemLink
        itemId="item-123"
        itemType="itinerary"
        itineraryType="transport"
        text="Added flight: Flight to Boston"
        tripId={mockTripId}
        tripParticipants={mockParticipants}
      />
    )

    const link = screen.getByRole('button', { name: /Added flight: Flight to Boston/i })

    // Modal should not be visible initially
    expect(screen.queryByText(/Itinerary Modal: item-123/)).not.toBeInTheDocument()

    // Click the link
    await user.click(link)

    // Modal should now be visible
    expect(screen.getByText(/Itinerary Modal: item-123/)).toBeInTheDocument()
  })

  it('opens expense modal on click for expense items', async () => {
    const user = userEvent.setup()

    render(
      <ChatItemLink
        itemId="expense-123"
        itemType="expense"
        text="Added expense: Dinner - €60.00"
        tripId={mockTripId}
        tripParticipants={mockParticipants}
      />
    )

    const link = screen.getByRole('button', { name: /Added expense: Dinner - €60.00/i })

    // Modal should not be visible initially
    expect(screen.queryByText(/Expense Modal: expense-123/)).not.toBeInTheDocument()

    // Click the link
    await user.click(link)

    // Modal should now be visible
    expect(screen.getByText(/Expense Modal: expense-123/)).toBeInTheDocument()
  })

  it('applies correct hover styles', () => {
    render(
      <ChatItemLink
        itemId="item-123"
        itemType="itinerary"
        text="Added flight: Test"
        tripId={mockTripId}
        tripParticipants={mockParticipants}
      />
    )

    const link = screen.getByRole('button', { name: /Added flight: Test/i })

    // Check for hover transition classes
    expect(link).toHaveClass('hover:text-primary/80')
    expect(link).toHaveClass('hover:underline-offset-4')
    expect(link).toHaveClass('transition-all')
    expect(link).toHaveClass('cursor-pointer')
  })
})
