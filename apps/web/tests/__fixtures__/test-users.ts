/**
 * Test User Fixtures
 *
 * Shared test user data for all test files. This ensures consistent UUIDs
 * across unit, component, integration, and E2E tests.
 *
 * Usage:
 *   import { TEST_USERS } from '../__fixtures__/test-users'
 *   const aliceId = TEST_USERS.alice.id
 */

export interface TestUser {
  id: string
  email: string
  full_name: string
  password: string
}

export const TEST_USERS = {
  alice: {
    id: 'ea1854fb-b8f4-480f-899f-af1bcf0218b3',
    email: 'alice@test.tripthreads.com',
    full_name: 'Alice Johnson',
    password: 'test123456',
  },
  benji: {
    id: '0af9094b-dedb-4472-8133-20577fbc8f98',
    email: 'benji@test.tripthreads.com',
    full_name: 'Benji Williams',
    password: 'test123456',
  },
  baylee: {
    id: 'b3e7c8d9-4e5f-4a6b-8c9d-0e1f2a3b4c5d',
    email: 'baylee@test.tripthreads.com',
    full_name: 'Baylee Davis',
    password: 'test123456',
  },
  maya: {
    id: 'c4f8d9ea-5f6a-4b7c-9d0e-1f2a3b4c5d6e',
    email: 'maya@test.tripthreads.com',
    full_name: 'Maya Chen',
    password: 'test123456',
  },
} as const satisfies Record<string, TestUser>

// Export test user IDs for convenience
export const TEST_USER_IDS = {
  alice: TEST_USERS.alice.id,
  benji: TEST_USERS.benji.id,
  baylee: TEST_USERS.baylee.id,
  maya: TEST_USERS.maya.id,
} as const
