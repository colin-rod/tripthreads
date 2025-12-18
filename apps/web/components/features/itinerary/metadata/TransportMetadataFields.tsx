'use client'

/**
 * TransportMetadataFields Component
 *
 * Form fields for transport-specific metadata (flights, trains, buses, etc.)
 */

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TransportMetadata } from '@tripthreads/core'

interface TransportMetadataFieldsProps {
  metadata: Partial<TransportMetadata>
  onChange: (metadata: Partial<TransportMetadata>) => void
  disabled?: boolean
}

const TRANSPORT_TYPES = [
  { value: 'flight', label: 'Flight' },
  { value: 'train', label: 'Train' },
  { value: 'bus', label: 'Bus' },
  { value: 'ferry', label: 'Ferry' },
  { value: 'car', label: 'Car' },
  { value: 'other', label: 'Other' },
] as const

export function TransportMetadataFields({
  metadata,
  onChange,
  disabled = false,
}: TransportMetadataFieldsProps) {
  const updateField = (field: keyof TransportMetadata, value: string | undefined) => {
    onChange({
      ...metadata,
      [field]: value || undefined,
    })
  }

  return (
    <div className="space-y-4">
      {/* Transport Type */}
      <div className="space-y-2">
        <Label htmlFor="transport_type">Transport Type</Label>
        <Select
          value={metadata.transport_type || ''}
          onValueChange={value => updateField('transport_type', value)}
          disabled={disabled}
        >
          <SelectTrigger id="transport_type">
            <SelectValue placeholder="Select transport type" />
          </SelectTrigger>
          <SelectContent>
            {TRANSPORT_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Flight/Train Numbers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="flight_number">Flight Number</Label>
          <Input
            id="flight_number"
            value={metadata.flight_number || ''}
            onChange={e => updateField('flight_number', e.target.value)}
            disabled={disabled}
            placeholder="e.g., AA123"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="train_number">Train Number</Label>
          <Input
            id="train_number"
            value={metadata.train_number || ''}
            onChange={e => updateField('train_number', e.target.value)}
            disabled={disabled}
            placeholder="e.g., TGV 9212"
          />
        </div>
      </div>

      {/* Departure & Arrival */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="departure_location">Departure</Label>
          <Input
            id="departure_location"
            value={metadata.departure_location || ''}
            onChange={e => updateField('departure_location', e.target.value)}
            disabled={disabled}
            placeholder="e.g., JFK Airport"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="arrival_location">Arrival</Label>
          <Input
            id="arrival_location"
            value={metadata.arrival_location || ''}
            onChange={e => updateField('arrival_location', e.target.value)}
            disabled={disabled}
            placeholder="e.g., CDG Airport"
          />
        </div>
      </div>

      {/* Booking Reference & Seat */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="booking_reference">Booking Reference</Label>
          <Input
            id="booking_reference"
            value={metadata.booking_reference || ''}
            onChange={e => updateField('booking_reference', e.target.value)}
            disabled={disabled}
            placeholder="e.g., ABC123"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="seat_number">Seat Number</Label>
          <Input
            id="seat_number"
            value={metadata.seat_number || ''}
            onChange={e => updateField('seat_number', e.target.value)}
            disabled={disabled}
            placeholder="e.g., 12A"
          />
        </div>
      </div>

      {/* Terminal & Gate */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="terminal">Terminal</Label>
          <Input
            id="terminal"
            value={metadata.terminal || ''}
            onChange={e => updateField('terminal', e.target.value)}
            disabled={disabled}
            placeholder="e.g., 1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gate">Gate</Label>
          <Input
            id="gate"
            value={metadata.gate || ''}
            onChange={e => updateField('gate', e.target.value)}
            disabled={disabled}
            placeholder="e.g., A12"
          />
        </div>
      </div>
    </div>
  )
}
