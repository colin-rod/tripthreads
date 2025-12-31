import { render, screen, waitFor } from '@testing-library/react'
import { ChatExpenseModal } from '../ChatExpenseModal'
import { getExpenseForChat } from '@/app/actions/get-chat-items'

// Mock server action
jest.mock('@/app/actions/get-chat-items', () => ({
  getExpenseForChat: jest.fn(),
}))

// Mock ItemErrorModal
jest.mock('../ItemErrorModal', () => ({
  ItemErrorModal: ({ open, errorType }: { open: boolean; errorType: string }) => (
    <div data-testid="error-modal">{open ? `Error: ${errorType}` : null}</div>
  ),
}))

describe('ChatExpenseModal', () => {
  const mockTripId = 'trip-123'
  const mockExpenseId = 'expense-123'

  const mockExpense = {
    id: 'expense-123',
    trip_id: 'trip-123',
    description: 'Dinner at Italian restaurant',
    amount: 6000,
    currency: 'EUR',
    date: '2024-12-25',
    category: 'dining',
    payer: 'user-1',
    payer_profile: {
      id: 'user-1',
      full_name: 'John Doe',
      avatar_url: null,
    },
    expense_participants: [
      {
        participant: {
          id: 'user-1',
          full_name: 'John Doe',
          avatar_url: null,
        },
        amount: 3000,
        percentage: 50,
      },
      {
        participant: {
          id: 'user-2',
          full_name: 'Jane Smith',
          avatar_url: 'https://example.com/jane.jpg',
        },
        amount: 3000,
        percentage: 50,
      },
    ],
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('fetches expense when opened', async () => {
    ;(getExpenseForChat as jest.Mock).mockResolvedValue({
      success: true,
      expense: mockExpense,
    })

    render(
      <ChatExpenseModal itemId={mockExpenseId} tripId={mockTripId} open={true} onClose={() => {}} />
    )

    // Wait for fetch to be called
    await waitFor(() => {
      expect(getExpenseForChat).toHaveBeenCalledWith(mockExpenseId, mockTripId)
    })
  })

  it('renders expense details on success', async () => {
    ;(getExpenseForChat as jest.Mock).mockResolvedValue({
      success: true,
      expense: mockExpense,
    })

    render(
      <ChatExpenseModal itemId={mockExpenseId} tripId={mockTripId} open={true} onClose={() => {}} />
    )

    await waitFor(() => {
      // Check title
      expect(screen.getByText('Dinner at Italian restaurant')).toBeInTheDocument()
    })

    // Check amount
    expect(screen.getByText(/EUR60\.00/)).toBeInTheDocument()

    // Check date
    expect(screen.getByText(/12\/25\/2024/)).toBeInTheDocument()

    // Check category
    expect(screen.getByText('dining')).toBeInTheDocument()

    // Check payer section header
    expect(screen.getByText('Paid By')).toBeInTheDocument()

    // Check participants (both John Doe and Jane Smith)
    expect(screen.getAllByText('John Doe')).toHaveLength(2) // Appears in payer and split
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()

    expect(getExpenseForChat).toHaveBeenCalledWith(mockExpenseId, mockTripId)
  })

  it('shows error modal on fetch failure', async () => {
    ;(getExpenseForChat as jest.Mock).mockResolvedValue({
      success: false,
      error: 'error',
    })

    render(
      <ChatExpenseModal itemId={mockExpenseId} tripId={mockTripId} open={true} onClose={() => {}} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('error-modal')).toBeInTheDocument()
      expect(screen.getByText(/Error: error/)).toBeInTheDocument()
    })
  })

  it('displays all expense fields correctly', async () => {
    const expenseWithAllFields = {
      ...mockExpense,
      category: 'transportation',
    }

    ;(getExpenseForChat as jest.Mock).mockResolvedValue({
      success: true,
      expense: expenseWithAllFields,
    })

    render(
      <ChatExpenseModal itemId={mockExpenseId} tripId={mockTripId} open={true} onClose={() => {}} />
    )

    await waitFor(() => {
      // Amount section
      expect(screen.getByText('Amount')).toBeInTheDocument()
      expect(screen.getByText(/EUR60\.00/)).toBeInTheDocument()

      // Date section
      expect(screen.getByText('Date')).toBeInTheDocument()

      // Category section
      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByText('transportation')).toBeInTheDocument()

      // Payer section
      expect(screen.getByText('Paid By')).toBeInTheDocument()

      // Split section
      expect(screen.getByText('Split Between')).toBeInTheDocument()

      // Check split percentages
      expect(screen.getAllByText(/50%/)).toHaveLength(2)
    })
  })
})
