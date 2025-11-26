// This file runs BEFORE setupFilesAfterEnv
// It sets up polyfills needed for Next.js API routes

const { TextEncoder, TextDecoder } = require('util')
const undici = require('undici')

// Set up global Web APIs from undici
global.Request = undici.Request
global.Response = undici.Response
global.Headers = undici.Headers
global.FormData = undici.FormData
global.fetch = undici.fetch
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
