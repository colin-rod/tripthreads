/**
 * Trip utility functions
 *
 * Helpers for filtering, categorizing, and managing trips
 */

export interface Trip {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  cover_image_url: string | null
  owner_id: string
  created_at: string
  updated_at: string
  owner: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  trip_participants: Array<{
    id: string
    role: string
    user: {
      id: string
      full_name: string | null
      avatar_url: string | null
    }
  }>
}

export type TripStatus = 'upcoming' | 'ongoing' | 'past'

export interface CategorizedTrips {
  upcoming: Trip[]
  ongoing: Trip[]
  past: Trip[]
}

/**
 * Determines the status of a trip based on its dates
 *
 * @param trip - Trip object with start_date and end_date
 * @returns Trip status: 'upcoming', 'ongoing', or 'past'
 */
export function getTripStatus(trip: Trip): TripStatus {
  const now = new Date()
  const startDate = new Date(trip.start_date)
  const endDate = new Date(trip.end_date)

  // Set time to start of day for comparison
  now.setHours(0, 0, 0, 0)
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)

  if (now < startDate) {
    return 'upcoming'
  } else if (now >= startDate && now <= endDate) {
    return 'ongoing'
  } else {
    return 'past'
  }
}

/**
 * Categorizes an array of trips into upcoming, ongoing, and past
 *
 * @param trips - Array of trips to categorize
 * @returns Object with trips organized by status
 */
export function categorizeTrips(trips: Trip[]): CategorizedTrips {
  const categorized: CategorizedTrips = {
    upcoming: [],
    ongoing: [],
    past: [],
  }

  trips.forEach(trip => {
    const status = getTripStatus(trip)
    categorized[status].push(trip)
  })

  return categorized
}

/**
 * Filters trips based on a search query
 *
 * Searches across trip name, description, and location (extracted from description)
 *
 * @param trips - Array of trips to filter
 * @param query - Search query string
 * @returns Filtered array of trips
 */
export function filterTrips(trips: Trip[], query: string): Trip[] {
  if (!query.trim()) {
    return trips
  }

  const normalizedQuery = query.toLowerCase().trim()

  return trips.filter(trip => {
    // Search in trip name
    if (trip.name.toLowerCase().includes(normalizedQuery)) {
      return true
    }

    // Search in trip description
    if (trip.description && trip.description.toLowerCase().includes(normalizedQuery)) {
      return true
    }

    return false
  })
}

/**
 * Filters and categorizes trips based on a search query
 *
 * @param trips - Array of trips to filter and categorize
 * @param query - Search query string
 * @returns Object with filtered trips organized by status
 */
export function filterAndCategorizeTrips(trips: Trip[], query: string): CategorizedTrips {
  const filteredTrips = filterTrips(trips, query)
  return categorizeTrips(filteredTrips)
}
