'use client'

/**
 * DiningMetadataFields Component
 *
 * Form fields for dining-specific metadata (restaurants, reservations, etc.)
 */

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DiningMetadata } from '@tripthreads/core'

interface DiningMetadataFieldsProps {
  metadata: Partial<DiningMetadata>
  onChange: (metadata: Partial<DiningMetadata>) => void
  disabled?: boolean
}

const PRICE_RANGES = [
  { value: '$', label: '$' },
  { value: '$$', label: '$$' },
  { value: '$$$', label: '$$$' },
  { value: '$$$$', label: '$$$$' },
] as const

export function DiningMetadataFields({
  metadata,
  onChange,
  disabled = false,
}: DiningMetadataFieldsProps) {
  const updateField = (field: keyof DiningMetadata, value: string | boolean | undefined) => {
    onChange({
      ...metadata,
      [field]: value === '' ? undefined : value,
    })
  }

  return (
    <div className="space-y-4">
      {/* Restaurant Name */}
      <div className="space-y-2">
        <Label htmlFor="restaurant_name">Restaurant Name</Label>
        <Input
          id="restaurant_name"
          value={metadata.restaurant_name || ''}
          onChange={e => updateField('restaurant_name', e.target.value)}
          disabled={disabled}
          placeholder="e.g., Le Bernardin"
        />
      </div>

      {/* Cuisine Type & Price Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cuisine_type">Cuisine Type</Label>
          <Input
            id="cuisine_type"
            value={metadata.cuisine_type || ''}
            onChange={e => updateField('cuisine_type', e.target.value)}
            disabled={disabled}
            placeholder="e.g., French, Italian"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price_range">Price Range</Label>
          <Select
            value={metadata.price_range || ''}
            onValueChange={value => updateField('price_range', value)}
            disabled={disabled}
          >
            <SelectTrigger id="price_range">
              <SelectValue placeholder="Select price range" />
            </SelectTrigger>
            <SelectContent>
              {PRICE_RANGES.map(range => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reservation Required Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="reservation_required">Reservation Required</Label>
        <Switch
          id="reservation_required"
          checked={metadata.reservation_required || false}
          onCheckedChange={checked => updateField('reservation_required', checked)}
          disabled={disabled}
        />
      </div>

      {/* Reservation Details */}
      {metadata.reservation_required && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reservation_name">Reservation Name</Label>
              <Input
                id="reservation_name"
                value={metadata.reservation_name || ''}
                onChange={e => updateField('reservation_name', e.target.value)}
                disabled={disabled}
                placeholder="Name on reservation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reservation_time">Reservation Time</Label>
              <Input
                id="reservation_time"
                type="time"
                value={metadata.reservation_time || ''}
                onChange={e => updateField('reservation_time', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>
        </>
      )}

      {/* Dietary Notes */}
      <div className="space-y-2">
        <Label htmlFor="dietary_notes">Dietary Notes</Label>
        <Textarea
          id="dietary_notes"
          value={metadata.dietary_notes || ''}
          onChange={e => updateField('dietary_notes', e.target.value)}
          disabled={disabled}
          placeholder="e.g., Vegetarian, gluten-free, allergies..."
          rows={2}
        />
      </div>
    </div>
  )
}
