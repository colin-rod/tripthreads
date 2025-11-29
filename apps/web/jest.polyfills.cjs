// This file runs BEFORE setupFilesAfterEnv
// It sets up polyfills needed for Next.js API routes

const { TextEncoder, TextDecoder } = require('util')
const { ReadableStream, WritableStream, TransformStream } = require('stream/web')

// Set global Web APIs BEFORE loading undici
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
global.ReadableStream = ReadableStream
global.WritableStream = WritableStream
global.TransformStream = TransformStream

// Polyfill Buffer.isAscii for undici (required for Node < 19.2.0)
if (!Buffer.isAscii) {
  Buffer.isAscii = function (input) {
    return Buffer.isEncoding(input) || /^[\x00-\x7F]*$/.test(input.toString())
  }
}

const undici = require('undici')

// Set up global Web APIs from undici
global.Request = undici.Request
global.Response = undici.Response
global.Headers = undici.Headers
global.FormData = undici.FormData
global.fetch = undici.fetch
