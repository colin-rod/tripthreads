// Load other test dependencies (polyfills are in jest.polyfills.cjs)
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('@testing-library/jest-dom')
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('jest-canvas-mock')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadEnvConfig } = require('@next/env')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path')

// Load environment variables from .env.local for tests
// When running `npm test` from project root, process.cwd() is already at root
// When running from apps/web, we need to go up two levels
const projectRoot = process.cwd().endsWith('apps/web')
  ? path.resolve(process.cwd(), '../..')
  : process.cwd()

// Load environment variables BEFORE tests run
const envConfig = loadEnvConfig(projectRoot)

// If we loaded environment variables, verify the critical ones are present
if (envConfig?.combinedEnv) {
  // For integration tests, we need these Supabase variables
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.warn(
      '\n⚠️  Warning: Supabase environment variables not found. Integration tests will be skipped.\n' +
        'To run integration tests:\n' +
        '  1. Copy .env.example to .env.local\n' +
        '  2. Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY\n'
    )
  }
}

// Mock URL.createObjectURL and URL.revokeObjectURL for file uploads
global.URL.createObjectURL = jest.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = jest.fn()
