'use client'

/**
 * CollapsedMetadataPreview Component
 *
 * Displays 1-2 key metadata fields in the collapsed state of itinerary cards.
 * Shows the most important fields per item type for quick scanning.
 *
 * Features:
 * - Type-specific field selection
 * - Maximum 2 fields displayed
 * - Icons for visual clarity
 * - Compact horizontal layout
 *
 * Related Issue: CRO-929
 */

import type { ItineraryItemWithParticipants } from '@tripthreads/core'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface CollapsedMetadataPreviewProps {
  item: ItineraryItemWithParticipants
}

interface MetadataField {
  icon: LucideIcon
  label: string
  value: string
}

export function CollapsedMetadataPreview({ item }: CollapsedMetadataPreviewProps) {
  const fields = getKeyMetadataFields(item)

  if (fields.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
      {fields.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-1">
          <Icon className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{value}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Extracts the 2 most important metadata fields for each item type
 */
function getKeyMetadataFields(item: ItineraryItemWithParticipants): MetadataField[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata = (item.metadata || {}) as any
  const fields: MetadataField[] = []

  switch (item.type) {
    case 'transport':
      // Priority 1: Route (departure → arrival)
      if (metadata.departure_location && metadata.arrival_location) {
        fields.push({
          icon: LucideIcons.ArrowRight,
          label: 'Route',
          value: `${metadata.departure_location} → ${metadata.arrival_location}`,
        })
      }

      // Priority 2: Terminal or Gate
      if (metadata.terminal) {
        fields.push({
          icon: LucideIcons.MapPin,
          label: 'Terminal',
          value: `Terminal ${metadata.terminal}`,
        })
      } else if (metadata.gate) {
        fields.push({
          icon: LucideIcons.MapPin,
          label: 'Gate',
          value: `Gate ${metadata.gate}`,
        })
      }
      break

    case 'accommodation':
      // Priority 1: Check-in time
      if (metadata.check_in_time) {
        fields.push({
          icon: LucideIcons.Clock,
          label: 'Check-in',
          value: metadata.check_in_time,
        })
      }

      // Priority 2: Room number
      if (metadata.room_number) {
        fields.push({
          icon: LucideIcons.Home,
          label: 'Room',
          value: `Room ${metadata.room_number}`,
        })
      }
      break

    case 'dining':
      // Priority 1: Reservation time
      if (metadata.reservation_time) {
        fields.push({
          icon: LucideIcons.Clock,
          label: 'Reservation',
          value: metadata.reservation_time,
        })
      }

      // Priority 2: Cuisine type
      if (metadata.cuisine_type) {
        fields.push({
          icon: LucideIcons.Utensils,
          label: 'Cuisine',
          value: metadata.cuisine_type,
        })
      }
      break

    case 'activity':
      // Priority 1: Meeting point
      if (metadata.meeting_point) {
        fields.push({
          icon: LucideIcons.MapPin,
          label: 'Meeting Point',
          value: metadata.meeting_point,
        })
      }

      // Priority 2: Duration
      if (metadata.duration) {
        fields.push({
          icon: LucideIcons.Clock,
          label: 'Duration',
          value: metadata.duration,
        })
      }
      break

    case 'sightseeing':
      // Priority 1: Admission price
      if (metadata.admission_price) {
        fields.push({
          icon: LucideIcons.DollarSign,
          label: 'Admission',
          value: metadata.admission_price,
        })
      }

      // Priority 2: Opening hours
      if (metadata.opening_hours) {
        fields.push({
          icon: LucideIcons.Clock,
          label: 'Hours',
          value: metadata.opening_hours,
        })
      }
      break

    case 'general':
      // General items don't have type-specific metadata
      break
  }

  // Limit to 2 fields maximum
  return fields.slice(0, 2)
}
