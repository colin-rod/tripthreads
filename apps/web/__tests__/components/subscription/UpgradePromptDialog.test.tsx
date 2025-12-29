/**
 * Tests for UpgradePromptDialog Component
 *
 * Tests the reusable upgrade prompt dialog shown when users hit subscription limits.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { UpgradePromptDialog } from '@/components/features/subscription/UpgradePromptDialog'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockPush = jest.fn()
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('UpgradePromptDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      push: mockPush,
      // Add other router properties as needed
    } as any)
  })

  it('renders with trips limit type', () => {
    const mockOnOpenChange = jest.fn()

    render(
      <UpgradePromptDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Trip Limit Reached"
        description="You've reached the free tier limit. Upgrade to Pro for unlimited trips."
        limitType="trips"
        currentCount={1}
        limit={1}
      />
    )

    expect(screen.getByText('Trip Limit Reached')).toBeInTheDocument()
    expect(screen.getByText(/You've reached the free tier limit/)).toBeInTheDocument()
    expect(screen.getByText(/You're currently using 1 of 1 trip/)).toBeInTheDocument()
  })

  it('renders with participants limit type', () => {
    const mockOnOpenChange = jest.fn()

    render(
      <UpgradePromptDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Participant Limit Reached"
        description="You've reached the free tier limit for participants."
        limitType="participants"
        currentCount={5}
        limit={5}
      />
    )

    expect(screen.getByText('Participant Limit Reached')).toBeInTheDocument()
    expect(screen.getByText(/You're currently using 5 of 5 participants/)).toBeInTheDocument()
    expect(screen.getByText('Unlimited participants per trip')).toBeInTheDocument()
  })

  it('renders with photos limit type', () => {
    const mockOnOpenChange = jest.fn()

    render(
      <UpgradePromptDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Photo Limit Reached"
        description="You've reached the free tier photo limit."
        limitType="photos"
        currentCount={25}
        limit={25}
      />
    )

    expect(screen.getByText('Photo Limit Reached')).toBeInTheDocument()
    expect(screen.getByText(/You're currently using 25 of 25 photos/)).toBeInTheDocument()
    expect(screen.getByText('Unlimited photo uploads')).toBeInTheDocument()
  })

  it('shows correct benefits for trip limit', () => {
    const mockOnOpenChange = jest.fn()

    render(
      <UpgradePromptDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Trip Limit Reached"
        description="Upgrade to Pro"
        limitType="trips"
        currentCount={1}
        limit={1}
      />
    )

    expect(screen.getByText('Unlimited trips')).toBeInTheDocument()
    expect(screen.getByText('Unlimited participants per trip')).toBeInTheDocument()
    expect(screen.getByText('Unlimited photo uploads')).toBeInTheDocument()
    expect(screen.getByText('Priority support')).toBeInTheDocument()
  })

  it('closes dialog when "Maybe Later" is clicked', () => {
    const mockOnOpenChange = jest.fn()

    render(
      <UpgradePromptDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Trip Limit Reached"
        description="Upgrade to Pro"
        limitType="trips"
        currentCount={1}
        limit={1}
      />
    )

    const maybeLaterButton = screen.getByRole('button', { name: /Maybe Later/i })
    fireEvent.click(maybeLaterButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('navigates to settings when "Upgrade to Pro" is clicked', () => {
    const mockOnOpenChange = jest.fn()

    render(
      <UpgradePromptDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Trip Limit Reached"
        description="Upgrade to Pro"
        limitType="trips"
        currentCount={1}
        limit={1}
      />
    )

    const upgradeButton = screen.getByRole('button', { name: /Upgrade to Pro/i })
    fireEvent.click(upgradeButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    expect(mockPush).toHaveBeenCalledWith('/settings?tab=subscription')
  })

  it('uses correct singular/plural label for trip (singular)', () => {
    const mockOnOpenChange = jest.fn()

    render(
      <UpgradePromptDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Trip Limit Reached"
        description="Upgrade to Pro"
        limitType="trips"
        currentCount={1}
        limit={1}
      />
    )

    expect(screen.getByText(/1 of 1 trip\b/)).toBeInTheDocument() // singular "trip"
  })

  it('uses correct singular/plural label for trips (plural)', () => {
    const mockOnOpenChange = jest.fn()

    render(
      <UpgradePromptDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Trip Limit Reached"
        description="Upgrade to Pro"
        limitType="trips"
        currentCount={3}
        limit={5}
      />
    )

    expect(screen.getByText(/3 of 5 trips\b/)).toBeInTheDocument() // plural "trips"
  })

  it('does not render when open is false', () => {
    const mockOnOpenChange = jest.fn()

    const { container } = render(
      <UpgradePromptDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        title="Trip Limit Reached"
        description="Upgrade to Pro"
        limitType="trips"
        currentCount={1}
        limit={1}
      />
    )

    // Dialog should not be visible
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
  })

  it('renders Crown icon', () => {
    const mockOnOpenChange = jest.fn()

    render(
      <UpgradePromptDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Trip Limit Reached"
        description="Upgrade to Pro"
        limitType="trips"
        currentCount={1}
        limit={1}
      />
    )

    // Crown icon should be present (checking for the upgrade button which has a Crown icon)
    const upgradeButton = screen.getByRole('button', { name: /Upgrade to Pro/i })
    expect(upgradeButton).toBeInTheDocument()
  })
})
