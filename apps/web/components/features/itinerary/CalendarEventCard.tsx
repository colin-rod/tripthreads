'use client'

/**
 * CalendarEventCard Component
 *
 * Displays a single itinerary item card in the calendar view.
 * Shows type icon, title, time, and location.
 */

import { format, parseISO } from 'date-fns'
import { ITINERARY_ITEM_TYPE_CONFIG } from '@/../../packages/shared/constants/itinerary'
import type { ItineraryItemWithParticipants } from '@/../../packages/shared/types/itinerary'
import { cn } from '@/lib/utils'
import * as LucideIcons from 'lucide-react'

interface CalendarEventCardProps {
  item: ItineraryItemWithParticipants
  isAllDay: boolean
  onClick?: () => void
}

export function CalendarEventCard({ item, isAllDay, onClick }: CalendarEventCardProps) {
  const config = ITINERARY_ITEM_TYPE_CONFIG[item.type]

  // Get icon component dynamically
  const IconComponent =
    (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[config.icon] ||
    LucideIcons.Calendar

  // Format time
  const startTime = parseISO(item.start_time)
  const timeString = isAllDay ? 'All day' : format(startTime, 'h:mm a')

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full h-full rounded-md p-2 text-left transition-all hover:shadow-md',
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
          {!isAllDay && <div className="text-xs text-muted-foreground">{timeString}</div>}
          {item.location && (
            <div className="text-xs text-muted-foreground truncate">{item.location}</div>
          )}
        </div>
      </div>
    </button>
  )
}
