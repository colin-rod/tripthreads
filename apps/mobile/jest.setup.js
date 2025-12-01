/* eslint-disable no-undef */
import '@testing-library/jest-native/extend-expect'

// Disable Expo winter runtime for tests
process.env.EXPO_USE_WINTER = '0'

// Mock NativeWind
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}))

// Mock expo-linking for deep link parsing tests
jest.mock('expo-linking', () => ({
  parse: jest.fn((url) => {
    if (!url || url.trim() === '') {
      throw new Error('Invariant Violation: Invalid URL: cannot be empty')
    }

    // Simple parsing logic for tests
    const urlObj = new URL(url.replace('tripthreads://', 'https://tripthreads.com/'))
    const path = urlObj.pathname
    const searchParams = new URLSearchParams(urlObj.search)

    const queryParams = {}
    searchParams.forEach((value, key) => {
      queryParams[key] = value
    })

    return {
      hostname: urlObj.hostname,
      path,
      queryParams,
    }
  }),
  getInitialURL: jest.fn(async () => null),
  addEventListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
}))
