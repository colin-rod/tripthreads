'use client'

/**
 * DurationBadge Component
 *
 * Displays a calculated duration badge for itinerary items.
 * Shows a Clock icon and human-readable duration (e.g., "2h 30m", "3 days").
 *
 * Features:
 * - Automatically calculates duration from start/end times
 * - Two size variants: sm (default) and md
 * - Returns null for all-day events or missing end_time
 * - Styled with design system colors (gray scale)
 */

import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { calculateDuration } from '@tripthreads/core'

interface DurationBadgeProps {
  startTime: string
  endTime: string | null
  isAllDay: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function DurationBadge({
  startTime,
  endTime,
  isAllDay,
  size = 'sm',
  className,
}: DurationBadgeProps) {
  // Don't show duration for all-day events (use date range instead)
  if (isAllDay || !endTime) {
    return null
  }

  const duration = calculateDuration(startTime, endTime)
  if (!duration) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-gray-100 text-gray-600',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
        className
      )}
    >
      <Clock className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4', 'text-gray-500')} />
      <span>{duration}</span>
    </span>
  )
}
