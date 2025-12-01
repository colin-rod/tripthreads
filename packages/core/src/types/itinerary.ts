// ============================================================================
// ITINERARY TYPES
// ============================================================================

/**
 * Itinerary item types representing different categories of travel activities
 */
export type ItineraryItemType =
  | 'transport' // Flights, trains, buses, ferries, car rentals
  | 'accommodation' // Hotels, Airbnb, hostels, camping
  | 'dining' // Restaurants, cafes, food tours
  | 'activity' // Tours, experiences, classes, events
  | 'sightseeing' // Landmarks, museums, viewpoints
  | 'general' // General notes, meetings, free time

/**
 * Link object for bookings, confirmations, maps, etc.
 */
export interface ItineraryItemLink {
  title: string
  url: string
}

// ============================================================================
// TYPE-SPECIFIC METADATA INTERFACES
// ============================================================================

/**
 * Metadata for transport items (flights, trains, etc.)
 */
export interface TransportMetadata {
  transport_type?: 'flight' | 'train' | 'bus' | 'ferry' | 'car' | 'other'
  flight_number?: string
  train_number?: string
  departure_location?: string
  arrival_location?: string
  booking_reference?: string
  seat_number?: string
  terminal?: string
  gate?: string
}

/**
 * Metadata for accommodation items (hotels, Airbnb, etc.)
 */
export interface AccommodationMetadata {
  accommodation_type?: 'hotel' | 'airbnb' | 'hostel' | 'camping' | 'resort' | 'other'
  check_in_time?: string
  check_out_time?: string
  confirmation_number?: string
  address?: string
  room_number?: string
  wifi_password?: string
}

/**
 * Metadata for dining items (restaurants, cafes, etc.)
 */
export interface DiningMetadata {
  restaurant_name?: string
  cuisine_type?: string
  price_range?: '$' | '$$' | '$$$' | '$$$$'
  reservation_required?: boolean
  reservation_name?: string
  reservation_time?: string
  dietary_notes?: string
}

/**
 * Metadata for activity items (tours, experiences, etc.)
 */
export interface ActivityMetadata {
  activity_type?: 'tour' | 'class' | 'workshop' | 'sports' | 'entertainment' | 'other'
  duration?: string // e.g., "2 hours", "half day"
  booking_required?: boolean
  meeting_point?: string
  difficulty_level?: 'easy' | 'moderate' | 'hard'
  group_size?: string
}

/**
 * Metadata for sightseeing items (landmarks, museums, etc.)
 */
export interface SightseeingMetadata {
  attraction_name?: string
  admission_required?: boolean
  admission_price?: string
  opening_hours?: string
  recommended_duration?: string
  accessibility_notes?: string
}

/**
 * Union type for all metadata types
 */
export type ItineraryItemMetadata =
  | TransportMetadata
  | AccommodationMetadata
  | DiningMetadata
  | ActivityMetadata
  | SightseeingMetadata
  | Record<string, unknown> // For general type or custom fields

// ============================================================================
// EXTENDED ITINERARY ITEM TYPE
// ============================================================================

/**
 * Extended itinerary item with all fields including participants
 * This is the type used in the application after fetching from the database
 */
export interface ItineraryItemWithParticipants {
  id: string
  trip_id: string
  type: ItineraryItemType
  title: string
  description: string | null
  notes: string | null
  links: ItineraryItemLink[]
  start_time: string // ISO 8601
  end_time: string | null // ISO 8601
  is_all_day: boolean
  location: string | null
  metadata: ItineraryItemMetadata
  created_by: string
  created_at: string
  updated_at: string
  participants?: {
    id: string
    user_id: string
    user?: {
      id: string
      full_name: string | null
      avatar_url: string | null
    }
  }[]
}

/**
 * Input type for creating a new itinerary item
 */
export interface CreateItineraryItemInput {
  trip_id: string
  type: ItineraryItemType
  title: string
  description?: string
  notes?: string
  links?: ItineraryItemLink[]
  start_time: string // ISO 8601
  end_time?: string // ISO 8601
  is_all_day?: boolean
  location?: string
  metadata?: ItineraryItemMetadata
  participant_ids?: string[] // If empty/null, defaults to all trip participants
}

/**
 * Input type for updating an existing itinerary item
 */
export interface UpdateItineraryItemInput {
  type?: ItineraryItemType
  title?: string
  description?: string | null
  notes?: string | null
  links?: ItineraryItemLink[]
  start_time?: string // ISO 8601
  end_time?: string | null // ISO 8601
  is_all_day?: boolean
  location?: string | null
  metadata?: ItineraryItemMetadata
  participant_ids?: string[] // If provided, updates participants
}

/**
 * Filter options for querying itinerary items
 */
export interface ItineraryItemFilters {
  type?: ItineraryItemType | ItineraryItemType[]
  start_date?: string // ISO 8601 date
  end_date?: string // ISO 8601 date
  participant_id?: string // Filter items involving specific participant
  is_all_day?: boolean
}

/**
 * Grouped itinerary items by date for list view
 */
export interface GroupedItineraryItems {
  date: string // ISO 8601 date (YYYY-MM-DD)
  items: ItineraryItemWithParticipants[]
}
