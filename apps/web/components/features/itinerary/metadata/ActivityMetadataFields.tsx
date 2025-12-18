'use client'

/**
 * ActivityMetadataFields Component
 *
 * Form fields for activity-specific metadata (tours, classes, workshops, etc.)
 */

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ActivityMetadata } from '@tripthreads/core'

interface ActivityMetadataFieldsProps {
  metadata: Partial<ActivityMetadata>
  onChange: (metadata: Partial<ActivityMetadata>) => void
  disabled?: boolean
}

const ACTIVITY_TYPES = [
  { value: 'tour', label: 'Tour' },
  { value: 'class', label: 'Class' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'sports', label: 'Sports' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' },
] as const

export function ActivityMetadataFields({
  metadata,
  onChange,
  disabled = false,
}: ActivityMetadataFieldsProps) {
  const updateField = (field: keyof ActivityMetadata, value: string | boolean | undefined) => {
    onChange({
      ...metadata,
      [field]: value === '' ? undefined : value,
    })
  }

  return (
    <div className="space-y-4">
      {/* Activity Type */}
      <div className="space-y-2">
        <Label htmlFor="activity_type">Activity Type</Label>
        <Select
          value={metadata.activity_type || ''}
          onValueChange={value => updateField('activity_type', value)}
          disabled={disabled}
        >
          <SelectTrigger id="activity_type">
            <SelectValue placeholder="Select activity type" />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label htmlFor="duration">Duration</Label>
        <Input
          id="duration"
          value={metadata.duration || ''}
          onChange={e => updateField('duration', e.target.value)}
          disabled={disabled}
          placeholder="e.g., 2 hours, 3.5 hours"
        />
      </div>

      {/* Booking Required Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="booking_required">Booking Required</Label>
        <Switch
          id="booking_required"
          checked={metadata.booking_required || false}
          onCheckedChange={checked => updateField('booking_required', checked)}
          disabled={disabled}
        />
      </div>

      {/* Meeting Point */}
      <div className="space-y-2">
        <Label htmlFor="meeting_point">Meeting Point</Label>
        <Input
          id="meeting_point"
          value={metadata.meeting_point || ''}
          onChange={e => updateField('meeting_point', e.target.value)}
          disabled={disabled}
          placeholder="e.g., Main entrance, hotel lobby"
        />
      </div>

      {/* Difficulty Level & Group Size */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="difficulty_level">Difficulty Level</Label>
          <Input
            id="difficulty_level"
            value={metadata.difficulty_level || ''}
            onChange={e => updateField('difficulty_level', e.target.value)}
            disabled={disabled}
            placeholder="e.g., Easy, Moderate, Hard"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="group_size">Group Size</Label>
          <Input
            id="group_size"
            value={metadata.group_size || ''}
            onChange={e => updateField('group_size', e.target.value)}
            disabled={disabled}
            placeholder="e.g., Max 12 people"
          />
        </div>
      </div>
    </div>
  )
}
