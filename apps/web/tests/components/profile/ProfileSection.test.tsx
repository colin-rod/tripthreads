/**
 * Tests for ProfileSection component
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileSection } from '@/components/features/profile/ProfileSection'
import { updateProfileName, deleteAvatar } from '@/app/actions/profile'
import type { Database } from '@tripthreads/core'

// Mock server actions
jest.mock('@/app/actions/profile', () => ({
  updateProfileName: jest.fn(),
  uploadAvatar: jest.fn(),
  deleteAvatar: jest.fn(),
}))

// Mock toast
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// Mock avatar utilities
jest.mock('@/lib/utils/avatar', () => ({
  validateAvatarFile: jest.fn((file: File) => ({
    valid:
      file.size <= 5 * 1024 * 1024 && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    error: file.size > 5 * 1024 * 1024 ? 'Avatar must be less than 5MB' : undefined,
  })),
}))

type User = Database['public']['Tables']['profiles']['Row']

const mockUser: User = {
  id: 'user-1',
  email: 'john@example.com',
  full_name: 'John Doe',
  avatar_url: 'https://example.com/avatar.jpg',
  plan: 'free',
  plan_expires_at: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  subscription_currency: null,
  subscription_price_id: null,
  notification_preferences: null,
  cookie_consent: null,
  cookie_consent_updated_at: null,
  privacy_accepted_at: null,
  tos_accepted_at: null,
  profile_completed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  is_deleted: false,
}

const mockUserNoName: User = {
  ...mockUser,
  full_name: null,
  avatar_url: null,
}

describe('ProfileSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render user profile information', () => {
    render(<ProfileSection user={mockUser} />)

    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
  })

  it('should show banner for users without names', () => {
    render(<ProfileSection user={mockUserNoName} />)

    expect(screen.getByText(/complete your profile/i)).toBeInTheDocument()
  })

  it('should display email as placeholder for users without names', () => {
    render(<ProfileSection user={mockUserNoName} />)

    const nameInput = screen.getByPlaceholderText('john@example.com')
    expect(nameInput).toBeInTheDocument()
  })

  it('should enable save button when name is changed', async () => {
    const user = userEvent.setup()
    render(<ProfileSection user={mockUser} />)

    const saveButton = screen.getByRole('button', { name: /save/i })
    expect(saveButton).toBeDisabled()

    const nameInput = screen.getByDisplayValue('John Doe')
    await user.clear(nameInput)
    await user.type(nameInput, 'Jane Smith')

    await waitFor(() => {
      expect(saveButton).toBeEnabled()
    })
  })

  it('should update name successfully', async () => {
    const user = userEvent.setup()
    const mockOnUpdate = jest.fn()
    ;(updateProfileName as jest.Mock).mockResolvedValue({
      ...mockUser,
      full_name: 'Jane Smith',
    })

    render(<ProfileSection user={mockUser} onUpdate={mockOnUpdate} />)

    const nameInput = screen.getByDisplayValue('John Doe')
    await user.clear(nameInput)
    await user.type(nameInput, 'Jane Smith')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(updateProfileName).toHaveBeenCalledWith('Jane Smith')
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Name updated',
        })
      )
      expect(mockOnUpdate).toHaveBeenCalled()
    })
  })

  it('should show error toast on name update failure', async () => {
    const user = userEvent.setup()
    ;(updateProfileName as jest.Mock).mockRejectedValue(new Error('Failed to update'))

    render(<ProfileSection user={mockUser} />)

    const nameInput = screen.getByDisplayValue('John Doe')
    await user.clear(nameInput)
    await user.type(nameInput, 'Jane Smith')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          variant: 'destructive',
        })
      )
    })
  })

  it('should validate name with minimum length', async () => {
    const user = userEvent.setup()
    render(<ProfileSection user={mockUser} />)

    const nameInput = screen.getByDisplayValue('John Doe')
    await user.clear(nameInput)
    await user.type(nameInput, 'A')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument()
    })

    expect(updateProfileName).not.toHaveBeenCalled()
  })

  it('should show remove button when user has avatar', () => {
    render(<ProfileSection user={mockUser} />)

    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  })

  it('should not show remove button when user has no avatar', () => {
    render(<ProfileSection user={mockUserNoName} />)

    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
  })

  it('should delete avatar successfully', async () => {
    const user = userEvent.setup()
    const mockOnUpdate = jest.fn()
    ;(deleteAvatar as jest.Mock).mockResolvedValue({
      ...mockUser,
      avatar_url: null,
    })

    render(<ProfileSection user={mockUser} onUpdate={mockOnUpdate} />)

    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)

    await waitFor(() => {
      expect(deleteAvatar).toHaveBeenCalled()
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Avatar removed',
        })
      )
      expect(mockOnUpdate).toHaveBeenCalled()
    })
  })

  it('should disable email input (read-only)', () => {
    render(<ProfileSection user={mockUser} />)

    const emailInput = screen.getByDisplayValue('john@example.com')
    expect(emailInput).toBeDisabled()
  })

  it('should show email change coming soon message', () => {
    render(<ProfileSection user={mockUser} />)

    expect(screen.getByText(/email changes coming soon/i)).toBeInTheDocument()
  })
})
