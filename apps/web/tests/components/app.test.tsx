import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

// Mock the useAuth hook
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
  }),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

describe('Home Page', () => {
  it('should render loading state', () => {
    render(<Home />)
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument()
  })

  it('should render without errors', () => {
    const { container } = render(<Home />)
    expect(container.firstChild).toBeTruthy()
  })
})
