/**
 * Test Fixtures - Error Scenarios for AI Parser
 *
 * Mock error responses for testing error handling.
 * Used across all test files to ensure consistent error scenarios.
 */

/**
 * OpenAI API Error Scenarios
 */
export const openAIErrors = {
  // Network error (no connection)
  networkError: Object.assign(new Error('Network request failed'), {
    code: 'ECONNREFUSED',
  }),

  // Timeout/Abort error
  timeoutError: Object.assign(new Error('The user aborted a request'), {
    name: 'AbortError',
  }),

  // 401 Unauthorized (invalid API key)
  authError: Object.assign(new Error('Incorrect API key provided'), {
    status: 401,
    statusText: 'Unauthorized',
  }),

  // 429 Rate Limit Exceeded
  rateLimitError: Object.assign(new Error('Rate limit exceeded'), {
    status: 429,
    statusText: 'Too Many Requests',
    headers: {
      'x-ratelimit-reset': Date.now() + 60000, // Reset in 1 minute
    },
  }),

  // 500 Internal Server Error
  serverError: Object.assign(new Error('Internal server error'), {
    status: 500,
    statusText: 'Internal Server Error',
  }),

  // 503 Service Unavailable
  serviceUnavailableError: Object.assign(new Error('Service temporarily unavailable'), {
    status: 503,
    statusText: 'Service Unavailable',
  }),
}

/**
 * Invalid OpenAI Responses
 */
export const invalidOpenAIResponses = {
  // Malformed JSON
  malformedJSON: {
    choices: [
      {
        message: {
          content: '{not valid json}',
        },
      },
    ],
    usage: { total_tokens: 50 },
  },

  // Empty response
  emptyResponse: {
    choices: [
      {
        message: {
          content: '',
        },
      },
    ],
    usage: { total_tokens: 10 },
  },

  // Missing fields
  missingFields: {
    choices: [
      {
        message: {
          content: JSON.stringify({
            // Missing required fields like amount, currency, etc.
          }),
        },
      },
    ],
    usage: { total_tokens: 30 },
  },

  // Wrong data types
  wrongTypes: {
    choices: [
      {
        message: {
          content: JSON.stringify({
            amount: 'not a number',
            currency: 123, // should be string
            date: 'not a valid date',
          }),
        },
      },
    ],
    usage: { total_tokens: 40 },
  },

  // No choices array
  noChoices: {
    usage: { total_tokens: 0 },
  },

  // Empty choices array
  emptyChoices: {
    choices: [],
    usage: { total_tokens: 0 },
  },
}

/**
 * Invalid User Inputs
 */
export const invalidInputs = {
  emptyString: '',
  whitespaceOnly: '   \n\t   ',
  randomGibberish: 'asdlfkj asldfkj asldfkj',
  nonEnglish: '这不是英文', // Chinese text
  veryLongInput: 'a'.repeat(10000), // 10k characters
  specialCharacters: '!@#$%^&*()_+{}|:"<>?',
  htmlTags: '<script>alert("xss")</script>',
  sqlInjection: "'; DROP TABLE expenses; --",
}

/**
 * Edge Case Inputs (valid but tricky)
 */
export const edgeCaseInputs = {
  multipleCommands: 'Dinner €60 and taxi £20', // Two expenses in one
  conflictingInfo: 'Dinner tomorrow yesterday at 5pm', // Contradictory dates
  ambiguousAmount: '$100-120', // Range instead of exact amount
  noCurrency: '50 dinner', // Missing currency
  noAmount: 'Dinner with friends', // Missing amount
  noDescription: '€50', // Missing description
  tooManyParticipants: 'Split €10 with ' + 'John, '.repeat(100), // 100 participants
  negativAmount: 'Paid -$50 for refund', // Negative amount
  hugeAmount: 'Dinner $999999999', // Unrealistic amount
}

/**
 * Authentication/Authorization Errors
 */
export const authErrors = {
  // Not authenticated (no user session)
  noAuth: {
    error: 'Not authenticated',
    code: 401,
  },

  // Not a trip member
  notMember: {
    error: 'Not authorized to access this trip',
    code: 403,
  },

  // Trip not found
  tripNotFound: {
    error: 'Trip not found',
    code: 404,
  },

  // Invalid tripId format
  invalidTripId: {
    error: 'Invalid trip ID format',
    code: 400,
  },
}

/**
 * Expected Error Messages
 */
export const expectedErrorMessages = {
  parseError: 'Failed to parse OpenAI JSON response',
  timeoutError: 'The request took too long to complete',
  authError: 'Check your OPENAI_API_KEY in .env.local',
  rateLimitError: 'Too many requests. Please wait and try again.',
  networkError: 'Failed to connect to OpenAI API',
  serverError: 'Internal server error',
  emptyInput: 'Input cannot be empty',
  invalidInput: 'Could not parse input',
}

/**
 * Mock Sentry Captures
 */
export const sentryCaptureTypes = {
  parseError: {
    level: 'warning',
    tags: { errorType: 'parse_error' },
  },
  apiError: {
    level: 'error',
    tags: { errorType: 'api_error' },
  },
  timeoutError: {
    level: 'warning',
    tags: { errorType: 'timeout' },
  },
  internalError: {
    level: 'error',
    tags: { errorType: 'internal_error' },
  },
}
