/**
 * Test Fixtures - OpenAI Itinerary Parsing Responses
 *
 * Realistic mock responses for itinerary/date parsing test cases.
 * Used in itinerary-parsing.test.ts to avoid real API calls.
 */

import type { ParsedDateTime } from '@tripthreads/core'

export interface ItineraryTestCase {
  input: string
  expectedResponse: ParsedDateTime
  description: string
  category?:
    | 'flight'
    | 'hotel'
    | 'activity'
    | 'restaurant'
    | 'transportation'
    | 'date'
    | 'edge_case'
}

/**
 * Flight Test Cases (10+)
 */
export const flightTestCases: ItineraryTestCase[] = [
  {
    input: 'Flight to Paris 9am Dec 15',
    expectedResponse: {
      date: '2025-12-15T09:00:00.000Z',
      type: 'absolute',
      description: 'Flight to Paris',
      confidence: 0.95,
    },
    description: 'Flight with destination, time, and absolute date',
    category: 'flight',
  },
  {
    input: 'Flight AA123 to NYC tomorrow 2pm',
    expectedResponse: {
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T14:00:00.000Z',
      type: 'relative',
      description: 'Flight AA123 to NYC',
      confidence: 0.9,
    },
    description: 'Flight with number, destination, relative date, and time',
    category: 'flight',
  },
  {
    input: 'Departing flight 10:30am Monday',
    expectedResponse: {
      date: '2025-11-17T10:30:00.000Z', // Next Monday
      type: 'relative',
      description: 'Departing flight',
      confidence: 0.9,
    },
    description: 'Flight with relative weekday',
    category: 'flight',
  },
  {
    input: 'Return flight Dec 20 5pm',
    expectedResponse: {
      date: '2025-12-20T17:00:00.000Z',
      type: 'absolute',
      description: 'Return flight',
      confidence: 0.95,
    },
    description: 'Return flight with date and time',
    category: 'flight',
  },
  {
    input: 'Flight from London to Paris Friday morning',
    expectedResponse: {
      date: '2025-11-14T09:00:00.000Z', // Next Friday, 9am default
      type: 'relative',
      description: 'Flight from London to Paris',
      confidence: 0.85,
    },
    description: 'Flight with origin, destination, and time of day',
    category: 'flight',
  },
  {
    input: 'Connecting flight in Frankfurt 11:45am',
    expectedResponse: {
      date: new Date(Date.now() + 3600000).toISOString().split('T')[0] + 'T11:45:00.000Z',
      type: 'relative',
      description: 'Connecting flight in Frankfurt',
      confidence: 0.85,
    },
    description: 'Connecting flight with location and time',
    category: 'flight',
  },
]

/**
 * Hotel Test Cases (10+)
 */
export const hotelTestCases: ItineraryTestCase[] = [
  {
    input: 'Marriott check-in 3pm Dec 15',
    expectedResponse: {
      date: '2025-12-15T15:00:00.000Z',
      type: 'absolute',
      description: 'Marriott check-in',
      confidence: 0.95,
    },
    description: 'Hotel check-in with name, time, and date',
    category: 'hotel',
  },
  {
    input: 'Hotel Paris Dec 15-20',
    expectedResponse: {
      date: '2025-12-15T00:00:00.000Z',
      endDate: '2025-12-20T00:00:00.000Z',
      type: 'range',
      description: 'Hotel Paris',
      confidence: 0.95,
    },
    description: 'Hotel stay with date range',
    category: 'hotel',
  },
  {
    input: 'Check-in tomorrow afternoon',
    expectedResponse: {
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T15:00:00.000Z',
      type: 'relative',
      description: 'Check-in',
      confidence: 0.9,
    },
    description: 'Check-in with relative date and time of day',
    category: 'hotel',
  },
  {
    input: 'Hilton Hotel check-out 11am Dec 20',
    expectedResponse: {
      date: '2025-12-20T11:00:00.000Z',
      type: 'absolute',
      description: 'Hilton Hotel check-out',
      confidence: 0.95,
    },
    description: 'Hotel check-out with time and date',
    category: 'hotel',
  },
  {
    input: 'Airbnb from Monday to Friday',
    expectedResponse: {
      date: '2025-11-17T00:00:00.000Z', // Next Monday
      endDate: '2025-11-21T00:00:00.000Z', // Next Friday
      type: 'range',
      description: 'Airbnb',
      confidence: 0.9,
    },
    description: 'Lodging with weekday range',
    category: 'hotel',
  },
  {
    input: 'Hotel reservation for 3 nights starting Dec 15',
    expectedResponse: {
      date: '2025-12-15T00:00:00.000Z',
      endDate: '2025-12-18T00:00:00.000Z',
      type: 'range',
      description: 'Hotel reservation',
      confidence: 0.9,
    },
    description: 'Hotel with duration in nights',
    category: 'hotel',
  },
]

