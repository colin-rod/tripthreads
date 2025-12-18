const path = require('path')

process.env.EXPO_USE_WINTER = '0'

// eslint-disable-next-line no-undef
module.exports = {
  rootDir: __dirname,
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/jest.setup.js',
  ],
  setupFiles: ['<rootDir>/jest.env.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: path.join(__dirname, 'babel.config.js') }],
  },
  moduleNameMapper: {
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
    '^@/(.*)$': '<rootDir>/$1',
    '^expo/src/winter$': '<rootDir>/__mocks__/expo-winter.js',
    // @tripthreads/core mappings (match web config for consistency)
    '^@tripthreads/core/validation/profile$': '<rootDir>/../../packages/core/src/validation/profile.ts',
    '^@tripthreads/core/validation/trip$': '<rootDir>/../../packages/core/src/validation/trip.ts',
    '^@tripthreads/core/(.*)$': '<rootDir>/../../packages/core/src/$1',
    '^@tripthreads/core$': '<rootDir>/../../packages/core/src/index.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  testEnvironmentOptions: {
    env: {
      EXPO_USE_WINTER: '0',
    },
  },
}
