/**
 * TransportMetadataDisplay Component
 *
 * Read-only display of transport-specific metadata for view mode.
 */

import type { TransportMetadata } from '@tripthreads/core'
import { InfoRow } from '../shared/InfoRow'
import { Plane, MapPin } from 'lucide-react'

interface TransportMetadataDisplayProps {
  metadata: TransportMetadata
}

export function TransportMetadataDisplay({ metadata }: TransportMetadataDisplayProps) {
  return (
    <div className="space-y-3">
      {metadata.transport_type && (
        <InfoRow
          label="Transport Type"
          value={metadata.transport_type.charAt(0).toUpperCase() + metadata.transport_type.slice(1)}
        />
      )}

      {metadata.flight_number && (
        <InfoRow icon={Plane} label="Flight Number" value={metadata.flight_number} />
      )}

      {metadata.train_number && <InfoRow label="Train Number" value={metadata.train_number} />}

      {metadata.departure_location && (
        <InfoRow icon={MapPin} label="Departure" value={metadata.departure_location} />
      )}

      {metadata.arrival_location && (
        <InfoRow icon={MapPin} label="Arrival" value={metadata.arrival_location} />
      )}

      {metadata.booking_reference && (
        <InfoRow label="Booking Reference" value={metadata.booking_reference} />
      )}

      {metadata.seat_number && <InfoRow label="Seat Number" value={metadata.seat_number} />}

      {metadata.terminal && <InfoRow label="Terminal" value={metadata.terminal} />}

      {metadata.gate && <InfoRow label="Gate" value={metadata.gate} />}
    </div>
  )
}
