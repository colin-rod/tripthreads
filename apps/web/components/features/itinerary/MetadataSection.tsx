'use client'

/**
 * MetadataSection Component
 *
 * Displays type-specific metadata in a grid layout for expanded list items.
 * Shows key-value pairs based on the item type (transport, accommodation, etc.).
 *
 * Features:
 * - Grid layout (2 columns) for key-value pairs
 * - Type-specific field selection
 * - Returns null if no metadata fields present
 * - Styled with muted labels and readable values
 */

import type { ItineraryItemWithParticipants } from '@tripthreads/core'

interface MetadataSectionProps {
  item: ItineraryItemWithParticipants
}

export function MetadataSection({ item }: MetadataSectionProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata = (item.metadata || {}) as any // Type assertion to handle union type
  const fields: [string, string][] = []

  // Extract type-specific fields
  switch (item.type) {
    case 'transport':
      if (metadata.departure_location && metadata.arrival_location) {
        fields.push(['Route', `${metadata.departure_location} → ${metadata.arrival_location}`])
      }
      if (metadata.terminal) fields.push(['Terminal', metadata.terminal])
      if (metadata.gate) fields.push(['Gate', metadata.gate])
      if (metadata.seat_number) fields.push(['Seat', metadata.seat_number])
      if (metadata.booking_reference) fields.push(['Booking Ref', metadata.booking_reference])
      break

    case 'accommodation':
      if (metadata.check_in_time) fields.push(['Check-in', metadata.check_in_time])
      if (metadata.check_out_time) fields.push(['Check-out', metadata.check_out_time])
      if (metadata.room_number) fields.push(['Room', metadata.room_number])
      if (metadata.address) fields.push(['Address', metadata.address])
      break

    case 'dining':
      if (metadata.reservation_time) fields.push(['Reservation', metadata.reservation_time])
      if (metadata.cuisine_type) fields.push(['Cuisine', metadata.cuisine_type])
      if (metadata.price_range) fields.push(['Price', metadata.price_range])
      if (metadata.dietary_notes) fields.push(['Dietary', metadata.dietary_notes])
      break

    case 'activity':
      if (metadata.meeting_point) fields.push(['Meeting Point', metadata.meeting_point])
      if (metadata.duration) fields.push(['Duration', metadata.duration])
      if (metadata.difficulty_level) fields.push(['Difficulty', metadata.difficulty_level])
      if (metadata.group_size) fields.push(['Group Size', metadata.group_size])
      break

    case 'sightseeing':
      if (metadata.admission_price) fields.push(['Admission', metadata.admission_price])
      if (metadata.opening_hours) fields.push(['Hours', metadata.opening_hours])
      if (metadata.recommended_duration)
        fields.push(['Suggested Duration', metadata.recommended_duration])
      break

    case 'general':
      // No metadata displayed for general items
      break
  }

  if (fields.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-2">
        {item.type.charAt(0).toUpperCase() + item.type.slice(1)} Details
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {fields.map(([label, value]) => (
          <div key={label} className="contents">
            <span className="text-muted-foreground">{label}:</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
