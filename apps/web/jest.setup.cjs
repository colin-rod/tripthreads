// eslint-disable-next-line @typescript-eslint/no-require-imports
require('@testing-library/jest-dom')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadEnvConfig } = require('@next/env')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path')

// Load environment variables from .env.local for tests
// Since tests run from apps/web, we need to go up two levels to root
const projectRoot = path.resolve(process.cwd(), '../..')
loadEnvConfig(projectRoot)
