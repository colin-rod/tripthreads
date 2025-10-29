import { describe, it, expect, beforeEach, vi } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import SignupPage from '../../app/(auth)/signup/page'
import { useAuth } from '../../lib/auth/auth-context'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock auth context
vi.mock('../../lib/auth/auth-context', () => ({
  useAuth: vi.fn(),
}))

describe('SignupPage', () => {
  const mockPush = vi.fn()
  const mockSignUp = vi.fn()
  const mockSignInWithGoogle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any)
    vi.mocked(useAuth).mockReturnValue({
      signUp: mockSignUp,
      signInWithGoogle: mockSignInWithGoogle,
      user: null,
      session: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render signup form', () => {
    render(<SignupPage />)

    expect(screen.getByText('Create your account')).toBeDefined()
    expect(screen.getByText('Start planning trips with your friends')).toBeDefined()
    expect(screen.getByLabelText('Full name')).toBeDefined()
    expect(screen.getByLabelText('Email')).toBeDefined()
    expect(screen.getByLabelText('Password')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDefined()
    expect(screen.getByText('Continue with Google')).toBeDefined()
  })

  it('should handle successful sign up', async () => {
    mockSignUp.mockResolvedValue({ error: null })

    render(<SignupPage />)

    const nameInput = screen.getByLabelText('Full name')
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Create account' })

    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User')
      expect(screen.getByText('Account created!')).toBeDefined()
    })

    // Fast-forward timer for redirect
    vi.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/trips')
    })
  })

  it('should validate password length', async () => {
    render(<SignupPage />)

    const nameInput = screen.getByLabelText('Full name')
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Create account' })

    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: '12345' } }) // Only 5 characters
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeDefined()
      expect(mockSignUp).not.toHaveBeenCalled()
    })
  })

  it('should display error message on failed sign up', async () => {
    mockSignUp.mockResolvedValue({ error: new Error('Email already registered') })

    render(<SignupPage />)

    const nameInput = screen.getByLabelText('Full name')
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Create account' })

    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeDefined()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  it('should handle Google sign in', async () => {
    mockSignInWithGoogle.mockResolvedValue({ error: null })

    render(<SignupPage />)

    const googleButton = screen.getByText('Continue with Google')
    fireEvent.click(googleButton)

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled()
    })
  })

  it('should disable form during submission', async () => {
    mockSignUp.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    )

    render(<SignupPage />)

    const nameInput = screen.getByLabelText('Full name') as HTMLInputElement
    const emailInput = screen.getByLabelText('Email') as HTMLInputElement
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: 'Create account' }) as HTMLButtonElement

    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(nameInput.disabled).toBe(true)
      expect(emailInput.disabled).toBe(true)
      expect(passwordInput.disabled).toBe(true)
      expect(submitButton.disabled).toBe(true)
      expect(screen.getByText('Creating account...')).toBeDefined()
    })
  })

  it('should have link to login page', () => {
    render(<SignupPage />)

    const loginLink = screen.getByText('Sign in')
    expect(loginLink).toBeDefined()
    expect(loginLink.closest('a')).toHaveProperty('href', '/login')
  })
})
