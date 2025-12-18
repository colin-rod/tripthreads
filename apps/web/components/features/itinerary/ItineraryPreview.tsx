'use client'

/**
 * ItineraryPreview Component
 *
 * Displays a simplified preview of itinerary items for the trip detail page.
 * Features:
 * - Shows upcoming/recent itinerary items
 * - Grouped by date
 * - Click to navigate to full plan page
 * - Compact layout optimized for overview
 */

import { format, parseISO } from 'date-fns'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'
import { groupItineraryItemsByDate, ITINERARY_ITEM_TYPE_CONFIG } from '@tripthreads/core'
import { cn } from '@/lib/utils'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { DurationBadge } from './DurationBadge'
import { ItineraryItemTooltip } from './ItineraryItemTooltip'

interface ItineraryPreviewProps {
  items: ItineraryItemWithParticipants[]
  tripId: string
  maxItems?: number
}

export function ItineraryPreview({ items, tripId, maxItems = 5 }: ItineraryPreviewProps) {
  const groupedItems = groupItineraryItemsByDate(items)

  // Limit total items shown
  let itemCount = 0
  const limitedGroups = groupedItems
    .map(group => {
      if (itemCount >= maxItems) return null
      const remainingSlots = maxItems - itemCount
      const limitedItems = group.items.slice(0, remainingSlots)
      itemCount += limitedItems.length
      return {
        ...group,
        items: limitedItems,
      }
    })
    .filter(Boolean) as typeof groupedItems

  if (items.length === 0) {
    return null // Parent will show empty state
  }

  return (
    <div className="space-y-6">
      {limitedGroups.map(group => (
        <div key={group.date}>
          {/* Date header */}
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-muted-foreground">
              {format(parseISO(group.date), 'EEE, MMM d')}
            </h4>
          </div>

          {/* Items for this day */}
          <div className="space-y-2">
            {group.items.map(item => (
              <ItineraryPreviewItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}

      {/* View all link if there are more items */}
      {items.length > maxItems && (
        <div className="pt-2">
          <Link href={`/trips/${tripId}/plan`}>
            <Button variant="ghost" size="sm" className="w-full">
              View all {items.length} items
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* View plan link if showing all items */}
      {items.length <= maxItems && (
        <div className="pt-2">
          <Link href={`/trips/${tripId}/plan`}>
            <Button variant="ghost" size="sm" className="w-full">
              View full itinerary
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

interface ItineraryPreviewItemProps {
  item: ItineraryItemWithParticipants
}

function ItineraryPreviewItem({ item }: ItineraryPreviewItemProps) {
  const config = ITINERARY_ITEM_TYPE_CONFIG[item.type]
  const iconName = config.icon as keyof typeof LucideIcons
  const IconComponent = (LucideIcons[iconName] as LucideIcon | undefined) || LucideIcons.Calendar

  const startTime = parseISO(item.start_time)
  const timeString = item.is_all_day ? 'All day' : format(startTime, 'h:mm a')

  return (
    <ItineraryItemTooltip item={item}>
      <div className={cn('rounded-lg border bg-card p-3 transition-all', 'hover:shadow-sm')}>
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn('mt-0.5 flex-shrink-0', config.color)}>
            <IconComponent className="h-4 w-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-sm truncate">{item.title}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs text-muted-foreground">{timeString}</span>
                <DurationBadge
                  startTime={item.start_time}
                  endTime={item.end_time}
                  isAllDay={item.is_all_day}
                  size="sm"
                />
              </div>
            </div>

            {item.location && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <LucideIcons.MapPin className="h-3 w-3" />
                <span className="truncate">{item.location}</span>
              </div>
            )}
          </div>

          {/* Type badge */}
          <div
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
              config.bgColor,
              config.color
            )}
          >
            {config.label}
          </div>
        </div>
      </div>
    </ItineraryItemTooltip>
  )
}
