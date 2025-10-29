import { describe, it, expect, beforeEach, vi } from '@jest/globals'
import { supabase } from '../../lib/supabase/client'

// Mock Supabase client
vi.mock('../../lib/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
    })),
  },
}))

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Email/Password Authentication', () => {
    it('should successfully sign up a new user', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      }

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      } as any)

      const { data, error } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'Test User',
          },
        },
      })

      expect(error).toBeNull()
      expect(data.user).toEqual(mockUser)
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'Test User',
          },
        },
      })
    })

    it('should handle sign up errors', async () => {
      const mockError = new Error('Email already registered')

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      } as any)

      const { error } = await supabase.auth.signUp({
        email: 'existing@example.com',
        password: 'password123',
      } as any)

      expect(error).toEqual(mockError)
    })

    it('should successfully sign in with email and password', async () => {
      const mockSession = {
        access_token: 'mock-token',
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      }

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      } as any)

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(error).toBeNull()
      expect(data.session).toEqual(mockSession)
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('should handle invalid credentials', async () => {
      const mockError = new Error('Invalid login credentials')

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { session: null, user: null },
        error: mockError,
      } as any)

      const { error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongpassword',
      })

      expect(error).toEqual(mockError)
    })
  })

  describe('OAuth Authentication', () => {
    it('should initiate Google OAuth flow', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'google', url: 'https://accounts.google.com/...' },
        error: null,
      } as any)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
        },
      })

      expect(error).toBeNull()
      expect(data.provider).toBe('google')
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
        },
      })
    })

    it('should handle OAuth errors', async () => {
      const mockError = new Error('OAuth provider not configured')

      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: null, url: null },
        error: mockError,
      } as any)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      })

      expect(error).toEqual(mockError)
    })
  })

  describe('Sign Out', () => {
    it('should successfully sign out user', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null,
      })

      const { error } = await supabase.auth.signOut()

      expect(error).toBeNull()
      expect(supabase.auth.signOut).toHaveBeenCalled()
    })

    it('should handle sign out errors', async () => {
      const mockError = new Error('Sign out failed')

      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: mockError,
      })

      const { error } = await supabase.auth.signOut()

      expect(error).toEqual(mockError)
    })
  })

  describe('Session Management', () => {
    it('should retrieve existing session', async () => {
      const mockSession = {
        access_token: 'mock-token',
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      } as any)

      const { data, error } = await supabase.auth.getSession()

      expect(error).toBeNull()
      expect(data.session).toEqual(mockSession)
    })

    it('should return null for no active session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any)

      const { data, error } = await supabase.auth.getSession()

      expect(error).toBeNull()
      expect(data.session).toBeNull()
    })
  })
})
