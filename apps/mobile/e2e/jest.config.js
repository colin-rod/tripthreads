/* eslint-disable */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.e2e.ts'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
  moduleNameMapper: {
    // Mock expo-image-picker for E2E tests
    // Detox cannot interact with native photo picker UI
    'expo-image-picker': '<rootDir>/e2e/mocks/expo-image-picker.ts',
  },
}
