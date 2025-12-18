'use client'

/**
 * SightseeingMetadataFields Component
 *
 * Form fields for sightseeing-specific metadata (attractions, museums, landmarks, etc.)
 */

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import type { SightseeingMetadata } from '@tripthreads/core'

interface SightseeingMetadataFieldsProps {
  metadata: Partial<SightseeingMetadata>
  onChange: (metadata: Partial<SightseeingMetadata>) => void
  disabled?: boolean
}

export function SightseeingMetadataFields({
  metadata,
  onChange,
  disabled = false,
}: SightseeingMetadataFieldsProps) {
  const updateField = (field: keyof SightseeingMetadata, value: string | boolean | undefined) => {
    onChange({
      ...metadata,
      [field]: value === '' ? undefined : value,
    })
  }

  return (
    <div className="space-y-4">
      {/* Attraction Name */}
      <div className="space-y-2">
        <Label htmlFor="attraction_name">Attraction Name</Label>
        <Input
          id="attraction_name"
          value={metadata.attraction_name || ''}
          onChange={e => updateField('attraction_name', e.target.value)}
          disabled={disabled}
          placeholder="e.g., Eiffel Tower, Louvre Museum"
        />
      </div>

      {/* Admission Required Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="admission_required">Admission Required</Label>
        <Switch
          id="admission_required"
          checked={metadata.admission_required || false}
          onCheckedChange={checked => updateField('admission_required', checked)}
          disabled={disabled}
        />
      </div>

      {/* Admission Price (if required) */}
      {metadata.admission_required && (
        <div className="space-y-2">
          <Label htmlFor="admission_price">Admission Price</Label>
          <Input
            id="admission_price"
            value={metadata.admission_price || ''}
            onChange={e => updateField('admission_price', e.target.value)}
            disabled={disabled}
            placeholder="e.g., €15, $25"
          />
        </div>
      )}

      {/* Opening Hours */}
      <div className="space-y-2">
        <Label htmlFor="opening_hours">Opening Hours</Label>
        <Input
          id="opening_hours"
          value={metadata.opening_hours || ''}
          onChange={e => updateField('opening_hours', e.target.value)}
          disabled={disabled}
          placeholder="e.g., 9:00 AM - 6:00 PM"
        />
      </div>

      {/* Recommended Duration */}
      <div className="space-y-2">
        <Label htmlFor="recommended_duration">Recommended Duration</Label>
        <Input
          id="recommended_duration"
          value={metadata.recommended_duration || ''}
          onChange={e => updateField('recommended_duration', e.target.value)}
          disabled={disabled}
          placeholder="e.g., 2-3 hours"
        />
      </div>

      {/* Accessibility Notes */}
      <div className="space-y-2">
        <Label htmlFor="accessibility_notes">Accessibility Notes</Label>
        <Textarea
          id="accessibility_notes"
          value={metadata.accessibility_notes || ''}
          onChange={e => updateField('accessibility_notes', e.target.value)}
          disabled={disabled}
          placeholder="e.g., Wheelchair accessible, elevator available..."
          rows={2}
        />
      </div>
    </div>
  )
}
