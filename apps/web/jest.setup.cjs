// eslint-disable-next-line @typescript-eslint/no-require-imports
require('@testing-library/jest-dom')
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('jest-canvas-mock')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadEnvConfig } = require('@next/env')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TextEncoder, TextDecoder } = require('util')

// Polyfill TextEncoder/TextDecoder for Node.js test environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Polyfill Request, Response, Headers for Next.js server components
if (typeof Request === 'undefined') {
  global.Request = class Request {}
}
if (typeof Response === 'undefined') {
  global.Response = class Response {}
}
if (typeof Headers === 'undefined') {
  global.Headers = class Headers {}
}

// Load environment variables from .env.local for tests
// When running `npm test` from project root, process.cwd() is already at root
// When running from apps/web, we need to go up two levels
const projectRoot = process.cwd().endsWith('apps/web')
  ? path.resolve(process.cwd(), '../..')
  : process.cwd()
loadEnvConfig(projectRoot)

// Mock URL.createObjectURL and URL.revokeObjectURL for file uploads
global.URL.createObjectURL = jest.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = jest.fn()
