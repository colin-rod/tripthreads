import { describe, it, expect, beforeEach, vi } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import LoginPage from '../../app/(auth)/login/page'
import { useAuth } from '../../lib/auth/auth-context'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock auth context
vi.mock('../../lib/auth/auth-context', () => ({
  useAuth: vi.fn(),
}))

describe('LoginPage', () => {
  const mockPush = vi.fn()
  const mockSignIn = vi.fn()
  const mockSignInWithGoogle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any)
    vi.mocked(useAuth).mockReturnValue({
      signIn: mockSignIn,
      signInWithGoogle: mockSignInWithGoogle,
      user: null,
      session: null,
      loading: false,
      signUp: vi.fn(),
      signOut: vi.fn(),
    })
  })

  it('should render login form', () => {
    render(<LoginPage />)

    expect(screen.getByText('Welcome back')).toBeDefined()
    expect(screen.getByText('Sign in to continue to TripThreads')).toBeDefined()
    expect(screen.getByLabelText('Email')).toBeDefined()
    expect(screen.getByLabelText('Password')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDefined()
    expect(screen.getByText('Continue with Google')).toBeDefined()
  })

  it('should handle email/password sign in', async () => {
    mockSignIn.mockResolvedValue({ error: null })

    render(<LoginPage />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockPush).toHaveBeenCalledWith('/trips')
    })
  })

  it('should display error message on failed sign in', async () => {
    mockSignIn.mockResolvedValue({ error: new Error('Invalid credentials') })

    render(<LoginPage />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeDefined()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  it('should handle Google sign in', async () => {
    mockSignInWithGoogle.mockResolvedValue({ error: null })

    render(<LoginPage />)

    const googleButton = screen.getByText('Continue with Google')
    fireEvent.click(googleButton)

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled()
    })
  })

  it('should disable form during submission', async () => {
    mockSignIn.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    )

    render(<LoginPage />)

    const emailInput = screen.getByLabelText('Email') as HTMLInputElement
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(emailInput.disabled).toBe(true)
      expect(passwordInput.disabled).toBe(true)
      expect(submitButton.disabled).toBe(true)
      expect(screen.getByText('Signing in...')).toBeDefined()
    })
  })

  it('should have link to signup page', () => {
    render(<LoginPage />)

    const signupLink = screen.getByText('Sign up')
    expect(signupLink).toBeDefined()
    expect(signupLink.closest('a')).toHaveProperty('href', '/signup')
  })
})
