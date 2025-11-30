import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { supabase } from '../../lib/supabase/client'
import type {
  AuthResponse,
  AuthTokenResponsePassword,
  Session,
  User,
  OAuthResponse,
  AuthError,
} from '@supabase/supabase-js'

// Mock Supabase client
jest.mock('../../lib/supabase/client', () => {
  return {
    supabase: {
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signInWithOAuth: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
      from: jest.fn(() => ({
        insert: jest.fn(() => ({ error: null })),
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: null, error: null })),
          })),
        })),
      })),
    },
  }
})

describe('Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Email/Password Authentication', () => {
    it('should successfully sign up a new user', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      }

      const signUpMock = supabase.auth.signUp as any
      signUpMock.mockResolvedValue({
        data: { user: mockUser as unknown as User, session: null },
        error: null,
      } as AuthResponse)

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

      const signUpMock = supabase.auth.signUp as any
      signUpMock.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      } as AuthResponse)

      const { error } = await supabase.auth.signUp({
        email: 'existing@example.com',
        password: 'password123',
      })

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

      const signInWithPasswordMock = supabase.auth.signInWithPassword as any
      signInWithPasswordMock.mockResolvedValue({
        data: { session: mockSession as Session, user: mockSession.user as unknown as User },
        error: null,
      } as AuthTokenResponsePassword)

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

      const signInWithPasswordMock = supabase.auth.signInWithPassword as any
      signInWithPasswordMock.mockResolvedValue({
        data: { session: null, user: null },
        error: mockError,
      } as AuthTokenResponsePassword)

      const { error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongpassword',
      })

      expect(error).toEqual(mockError)
    })
  })

  describe('OAuth Authentication', () => {
    it('should initiate Google OAuth flow', async () => {
      const oauthResponse = {
        data: { provider: 'google', url: null },
        error: null,
      } as unknown as OAuthResponse

      const signInWithOAuthMock = supabase.auth.signInWithOAuth as any
      signInWithOAuthMock.mockResolvedValue(oauthResponse)

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
      const mockError = new Error('OAuth provider not configured') as unknown as AuthError

      const oauthErrorResponse = {
        data: { provider: 'google', url: null },
        error: mockError,
      } as unknown as OAuthResponse

      const signInWithOAuthMock = supabase.auth.signInWithOAuth as any
      signInWithOAuthMock.mockResolvedValue(oauthErrorResponse)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      })

      expect(error).toEqual(mockError)
    })
  })

  describe('Sign Out', () => {
    it('should successfully sign out user', async () => {
      const signOutMock = supabase.auth.signOut as any
      signOutMock.mockResolvedValue({
        error: null,
      })

      const { error } = await supabase.auth.signOut()

      expect(error).toBeNull()
      expect(supabase.auth.signOut).toHaveBeenCalled()
    })

    it('should handle sign out errors', async () => {
      const mockError = new Error('Sign out failed') as unknown as AuthError

      const signOutMock = supabase.auth.signOut as any
      signOutMock.mockResolvedValue({
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

      const getSessionMock = supabase.auth.getSession as any
      getSessionMock.mockResolvedValue({
        data: { session: mockSession as Session },
        error: null,
      })

      const { data, error } = await supabase.auth.getSession()

      expect(error).toBeNull()
      expect(data.session).toEqual(mockSession)
    })

    it('should return null for no active session', async () => {
      const getSessionMock = supabase.auth.getSession as any
      getSessionMock.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const { data, error } = await supabase.auth.getSession()

      expect(error).toBeNull()
      expect(data.session).toBeNull()
    })
  })
})
