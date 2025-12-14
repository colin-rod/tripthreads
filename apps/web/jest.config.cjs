// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFiles: ['<rootDir>/jest.polyfills.cjs'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@tripthreads/core/validation/profile$': '<rootDir>/../../packages/core/src/validation/profile.ts',
    '^@tripthreads/core/validation/trip$': '<rootDir>/../../packages/core/src/validation/trip.ts',
    '^@tripthreads/core/(.*)$': '<rootDir>/../../packages/core/src/$1',
    '^@tripthreads/core$': '<rootDir>/../../packages/core/src/index.ts',
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
}

module.exports = createJestConfig(customJestConfig)
