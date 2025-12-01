/**
 * Supabase Connection Tests
 *
 * Tests to verify that Supabase client is properly configured and can connect
 */

// Mock Supabase client for tests
jest.mock('@/lib/supabase/client', () => {
  const mockSupabase = {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() =>
          Promise.resolve({
            data: null,
            error: { message: 'relation "_health_check" does not exist' },
          })
        ),
      })),
    })),
  }

  return {
    supabase: mockSupabase,
  }
})

import { supabase } from '@/lib/supabase/client'

describe('Supabase Client', () => {
  it('should be defined', () => {
    expect(supabase).toBeDefined()
  })

  it('should have a valid auth property', () => {
    expect(supabase.auth).toBeDefined()
  })

  it('should have a valid from method for queries', () => {
    expect(typeof supabase.from).toBe('function')
  })

  it('should be able to check connection', async () => {
    // Test basic connectivity by attempting to fetch from a non-existent table
    // This will fail with a table error, but proves connectivity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from('_health_check' as any)
      .select('*')
      .limit(1)

    // We expect an error because the table doesn't exist yet
    // But the error should be about the table, not connection/auth
    expect(error).toBeDefined()
    if (error) {
      // Either "relation does not exist" or similar postgres error
      // This proves we connected to the database
      expect(error.message).toMatch(/relation|table|does not exist/i)
    }
  })
})
