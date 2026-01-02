'use client'

/**
 * CalendarEventCard Component
 *
 * Displays a single itinerary item card in the calendar view.
 * Shows type icon, title, time, and location.
 */

import { format, parseISO } from 'date-fns'
import { ITINERARY_ITEM_TYPE_CONFIG } from '@tripthreads/core'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'
import { cn } from '@/lib/utils'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { DurationBadge } from './DurationBadge'
import { ItineraryItemTooltip } from './ItineraryItemTooltip'

interface CalendarEventCardProps {
  item: ItineraryItemWithParticipants
  isAllDay: boolean
  onClick?: () => void
}

export function CalendarEventCard({ item, isAllDay, onClick }: CalendarEventCardProps) {
  const config = ITINERARY_ITEM_TYPE_CONFIG[item.type]

  // Get icon component dynamically
  const iconName = config.icon as keyof typeof LucideIcons
  const IconComponent = (LucideIcons[iconName] as LucideIcon | undefined) || LucideIcons.Calendar

  // Format time
  const startTime = parseISO(item.start_time)
  const timeString = isAllDay ? 'All day' : format(startTime, 'h:mm a')

  return (
    <ItineraryItemTooltip item={item}>
      <button
        onClick={onClick}
        className={cn(
          'w-full h-full rounded-md p-2 text-left shadow-sm transition-all hover:shadow-md',
          'border-l-4 cursor-pointer',
          config.bgColor,
          config.borderColor,
          isAllDay ? 'min-h-[40px]' : 'overflow-hidden'
        )}
      >
        <div className="flex items-start gap-2">
          <IconComponent className={cn('h-4 w-4 flex-shrink-0 mt-0.5', config.color)} />
          <div className="flex-1 min-w-0">
            <div className={cn('font-medium text-sm truncate', config.color)}>{item.title}</div>
            <div className="flex items-center gap-2">
              {!isAllDay && <div className="text-xs text-muted-foreground">{timeString}</div>}
              <DurationBadge
                startTime={item.start_time}
                endTime={item.end_time}
                isAllDay={isAllDay}
                size="sm"
              />
            </div>
            {item.location && (
              <div className="text-xs text-muted-foreground truncate">{item.location}</div>
            )}
          </div>
        </div>
      </button>
    </ItineraryItemTooltip>
  )
}
