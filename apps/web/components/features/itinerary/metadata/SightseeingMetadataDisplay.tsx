/**
 * SightseeingMetadataDisplay Component
 *
 * Read-only display of sightseeing-specific metadata for view mode.
 */

import type { SightseeingMetadata } from '@tripthreads/core'
import { InfoRow } from '../shared/InfoRow'
import { DollarSign, Clock } from 'lucide-react'

interface SightseeingMetadataDisplayProps {
  metadata: SightseeingMetadata
}

export function SightseeingMetadataDisplay({ metadata }: SightseeingMetadataDisplayProps) {
  return (
    <div className="space-y-3">
      {metadata.admission_price && (
        <InfoRow icon={DollarSign} label="Admission Price" value={metadata.admission_price} />
      )}

      {metadata.opening_hours && (
        <InfoRow icon={Clock} label="Opening Hours" value={metadata.opening_hours} />
      )}

      {metadata.recommended_duration && (
        <InfoRow icon={Clock} label="Recommended Duration" value={metadata.recommended_duration} />
      )}

      {metadata.attraction_name && (
        <InfoRow label="Attraction Name" value={metadata.attraction_name} />
      )}

      {metadata.admission_required !== undefined && (
        <InfoRow label="Admission Required" value={metadata.admission_required ? 'Yes' : 'No'} />
      )}

      {metadata.accessibility_notes && (
        <InfoRow label="Accessibility Notes" value={metadata.accessibility_notes} />
      )}
    </div>
  )
}