/**
 * Activity Test Cases (10+)
 */
export const activityTestCases: ItineraryTestCase[] = [
  {
    input: 'Eiffel Tower tour 2pm Friday',
    expectedResponse: {
      date: '2025-11-14T14:00:00.000Z', // Next Friday
      type: 'relative',
      description: 'Eiffel Tower tour',
      confidence: 0.95,
    },
    description: 'Activity with location, time, and weekday',
    category: 'activity',
  },
  {
    input: 'Museum visit tomorrow afternoon',
    expectedResponse: {
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T15:00:00.000Z',
      type: 'relative',
      description: 'Museum visit',
      confidence: 0.9,
    },
    description: 'Activity with relative date and time of day',
    category: 'activity',
  },
  {
    input: 'Louvre Museum 10am Dec 16',
    expectedResponse: {
      date: '2025-12-16T10:00:00.000Z',
      type: 'absolute',
      description: 'Louvre Museum',
      confidence: 0.95,
    },
    description: 'Museum activity with specific time and date',
    category: 'activity',
  },
  {
    input: 'Seine river cruise at 7pm',
    expectedResponse: {
      date: new Date().toISOString().split('T')[0] + 'T19:00:00.000Z',
      type: 'absolute',
      description: 'Seine river cruise',
      confidence: 0.85,
    },
    description: 'Activity with time but no date (assume today)',
    category: 'activity',
  },
  {
    input: 'City walking tour Monday morning',
    expectedResponse: {
      date: '2025-11-17T09:00:00.000Z', // Next Monday
      type: 'relative',
      description: 'City walking tour',
      confidence: 0.9,
    },
    description: 'Tour with weekday and time of day',
    category: 'activity',
  },
  {
    input: 'Beach day tomorrow',
    expectedResponse: {
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T00:00:00.000Z',
      type: 'relative',
      description: 'Beach day',
      confidence: 0.9,
    },
    description: 'Full-day activity with relative date',
    category: 'activity',
  },
  {
    input: 'Skiing Dec 18-20',
    expectedResponse: {
      date: '2025-12-18T00:00:00.000Z',
      endDate: '2025-12-20T00:00:00.000Z',
      type: 'range',
      description: 'Skiing',
      confidence: 0.95,
    },
    description: 'Multi-day activity with date range',
    category: 'activity',
  },
]

/**
 * Restaurant Test Cases (5+)
 */
