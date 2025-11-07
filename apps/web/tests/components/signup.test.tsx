import { describe, it, beforeEach, jest } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import SignupPage from '../../app/(auth)/signup/page'
import { useAuth } from '../../lib/auth/auth-context'

type AuthResult = { error: Error | null }
const createAuthMock = <Args extends unknown[] = []>() =>
  jest.fn<(...args: Args) => Promise<AuthResult>>()

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock auth context
jest.mock('../../lib/auth/auth-context', () => ({
  useAuth: jest.fn(),
}))

describe('SignupPage', () => {
  const mockPush = jest.fn()
  const mockSignUp = createAuthMock<[string, string, string]>()
  const mockSignInWithGoogle = createAuthMock()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as unknown as AppRouterInstance)
    jest.mocked(useAuth).mockReturnValue({
      signUp: mockSignUp,
      signInWithGoogle: mockSignInWithGoogle,
      user: null,
      session: null,
      loading: false,
      signIn: createAuthMock<[string, string]>(),
      signOut: createAuthMock(),
    })
  })

  afterEach(() => {
    jest.useRealTimers()
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
    jest.advanceTimersByTime(2000)

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
