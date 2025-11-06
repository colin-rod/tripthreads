/**
 * Unit tests for trip utility functions
 *
 * Tests filtering, categorization, and status determination
 */

import { describe, it, expect } from '@jest/globals'
import {
  getTripStatus,
  categorizeTrips,
  filterTrips,
  filterAndCategorizeTrips,
  type Trip,
} from '@/lib/utils/trip-utils'

// Helper to create mock trip
const createMockTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: '123',
  name: 'Test Trip',
  description: 'A test trip to Paris',
  start_date: '2025-06-01',
  end_date: '2025-06-10',
  cover_image_url: null,
  owner_id: 'user-1',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  owner: {
    id: 'user-1',
    full_name: 'John Doe',
    avatar_url: null,
  },
  trip_participants: [],
  ...overrides,
})

describe('getTripStatus', () => {
  it('returns "upcoming" for trips that start in the future', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 10)

    const trip = createMockTrip({
      start_date: futureDate.toISOString(),
      end_date: new Date(futureDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    expect(getTripStatus(trip)).toBe('upcoming')
  })

  it('returns "ongoing" for trips happening today', () => {
    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const trip = createMockTrip({
      start_date: today.toISOString(),
      end_date: nextWeek.toISOString(),
    })

    expect(getTripStatus(trip)).toBe('ongoing')
  })

  it('returns "ongoing" for trips that started yesterday and end tomorrow', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const trip = createMockTrip({
      start_date: yesterday.toISOString(),
      end_date: tomorrow.toISOString(),
    })

    expect(getTripStatus(trip)).toBe('ongoing')
  })

  it('returns "past" for trips that ended yesterday', () => {
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const trip = createMockTrip({
      start_date: lastWeek.toISOString(),
      end_date: yesterday.toISOString(),
    })

    expect(getTripStatus(trip)).toBe('past')
  })
})

describe('categorizeTrips', () => {
  it('categorizes trips correctly into upcoming, ongoing, and past', () => {
    const today = new Date()

    const upcomingTrip = createMockTrip({
      id: '1',
      name: 'Future Trip',
      start_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(today.getTime() + 17 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const ongoingTrip = createMockTrip({
      id: '2',
      name: 'Current Trip',
      start_date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const pastTrip = createMockTrip({
      id: '3',
      name: 'Past Trip',
      start_date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const categorized = categorizeTrips([upcomingTrip, ongoingTrip, pastTrip])

    expect(categorized.upcoming).toHaveLength(1)
    expect(categorized.upcoming[0].id).toBe('1')

    expect(categorized.ongoing).toHaveLength(1)
    expect(categorized.ongoing[0].id).toBe('2')

    expect(categorized.past).toHaveLength(1)
    expect(categorized.past[0].id).toBe('3')
  })

  it('returns empty arrays for empty input', () => {
    const categorized = categorizeTrips([])

    expect(categorized.upcoming).toEqual([])
    expect(categorized.ongoing).toEqual([])
    expect(categorized.past).toEqual([])
  })
})

describe('filterTrips', () => {
  const trips = [
    createMockTrip({
      id: '1',
      name: 'Paris Adventure',
      description: 'Exploring the City of Light',
    }),
    createMockTrip({ id: '2', name: 'Tokyo Trip', description: 'Sushi and temples' }),
    createMockTrip({ id: '3', name: 'London Weekend', description: 'Museums and tea' }),
  ]

  it('returns all trips when query is empty', () => {
    expect(filterTrips(trips, '')).toHaveLength(3)
    expect(filterTrips(trips, '   ')).toHaveLength(3)
  })

  it('filters trips by name (case-insensitive)', () => {
    const results = filterTrips(trips, 'paris')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Paris Adventure')
  })

  it('filters trips by name with partial match', () => {
    const results = filterTrips(trips, 'trip')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Tokyo Trip')
  })

  it('filters trips by description', () => {
    const results = filterTrips(trips, 'museums')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('London Weekend')
  })

  it('returns multiple matches when appropriate', () => {
    const results = filterTrips(trips, 'e')
    // Should match "Paris Adventure", "Tokyo Trip" (description), "London Weekend"
    expect(results.length).toBeGreaterThan(0)
  })

  it('returns empty array when no matches', () => {
    const results = filterTrips(trips, 'Antarctica')
    expect(results).toEqual([])
  })

  it('handles trips with null description', () => {
    const tripsWithNull = [
      createMockTrip({ id: '1', name: 'Trip One', description: null }),
      createMockTrip({ id: '2', name: 'Trip Two', description: 'Has description' }),
    ]

    const results = filterTrips(tripsWithNull, 'trip')
    expect(results).toHaveLength(2)
  })
})

describe('filterAndCategorizeTrips', () => {
  it('filters and categorizes trips in one operation', () => {
    const today = new Date()

    const trips = [
      createMockTrip({
        id: '1',
        name: 'Paris Trip',
        description: 'Exploring Paris',
        start_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(today.getTime() + 17 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      createMockTrip({
        id: '2',
        name: 'Tokyo Adventure',
        description: 'Exploring Tokyo',
        start_date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      createMockTrip({
        id: '3',
        name: 'London Vacation',
        description: 'Exploring London',
        start_date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ]

    const result = filterAndCategorizeTrips(trips, 'Paris')

    // Should only match "Paris Trip"
    expect(result.upcoming).toHaveLength(1)
    expect(result.upcoming[0].name).toBe('Paris Trip')
    expect(result.ongoing).toHaveLength(0)
    expect(result.past).toHaveLength(0)
  })

  it('returns all categorized trips when query is empty', () => {
    const today = new Date()

    const trips = [
      createMockTrip({
        id: '1',
        start_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(today.getTime() + 17 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ]

    const result = filterAndCategorizeTrips(trips, '')

    expect(result.upcoming).toHaveLength(1)
  })
})
