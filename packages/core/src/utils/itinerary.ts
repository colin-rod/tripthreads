/**
 * Itinerary Utility Functions
 *
 * Core utilities for itinerary item display and formatting:
 * - Duration calculation (human-readable formats)
 * - Metadata extraction (type-specific key fields for tooltips)
 * - Booking reference formatting (badges)
 */

import { differenceInMinutes, differenceInDays, parseISO } from 'date-fns'
import type {
  ItineraryItemWithParticipants,
  ItineraryItemType,
  ItineraryItemMetadata,
} from '../types/itinerary'

/**
 * Calculate human-readable duration between start and end times
 *
 * @param startTime - ISO 8601 date string
 * @param endTime - ISO 8601 date string or null
 * @returns Formatted duration (e.g., "2h 30m", "3 days") or null if no end_time
 *
 * Examples:
 * - Same day, 2h 30m: "2h 30m"
 * - Same day, 3h exact: "3h"
 * - Same day, 45m: "45m"
 * - Multi-day, 1 day: "1 day"
 * - Multi-day, 3 days: "3 days"
 */
export function calculateDuration(startTime: string, endTime: string | null): string | null {
  if (!endTime) return null

  const start = parseISO(startTime)
  const end = parseISO(endTime)

  const totalMinutes = differenceInMinutes(end, start)
  const days = differenceInDays(end, start)

  // Multi-day duration
  if (days >= 1) {
    return days === 1 ? '1 day' : `${days} days`
  }

  // Same-day duration
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes}m`
  }

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}

/**
 * Extract key metadata for tooltip display
 *
 * Returns 4-6 formatted strings based on item type, showing the most
 * relevant information for quick reference (flight numbers, terminals,
 * confirmation codes, etc.)
 *
 * @param item - Itinerary item with participants
 * @returns Array of formatted strings (empty if no relevant metadata)
 *
 * Type-specific fields:
 * - Transport: Flight/train number, route, terminal/gate, booking ref
 * - Accommodation: Confirmation, check-in/out times, address, room
 * - Dining: Reservation, cuisine + price range
 * - Activity: Meeting point, duration, difficulty, group size
 * - Sightseeing: Admission, opening hours, recommended duration
 * - General: (no metadata displayed)
 */
export function getKeyMetadata(item: ItineraryItemWithParticipants): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata = (item.metadata || {}) as any // Type assertion to handle union type
  const result: string[] = []

  switch (item.type) {
    case 'transport':
      // Flight or train number
      if (metadata.flight_number) {
        result.push(`Flight ${metadata.flight_number}`)
      } else if (metadata.train_number) {
        result.push(`Train ${metadata.train_number}`)
      }

      // Route (departure → arrival)
      if (metadata.departure_location && metadata.arrival_location) {
        result.push(`${metadata.departure_location} → ${metadata.arrival_location}`)
      }

      // Terminal and gate
      if (metadata.terminal && metadata.gate) {
        result.push(`Terminal ${metadata.terminal} • Gate ${metadata.gate}`)
      } else if (metadata.terminal) {
        result.push(`Terminal ${metadata.terminal}`)
      }

      // Booking reference
      if (metadata.booking_reference) {
        result.push(`Booking: ${metadata.booking_reference}`)
      }
      break

    case 'accommodation':
      // Confirmation number
      if (metadata.confirmation_number) {
        result.push(`Conf: ${metadata.confirmation_number}`)
      }

      // Check-in time
      if (metadata.check_in_time) {
        result.push(`Check-in: ${metadata.check_in_time}`)
      }

      // Address
      if (metadata.address) {
        result.push(metadata.address)
      }
      break

    case 'dining':
      // Reservation name
      if (metadata.reservation_name) {
        result.push(`Reservation: ${metadata.reservation_name}`)
      }

      // Cuisine and price range (only if both present)
      if (metadata.cuisine_type && metadata.price_range) {
        result.push(`${metadata.cuisine_type} • ${metadata.price_range}`)
      }
      break

    case 'activity':
      // Meeting point
      if (metadata.meeting_point) {
        result.push(`Meet: ${metadata.meeting_point}`)
      }

      // Duration
      if (metadata.duration) {
        result.push(`Duration: ${metadata.duration}`)
      }

      // Difficulty level
      if (metadata.difficulty_level) {
        result.push(`Difficulty: ${metadata.difficulty_level}`)
      }

      // Group size
      if (metadata.group_size) {
        result.push(`Group Size: ${metadata.group_size}`)
      }
      break

    case 'sightseeing':
      // Admission price
      if (metadata.admission_price) {
        result.push(`Admission: ${metadata.admission_price}`)
      }

      // Opening hours
      if (metadata.opening_hours) {
        result.push(`Open: ${metadata.opening_hours}`)
      }
      break

    case 'general':
      // No metadata displayed for general items
      break
  }

  return result
}

/**
 * Format booking reference for badge display
 *
 * Returns a compact reference string for display in badges, or null
 * if the item type doesn't have booking references.
 *
 * @param type - Itinerary item type
 * @param metadata - Item metadata object
 * @returns Formatted reference (e.g., "Flight TP123", "Conf: ABC123") or null
 *
 * Supported types:
 * - Transport: "Flight {number}" or "Train {number}"
 * - Accommodation: "Conf: {confirmation}"
 * - Others: null
 */
export function formatBookingReference(
  type: ItineraryItemType,
  metadata: ItineraryItemMetadata | undefined
): string | null {
  if (!metadata) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = metadata as any // Type assertion to handle union type

  if (type === 'transport') {
    if (meta.flight_number) return `Flight ${meta.flight_number}`
    if (meta.train_number) return `Train ${meta.train_number}`
  }

  if (type === 'accommodation' && meta.confirmation_number) {
    return `Conf: ${meta.confirmation_number}`
  }

  return null
}