export const restaurantTestCases: ItineraryTestCase[] = [
  {
    input: 'Dinner reservation Le Jules Verne 8pm',
    expectedResponse: {
      date: new Date().toISOString().split('T')[0] + 'T20:00:00.000Z',
      type: 'absolute',
      description: 'Dinner reservation Le Jules Verne',
      confidence: 0.9,
    },
    description: 'Restaurant reservation with name and time',
    category: 'restaurant',
  },
  {
    input: 'Lunch at bistro 12:30 tomorrow',
    expectedResponse: {
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T12:30:00.000Z',
      type: 'relative',
      description: 'Lunch at bistro',
      confidence: 0.9,
    },
    description: 'Lunch with time and relative date',
    category: 'restaurant',
  },
  {
    input: 'Breakfast at hotel 8am Friday',
    expectedResponse: {
      date: '2025-11-14T08:00:00.000Z', // Next Friday
      type: 'relative',
      description: 'Breakfast at hotel',
      confidence: 0.9,
    },
    description: 'Breakfast with location, time, and weekday',
    category: 'restaurant',
  },
  {
    input: 'Dinner at 7pm Dec 17',
    expectedResponse: {
      date: '2025-12-17T19:00:00.000Z',
      type: 'absolute',
      description: 'Dinner',
      confidence: 0.95,
    },
    description: 'Dinner with time and date',
    category: 'restaurant',
  },
  {
    input: 'Brunch Sunday 11am',
    expectedResponse: {
      date: '2025-11-16T11:00:00.000Z', // Next Sunday
      type: 'relative',
      description: 'Brunch',
      confidence: 0.95,
    },
    description: 'Brunch with weekday and time',
    category: 'restaurant',
  },
]

/**
 * Transportation Test Cases (5+)
 */
export const transportationTestCases: ItineraryTestCase[] = [
  {
    input: 'Train to Amsterdam 10:30am Dec 17',
    expectedResponse: {
      date: '2025-12-17T10:30:00.000Z',
      type: 'absolute',
      description: 'Train to Amsterdam',
      confidence: 0.95,
    },
    description: 'Train with destination, time, and date',
    category: 'transportation',
  },
  {
    input: 'Taxi to airport 6am tomorrow',
    expectedResponse: {
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T06:00:00.000Z',
      type: 'relative',
      description: 'Taxi to airport',
      confidence: 0.95,
    },
    description: 'Taxi with destination, time, and relative date',
    category: 'transportation',
  },
  {
    input: 'Bus to city center 9am',
    expectedResponse: {
      date: new Date().toISOString().split('T')[0] + 'T09:00:00.000Z',
      type: 'absolute',
      description: 'Bus to city center',
      confidence: 0.9,
    },
    description: 'Bus with destination and time',
    category: 'transportation',
  },
  {
    input: 'Rental car pickup Monday 10am',
    expectedResponse: {
      date: '2025-11-17T10:00:00.000Z', // Next Monday
      type: 'relative',
      description: 'Rental car pickup',
      confidence: 0.95,
    },
    description: 'Car rental with weekday and time',
    category: 'transportation',
  },
  {
    input: 'Ferry to island Friday afternoon',
    expectedResponse: {
      date: '2025-11-14T15:00:00.000Z', // Next Friday
      type: 'relative',
      description: 'Ferry to island',
      confidence: 0.85,
    },
    description: 'Ferry with weekday and time of day',
    category: 'transportation',
  },
]

/**
 * Date Parsing Test Cases (10+)
 */
