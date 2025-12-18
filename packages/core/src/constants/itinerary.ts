import type { ItineraryItemType } from '../types/itinerary'

// ============================================================================
// ITINERARY ITEM TYPE CONFIGURATION
// ============================================================================

/**
 * Configuration for each itinerary item type including display properties
 */
export interface ItineraryItemTypeConfig {
  label: string
  icon: string // lucide-react icon name
  color: string // Tailwind color class
  bgColor: string // Background color class
  borderColor: string // Border color class
  description: string
}

/**
 * Type configuration map
 * Icons are from lucide-react: https://lucide.dev/
 */
export const ITINERARY_ITEM_TYPE_CONFIG: Record<ItineraryItemType, ItineraryItemTypeConfig> = {
  transport: {
    label: 'Transport',
    icon: 'Plane', // Also: Train, Bus, Ship, Car
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Flights, trains, buses, and other transportation',
  },
  accommodation: {
    label: 'Accommodation',
    icon: 'Hotel',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Hotels, Airbnb, hostels, and lodging',
  },
  dining: {
    label: 'Dining',
    icon: 'UtensilsCrossed', // Also: Coffee, Wine
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Restaurants, cafes, and food experiences',
  },
  activity: {
    label: 'Activity',
    icon: 'Ticket',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Tours, classes, sports, and experiences',
  },
  sightseeing: {
    label: 'Sightseeing',
    icon: 'Camera',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    description: 'Museums, landmarks, and attractions',
  },
  general: {
    label: 'General',
    icon: 'Calendar',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: 'Meetings, reminders, and other items',
  },
}

/**
 * Transport type icons for more specific display
 */
export const TRANSPORT_TYPE_ICONS: Record<string, string> = {
  flight: 'Plane',
  train: 'Train',
  bus: 'Bus',
  ferry: 'Ship',
  car: 'Car',
  other: 'Navigation',
}

/**
 * Accommodation type icons
 */
export const ACCOMMODATION_TYPE_ICONS: Record<string, string> = {
  hotel: 'Hotel',
  airbnb: 'Home',
  hostel: 'Users',
  camping: 'Tent',
  resort: 'Palmtree',
  other: 'Building',
}

/**
 * Get the appropriate icon for a transport item based on its metadata
 */
export function getTransportIcon(metadata?: { transport_type?: string }): string {
  if (!metadata?.transport_type) {
    return ITINERARY_ITEM_TYPE_CONFIG.transport.icon
  }
  return TRANSPORT_TYPE_ICONS[metadata.transport_type] || ITINERARY_ITEM_TYPE_CONFIG.transport.icon
}

/**
 * Get the appropriate icon for an accommodation item based on its metadata
 */
export function getAccommodationIcon(metadata?: { accommodation_type?: string }): string {
  if (!metadata?.accommodation_type) {
    return ITINERARY_ITEM_TYPE_CONFIG.accommodation.icon
  }
  return (
    ACCOMMODATION_TYPE_ICONS[metadata.accommodation_type] ||
    ITINERARY_ITEM_TYPE_CONFIG.accommodation.icon
  )
}

// ============================================================================
// CALENDAR VIEW CONSTANTS
// ============================================================================

/**
 * Hours to display in calendar view
 */
export const CALENDAR_START_HOUR = 0 // 00:00
export const CALENDAR_END_HOUR = 24 // 24:00
export const CALENDAR_HOUR_HEIGHT = 60 // pixels per hour

/**
 * Days of week for calendar header
 */
export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export const DAYS_OF_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

/**
 * Maximum length for various fields
 */
export const MAX_TITLE_LENGTH = 200
export const MAX_DESCRIPTION_LENGTH = 1000
export const MAX_NOTES_LENGTH = 5000
export const MAX_LOCATION_LENGTH = 200
export const MAX_LINKS = 10

/**
 * Time formats
 */
export const TIME_FORMAT_12H = 'h:mm a' // 9:00 AM
export const TIME_FORMAT_24H = 'HH:mm' // 09:00
export const DATE_FORMAT = 'MMM d, yyyy' // Jan 1, 2025
export const DATETIME_FORMAT = 'MMM d, yyyy h:mm a' // Jan 1, 2025 9:00 AM

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default values for new itinerary items
 */
export const DEFAULT_ITINERARY_ITEM = {
  type: 'activity' as ItineraryItemType,
  is_all_day: false,
  links: [],
  metadata: {},
}

/**
 * Default duration for different item types (in hours)
 */
export const DEFAULT_DURATION_BY_TYPE: Record<ItineraryItemType, number> = {
  transport: 2, // 2 hours for flights/trains
  accommodation: 24, // 1 day for check-in to check-out
  dining: 1.5, // 1.5 hours for meals
  activity: 2, // 2 hours for activities
  sightseeing: 1, // 1 hour for sightseeing
  general: 1, // 1 hour default
}
