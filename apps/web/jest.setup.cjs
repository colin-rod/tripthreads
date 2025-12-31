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

// Mock ResizeObserver for Radix UI components
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock HTMLMediaElement (base for video/audio elements)
class MockHTMLMediaElement {
  constructor() {
    this.duration = 0
    this.currentTime = 0
    this.paused = true
    this.ended = false
    this.muted = false
    this.volume = 1
    this.playbackRate = 1
    this.readyState = 4 // HAVE_ENOUGH_DATA
    this.networkState = 2 // NETWORK_IDLE
    this.error = null
    this.src = ''
    this._eventListeners = {}
    this._attributes = {}
  }

  play() {
    this.paused = false
    return Promise.resolve()
  }

  pause() {
    this.paused = true
  }

  load() {
    // Simulate immediate load without codec initialization
    // Dispatch events synchronously to avoid timing issues in tests
    this.readyState = 4
    this.dispatchEvent(new Event('loadeddata'))
    this.dispatchEvent(new Event('canplay'))
  }

  setAttribute(name, value) {
    this._attributes[name] = value
    if (name === 'src') {
      this.src = value
    }
  }

  getAttribute(name) {
    return this._attributes[name]
  }

  removeAttribute(name) {
    delete this._attributes[name]
  }

  addEventListener(event, handler) {
    if (!this._eventListeners[event]) {
      this._eventListeners[event] = []
    }
    this._eventListeners[event].push(handler)
  }

  removeEventListener(event, handler) {
    if (this._eventListeners[event]) {
      this._eventListeners[event] = this._eventListeners[event].filter(
        (h) => h !== handler
      )
    }
  }

  dispatchEvent(event) {
    if (this._eventListeners[event.type]) {
      this._eventListeners[event.type].forEach((handler) => handler(event))
    }
    return true
  }
}

// Mock HTMLVideoElement (extends HTMLMediaElement)
class MockHTMLVideoElement extends MockHTMLMediaElement {
  constructor() {
    super()
    this.videoWidth = 1920
    this.videoHeight = 1080
  }
}

// Only setup DOM-related mocks when jsdom is available
// This allows API route tests to run in Node environment
if (typeof document !== 'undefined') {
  // Override document.createElement for video elements
  // Use actual jsdom createElement but override video element creation
  const originalCreateElement = document.createElement.bind(document)
  document.createElement = function (tagName, options) {
    if (tagName === 'video') {
      // Create a real div element and add video properties to it
      // This ensures it has all the Node interface methods
      const element = originalCreateElement('div', options)

      // Add video-specific properties
      Object.defineProperties(element, {
        duration: { value: 0, writable: true },
        currentTime: { value: 0, writable: true },
        paused: { value: true, writable: true },
        ended: { value: false, writable: true },
        muted: { value: false, writable: true },
        volume: { value: 1, writable: true },
        playbackRate: { value: 1, writable: true },
        readyState: { value: 4, writable: true },
        networkState: { value: 2, writable: true },
        error: { value: null, writable: true },
        videoWidth: { value: 1920, writable: true },
        videoHeight: { value: 1080, writable: true },
        controls: { value: false, writable: true },
        autoplay: { value: false, writable: true },
        loop: { value: false, writable: true },
        playsInline: { value: false, writable: true }
      })

      // Add media methods
      element.play = function() {
        this.paused = false
        return Promise.resolve()
      }
      element.pause = function() {
        this.paused = true
      }
      element.load = function() {
        this.readyState = 4
        // Dispatch events synchronously to avoid timing issues in tests
        const loadedEvent = new Event('loadeddata')
        const canplayEvent = new Event('canplay')
        this.dispatchEvent(loadedEvent)
        this.dispatchEvent(canplayEvent)
      }

      return element
    }
    return originalCreateElement(tagName, options)
  }
}

global.HTMLMediaElement = MockHTMLMediaElement
global.HTMLVideoElement = MockHTMLVideoElement
