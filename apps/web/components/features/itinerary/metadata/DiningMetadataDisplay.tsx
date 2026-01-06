/**
 * DiningMetadataDisplay Component
 *
 * Read-only display of dining-specific metadata for view mode.
 */

import type { DiningMetadata } from '@tripthreads/core'
import { InfoRow } from '../shared/InfoRow'
import { UtensilsCrossed, Clock, DollarSign } from 'lucide-react'

interface DiningMetadataDisplayProps {
  metadata: DiningMetadata
}

export function DiningMetadataDisplay({ metadata }: DiningMetadataDisplayProps) {
  return (
    <div className="space-y-3">
      {metadata.cuisine_type && (
        <InfoRow icon={UtensilsCrossed} label="Cuisine" value={metadata.cuisine_type} />
      )}

      {metadata.reservation_time && (
        <InfoRow icon={Clock} label="Reservation Time" value={metadata.reservation_time} />
      )}

      {metadata.reservation_name && (
        <InfoRow label="Reservation Name" value={metadata.reservation_name} />
      )}

      {metadata.price_range && (
        <InfoRow icon={DollarSign} label="Price Range" value={metadata.price_range} />
      )}

      {metadata.reservation_required !== undefined && (
        <InfoRow
          label="Reservation Required"
          value={metadata.reservation_required ? 'Yes' : 'No'}
        />
      )}

      {metadata.dietary_notes && <InfoRow label="Dietary Notes" value={metadata.dietary_notes} />}
    </div>
  )
}