export const dateTestCases: ItineraryTestCase[] = [
  {
    input: 'Monday 9am',
    expectedResponse: {
      date: '2025-11-17T09:00:00.000Z', // Next Monday
      type: 'relative',
      confidence: 0.95,
    },
    description: 'Weekday with time (from Linear CRO-846)',
    category: 'date',
  },
  {
    input: 'Dec 15 3pm',
    expectedResponse: {
      date: '2025-12-15T15:00:00.000Z',
      type: 'absolute',
      confidence: 0.95,
    },
    description: 'Month abbreviation, day, and time (from Linear CRO-846)',
    category: 'date',
  },
  {
    input: 'tomorrow afternoon',
    expectedResponse: {
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T15:00:00.000Z',
      type: 'relative',
      confidence: 0.9,
    },
    description: 'Relative day with time of day (from Linear CRO-846)',
    category: 'date',
  },
  {
    input: 'next Friday 7:30pm',
    expectedResponse: {
      date: '2025-11-21T19:30:00.000Z', // Next Friday (not this Friday)
      type: 'relative',
      confidence: 0.95,
    },
    description: 'Relative weekday with specific time (from Linear CRO-846)',
    category: 'date',
  },
  {
    input: 'Dec 15-20',
    expectedResponse: {
      date: '2025-12-15T00:00:00.000Z',
      endDate: '2025-12-20T00:00:00.000Z',
      type: 'range',
      confidence: 0.95,
    },
    description: 'Date range (from Linear CRO-846)',
    category: 'date',
  },
  {
    input: '2025-12-25 10:00',
    expectedResponse: {
      date: '2025-12-25T10:00:00.000Z',
      type: 'absolute',
      confidence: 0.95,
    },
    description: 'ISO format date with time',
    category: 'date',
  },
  {
    input: 'in 2 hours',
    expectedResponse: {
      date: new Date(Date.now() + 7200000).toISOString(),
      type: 'relative',
      confidence: 0.9,
    },
    description: 'Relative time duration (from Linear CRO-846)',
    category: 'date',
  },
  {
    input: 'Friday 19:00',
    expectedResponse: {
      date: '2025-11-14T19:00:00.000Z', // Next Friday
      type: 'relative',
      confidence: 0.95,
    },
    description: '24-hour time format (from Linear CRO-846)',
    category: 'date',
  },
]

/**
 * Edge Cases (10+)
 */
export const edgeCaseItinerary: ItineraryTestCase[] = [
  {
    input: 'Flight to Paris',
    expectedResponse: {
      date: new Date().toISOString(),
      type: 'absolute',
      description: 'Flight to Paris',
      confidence: 0.6,
    },
    description: 'Missing time (should default to now)',
    category: 'edge_case',
  },
  {
    input: '15/12 vs 12/15',
    expectedResponse: {
      date: '2025-12-15T00:00:00.000Z', // Ambiguous - use date format setting
      type: 'absolute',
      confidence: 0.7,
    },
    description: 'Ambiguous date format (from Linear CRO-846)',
    category: 'edge_case',
  },
  {
    input: 'Museum visit someday',
    expectedResponse: {
      date: new Date().toISOString(),
      type: 'relative',
      description: 'Museum visit',
      confidence: 0.5,
    },
    description: 'Vague time reference',
    category: 'edge_case',
  },
  {
    input: 'Dinner tomorrow but maybe the day after',
    expectedResponse: {
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T00:00:00.000Z',
      type: 'relative',
      description: 'Dinner',
      confidence: 0.6,
    },
    description: 'Ambiguous date with multiple options',
    category: 'edge_case',
  },
  {
    input: 'Tour 2-4pm',
    expectedResponse: {
      date: new Date().toISOString().split('T')[0] + 'T14:00:00.000Z',
      endDate: new Date().toISOString().split('T')[0] + 'T16:00:00.000Z',
      type: 'range',
      description: 'Tour',
      confidence: 0.85,
    },
    description: 'Time range',
    category: 'edge_case',
  },
  {
    input: 'Meeting at 3',
    expectedResponse: {
      date: new Date().toISOString().split('T')[0] + 'T15:00:00.000Z',
      type: 'absolute',
      description: 'Meeting',
      confidence: 0.8,
    },
    description: 'Time without am/pm (assume pm for 3)',
    category: 'edge_case',
  },
]

/**
 * All test cases combined
 */
export const allItineraryTestCases: ItineraryTestCase[] = [
  ...flightTestCases,
  ...hotelTestCases,
  ...activityTestCases,
  ...restaurantTestCases,
  ...transportationTestCases,
  ...dateTestCases,
  ...edgeCaseItinerary,
]

/**
 * Helper to create OpenAI mock response
 */
export function createOpenAIItineraryResponse(testCase: ItineraryTestCase) {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify(testCase.expectedResponse),
        },
      },
    ],
    usage: {
      total_tokens: 120, // Typical token count
    },
  }
}

console.log(`Total itinerary test cases: ${allItineraryTestCases.length}`)
