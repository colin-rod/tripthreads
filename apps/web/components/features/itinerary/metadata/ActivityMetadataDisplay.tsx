/**
 * ActivityMetadataDisplay Component
 *
 * Read-only display of activity-specific metadata for view mode.
 */

import type { ActivityMetadata } from '@tripthreads/core'
import { InfoRow } from '../shared/InfoRow'
import { MapPin, Clock, Users, TrendingUp } from 'lucide-react'

interface ActivityMetadataDisplayProps {
  metadata: ActivityMetadata
}

export function ActivityMetadataDisplay({ metadata }: ActivityMetadataDisplayProps) {
  return (
    <div className="space-y-3">
      {metadata.meeting_point && (
        <InfoRow icon={MapPin} label="Meeting Point" value={metadata.meeting_point} />
      )}

      {metadata.duration && <InfoRow icon={Clock} label="Duration" value={metadata.duration} />}

      {metadata.difficulty_level && (
        <InfoRow
          icon={TrendingUp}
          label="Difficulty"
          value={
            metadata.difficulty_level.charAt(0).toUpperCase() + metadata.difficulty_level.slice(1)
          }
        />
      )}

      {metadata.group_size && (
        <InfoRow icon={Users} label="Group Size" value={`${metadata.group_size} people`} />
      )}

      {metadata.activity_type && (
        <InfoRow
          label="Activity Type"
          value={metadata.activity_type.charAt(0).toUpperCase() + metadata.activity_type.slice(1)}
        />
      )}

      {metadata.booking_required !== undefined && (
        <InfoRow label="Booking Required" value={metadata.booking_required ? 'Yes' : 'No'} />
      )}
    </div>
  )
}
