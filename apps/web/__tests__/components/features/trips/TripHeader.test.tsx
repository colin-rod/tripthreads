/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TripHeader } from '@/components/features/trips/TripHeader'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

describe('TripHeader', () => {
  const mockTrip = {
    id: 'trip-1',
    name: 'Summer Vacation',
    description: 'A fun trip to the beach',
    start_date: '2024-06-01',
    end_date: '2024-06-15',
    trip_participants: [
      {
        id: 'participant-1',
        role: 'owner' as const,
        user: {
          id: 'user-1',
          full_name: 'John Doe',
          avatar_url: null,
        },
      },
      {
        id: 'participant-2',
        role: 'participant' as const,
        user: {
          id: 'user-2',
          full_name: 'Jane Smith',
          avatar_url: null,
        },
      },
    ],
  }

  const mockOnNavigate = jest.fn()
  const mockOnNavigateToDashboard = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic rendering', () => {
    it('renders trip name and dates', () => {
      render(<TripHeader trip={mockTrip} isOwner={true} onNavigate={mockOnNavigate} />)

      expect(screen.getByText('Summer Vacation')).toBeInTheDocument()
      expect(screen.getByText(/Jun 1 - Jun 15, 2024/i)).toBeInTheDocument()
    })

    it('renders trip description when provided', () => {
      render(<TripHeader trip={mockTrip} isOwner={true} onNavigate={mockOnNavigate} />)

      expect(screen.getByText('A fun trip to the beach')).toBeInTheDocument()
    })

    it('renders participant count', () => {
      render(<TripHeader trip={mockTrip} isOwner={true} onNavigate={mockOnNavigate} />)

      expect(screen.getByText(/2 people/i)).toBeInTheDocument()
    })

    it('shows Owner badge for owner', () => {
      render(<TripHeader trip={mockTrip} isOwner={true} onNavigate={mockOnNavigate} />)

      expect(screen.getByText('Owner')).toBeInTheDocument()
    })

    it('shows Viewer badge for viewer', () => {
      render(
        <TripHeader trip={mockTrip} isOwner={false} userRole="viewer" onNavigate={mockOnNavigate} />
      )

      expect(screen.getByText('Viewer')).toBeInTheDocument()
    })
  })

  describe('Navigation buttons', () => {
    it('renders all quick action buttons when onNavigate is provided', () => {
      render(<TripHeader trip={mockTrip} isOwner={true} onNavigate={mockOnNavigate} />)

      expect(screen.getByRole('button', { name: /chat/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add activity/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /upload photo/i })).toBeInTheDocument()
    })

    it('does not render quick action buttons when onNavigate is not provided', () => {
      render(<TripHeader trip={mockTrip} isOwner={true} />)

      expect(screen.queryByRole('button', { name: /chat/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /add expense/i })).not.toBeInTheDocument()
    })

    it('calls onNavigate with correct section when Chat button is clicked', async () => {
      const user = userEvent.setup()
      render(<TripHeader trip={mockTrip} isOwner={true} onNavigate={mockOnNavigate} />)

      const chatButton = screen.getByRole('button', { name: /chat/i })
      await user.click(chatButton)

      expect(mockOnNavigate).toHaveBeenCalledWith('chat')
    })

    it('calls onNavigate with "expenses" when Add Expense button is clicked', async () => {
      const user = userEvent.setup()
      render(<TripHeader trip={mockTrip} isOwner={true} onNavigate={mockOnNavigate} />)

      const expenseButton = screen.getByRole('button', { name: /add expense/i })
      await user.click(expenseButton)

      expect(mockOnNavigate).toHaveBeenCalledWith('expenses')
    })

    it('calls onNavigate with "plan" when Add Activity button is clicked', async () => {
      const user = userEvent.setup()
      render(<TripHeader trip={mockTrip} isOwner={true} onNavigate={mockOnNavigate} />)

      const activityButton = screen.getByRole('button', { name: /add activity/i })
      await user.click(activityButton)

      expect(mockOnNavigate).toHaveBeenCalledWith('plan')
    })

    it('calls onNavigate with "feed" when Upload Photo button is clicked', async () => {
      const user = userEvent.setup()
      render(<TripHeader trip={mockTrip} isOwner={true} onNavigate={mockOnNavigate} />)

      const photoButton = screen.getByRole('button', { name: /upload photo/i })
      await user.click(photoButton)

      expect(mockOnNavigate).toHaveBeenCalledWith('feed')
    })
  })

  describe('Active section highlighting', () => {
    it('highlights Chat button when activeSection is "chat"', () => {
      render(
        <TripHeader
          trip={mockTrip}
          isOwner={true}
          onNavigate={mockOnNavigate}
          activeSection="chat"
        />
      )

      const chatButton = screen.getByRole('button', { name: /chat/i })
      const expenseButton = screen.getByRole('button', { name: /add expense/i })
      const activityButton = screen.getByRole('button', { name: /add activity/i })
      const photoButton = screen.getByRole('button', { name: /upload photo/i })

      // Active button should have default variant (primary background)
      expect(chatButton).toHaveClass('bg-primary')

      // Inactive buttons should have outline variant
      expect(expenseButton).not.toHaveClass('bg-primary')
      expect(activityButton).not.toHaveClass('bg-primary')
      expect(photoButton).not.toHaveClass('bg-primary')
    })

    it('highlights Add Expense button when activeSection is "expenses"', () => {
      render(
        <TripHeader
          trip={mockTrip}
          isOwner={true}
          onNavigate={mockOnNavigate}
          activeSection="expenses"
        />
      )

      const chatButton = screen.getByRole('button', { name: /chat/i })
      const expenseButton = screen.getByRole('button', { name: /add expense/i })
      const activityButton = screen.getByRole('button', { name: /add activity/i })
      const photoButton = screen.getByRole('button', { name: /upload photo/i })

      expect(expenseButton).toHaveClass('bg-primary')
      expect(chatButton).not.toHaveClass('bg-primary')
      expect(activityButton).not.toHaveClass('bg-primary')
      expect(photoButton).not.toHaveClass('bg-primary')
    })

    it('highlights Add Activity button when activeSection is "plan"', () => {
      render(
        <TripHeader
          trip={mockTrip}
          isOwner={true}
          onNavigate={mockOnNavigate}
          activeSection="plan"
        />
      )

      const chatButton = screen.getByRole('button', { name: /chat/i })
      const expenseButton = screen.getByRole('button', { name: /add expense/i })
      const activityButton = screen.getByRole('button', { name: /add activity/i })
      const photoButton = screen.getByRole('button', { name: /upload photo/i })

      expect(activityButton).toHaveClass('bg-primary')
      expect(chatButton).not.toHaveClass('bg-primary')
      expect(expenseButton).not.toHaveClass('bg-primary')
      expect(photoButton).not.toHaveClass('bg-primary')
    })

    it('highlights Upload Photo button when activeSection is "feed"', () => {
      render(
        <TripHeader
          trip={mockTrip}
          isOwner={true}
          onNavigate={mockOnNavigate}
          activeSection="feed"
        />
      )

      const chatButton = screen.getByRole('button', { name: /chat/i })
      const expenseButton = screen.getByRole('button', { name: /add expense/i })
      const activityButton = screen.getByRole('button', { name: /add activity/i })
      const photoButton = screen.getByRole('button', { name: /upload photo/i })

      expect(photoButton).toHaveClass('bg-primary')
      expect(chatButton).not.toHaveClass('bg-primary')
      expect(expenseButton).not.toHaveClass('bg-primary')
      expect(activityButton).not.toHaveClass('bg-primary')
    })

    it('does not highlight any button when activeSection is "home"', () => {
      render(
        <TripHeader
          trip={mockTrip}
          isOwner={true}
          onNavigate={mockOnNavigate}
          activeSection="home"
        />
      )

      const chatButton = screen.getByRole('button', { name: /chat/i })
      const expenseButton = screen.getByRole('button', { name: /add expense/i })
      const activityButton = screen.getByRole('button', { name: /add activity/i })
      const photoButton = screen.getByRole('button', { name: /upload photo/i })

      expect(chatButton).not.toHaveClass('bg-primary')
      expect(expenseButton).not.toHaveClass('bg-primary')
      expect(activityButton).not.toHaveClass('bg-primary')
      expect(photoButton).not.toHaveClass('bg-primary')
    })

    it('does not highlight any button when activeSection is "settings"', () => {
      render(
        <TripHeader
          trip={mockTrip}
          isOwner={true}
          onNavigate={mockOnNavigate}
          activeSection="settings"
        />
      )

      const chatButton = screen.getByRole('button', { name: /chat/i })
      const expenseButton = screen.getByRole('button', { name: /add expense/i })
      const activityButton = screen.getByRole('button', { name: /add activity/i })
      const photoButton = screen.getByRole('button', { name: /upload photo/i })

      expect(chatButton).not.toHaveClass('bg-primary')
      expect(expenseButton).not.toHaveClass('bg-primary')
      expect(activityButton).not.toHaveClass('bg-primary')
      expect(photoButton).not.toHaveClass('bg-primary')
    })

    it('does not highlight any button when activeSection is undefined (backward compatibility)', () => {
      render(<TripHeader trip={mockTrip} isOwner={true} onNavigate={mockOnNavigate} />)

      const chatButton = screen.getByRole('button', { name: /chat/i })
      const expenseButton = screen.getByRole('button', { name: /add expense/i })
      const activityButton = screen.getByRole('button', { name: /add activity/i })
      const photoButton = screen.getByRole('button', { name: /upload photo/i })

      expect(chatButton).not.toHaveClass('bg-primary')
      expect(expenseButton).not.toHaveClass('bg-primary')
      expect(activityButton).not.toHaveClass('bg-primary')
      expect(photoButton).not.toHaveClass('bg-primary')
    })

    it('adds ring effect to active button', () => {
      render(
        <TripHeader
          trip={mockTrip}
          isOwner={true}
          onNavigate={mockOnNavigate}
          activeSection="chat"
        />
      )

      const chatButton = screen.getByRole('button', { name: /chat/i })
      expect(chatButton).toHaveClass('ring-2', 'ring-primary/20')
    })

    it('does not add ring effect to inactive buttons', () => {
      render(
        <TripHeader
          trip={mockTrip}
          isOwner={true}
          onNavigate={mockOnNavigate}
          activeSection="chat"
        />
      )

      const expenseButton = screen.getByRole('button', { name: /add expense/i })
      expect(expenseButton).not.toHaveClass('ring-2')
    })
  })

  describe('Back button behavior', () => {
    it('shows back button when showBackButton is true', () => {
      render(
        <TripHeader
          trip={mockTrip}
          isOwner={true}
          showBackButton={true}
          onNavigateToDashboard={mockOnNavigateToDashboard}
          onNavigate={mockOnNavigate}
        />
      )

      const backButton = screen.getByRole('button', { name: /back to dashboard/i })
      expect(backButton).toBeInTheDocument()
    })

    it('does not show back button when showBackButton is false', () => {
      render(
        <TripHeader
          trip={mockTrip}
          isOwner={true}
          showBackButton={false}
          onNavigate={mockOnNavigate}
        />
      )

      expect(screen.queryByRole('button', { name: /back to dashboard/i })).not.toBeInTheDocument()
    })

    it('calls onNavigateToDashboard when back button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <TripHeader
          trip={mockTrip}
          isOwner={true}
          showBackButton={true}
          onNavigateToDashboard={mockOnNavigateToDashboard}
          onNavigate={mockOnNavigate}
        />
      )

      const backButton = screen.getByRole('button', { name: /back to dashboard/i })
      await user.click(backButton)

      expect(mockOnNavigateToDashboard).toHaveBeenCalledTimes(1)
    })
  })
})
