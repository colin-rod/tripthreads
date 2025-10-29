/* eslint-disable no-undef */
import '@testing-library/jest-native/extend-expect'

// Disable Expo winter runtime for tests
process.env.EXPO_USE_WINTER = '0'

// Mock NativeWind
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}))
