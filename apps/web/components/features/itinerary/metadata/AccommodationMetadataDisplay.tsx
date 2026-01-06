/**
 * AccommodationMetadataDisplay Component
 *
 * Read-only display of accommodation-specific metadata for view mode.
 */

import type { AccommodationMetadata } from '@tripthreads/core'
import { InfoRow } from '../shared/InfoRow'
import { Building, Clock, MapPin } from 'lucide-react'

interface AccommodationMetadataDisplayProps {
  metadata: AccommodationMetadata
}

export function AccommodationMetadataDisplay({ metadata }: AccommodationMetadataDisplayProps) {
  return (
    <div className="space-y-3">
      {metadata.accommodation_type && (
        <InfoRow
          icon={Building}
          label="Type"
          value={
            metadata.accommodation_type.charAt(0).toUpperCase() +
            metadata.accommodation_type.slice(1)
          }
        />
      )}

      {metadata.address && <InfoRow icon={MapPin} label="Address" value={metadata.address} />}

      {metadata.check_in_time && (
        <InfoRow icon={Clock} label="Check-in Time" value={metadata.check_in_time} />
      )}

      {metadata.check_out_time && (
        <InfoRow icon={Clock} label="Check-out Time" value={metadata.check_out_time} />
      )}

      {metadata.confirmation_number && (
        <InfoRow label="Confirmation Number" value={metadata.confirmation_number} />
      )}

      {metadata.room_number && <InfoRow label="Room Number" value={metadata.room_number} />}

      {metadata.wifi_password && <InfoRow label="WiFi Password" value={metadata.wifi_password} />}
    </div>
  )
}
