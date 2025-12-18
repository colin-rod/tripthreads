'use client'

/**
 * AccommodationMetadataFields Component
 *
 * Form fields for accommodation-specific metadata (hotels, airbnb, etc.)
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
import type { AccommodationMetadata } from '@tripthreads/core'

interface AccommodationMetadataFieldsProps {
  metadata: Partial<AccommodationMetadata>
  onChange: (metadata: Partial<AccommodationMetadata>) => void
  disabled?: boolean
}

const ACCOMMODATION_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'camping', label: 'Camping' },
  { value: 'resort', label: 'Resort' },
  { value: 'other', label: 'Other' },
] as const

export function AccommodationMetadataFields({
  metadata,
  onChange,
  disabled = false,
}: AccommodationMetadataFieldsProps) {
  const updateField = (field: keyof AccommodationMetadata, value: string | undefined) => {
    onChange({
      ...metadata,
      [field]: value || undefined,
    })
  }

  return (
    <div className="space-y-4">
      {/* Accommodation Type */}
      <div className="space-y-2">
        <Label htmlFor="accommodation_type">Accommodation Type</Label>
        <Select
          value={metadata.accommodation_type || ''}
          onValueChange={value => updateField('accommodation_type', value)}
          disabled={disabled}
        >
          <SelectTrigger id="accommodation_type">
            <SelectValue placeholder="Select accommodation type" />
          </SelectTrigger>
          <SelectContent>
            {ACCOMMODATION_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Check-in & Check-out Times */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="check_in_time">Check-in Time</Label>
          <Input
            id="check_in_time"
            type="time"
            value={metadata.check_in_time || ''}
            onChange={e => updateField('check_in_time', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="check_out_time">Check-out Time</Label>
          <Input
            id="check_out_time"
            type="time"
            value={metadata.check_out_time || ''}
            onChange={e => updateField('check_out_time', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Confirmation Number */}
      <div className="space-y-2">
        <Label htmlFor="confirmation_number">Confirmation Number</Label>
        <Input
          id="confirmation_number"
          value={metadata.confirmation_number || ''}
          onChange={e => updateField('confirmation_number', e.target.value)}
          disabled={disabled}
          placeholder="e.g., CONF123456"
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={metadata.address || ''}
          onChange={e => updateField('address', e.target.value)}
          disabled={disabled}
          placeholder="e.g., 123 Main St, Paris, France"
        />
      </div>

      {/* Room Number & WiFi Password */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="room_number">Room Number</Label>
          <Input
            id="room_number"
            value={metadata.room_number || ''}
            onChange={e => updateField('room_number', e.target.value)}
            disabled={disabled}
            placeholder="e.g., 305"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wifi_password">WiFi Password</Label>
          <Input
            id="wifi_password"
            type="password"
            value={metadata.wifi_password || ''}
            onChange={e => updateField('wifi_password', e.target.value)}
            disabled={disabled}
            placeholder="WiFi password"
          />
        </div>
      </div>
    </div>
  )
}
