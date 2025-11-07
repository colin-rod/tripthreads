'use client'

/**
 * ListView Component
 *
 * Displays itinerary items grouped by date in a chronological list format.
 * Features:
 * - Grouped by day with date headers
 * - Time and type display
 * - Click to view/edit items
 * - Compact, scannable layout
 */

import { format, parseISO } from 'date-fns'
import type { ItineraryItemWithParticipants } from '@/../../packages/shared/types/itinerary'
import { groupItineraryItemsByDate } from '@/../../packages/shared/lib/supabase/queries/itinerary'
import { ITINERARY_ITEM_TYPE_CONFIG } from '@/../../packages/shared/constants/itinerary'
import { cn } from '@/lib/utils'
import * as LucideIcons from 'lucide-react'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface ListViewProps {
  items: ItineraryItemWithParticipants[]
  currentUserId: string
  onItemClick?: (item: ItineraryItemWithParticipants) => void
  onEditItem?: (item: ItineraryItemWithParticipants) => void
  onDeleteItem?: (item: ItineraryItemWithParticipants) => void
}

export function ListView({
  items,
  currentUserId,
  onItemClick,
  onEditItem,
  onDeleteItem,
}: ListViewProps) {
  const groupedItems = groupItineraryItemsByDate(items)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <LucideIcons.Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No itinerary items yet</h3>
        <p className="text-muted-foreground">
          Start building your trip itinerary by adding your first item.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {groupedItems.map(group => (
        <div key={group.date}>
          {/* Date header */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              {format(parseISO(group.date), 'EEEE, MMM d, yyyy')}
            </h3>
          </div>

          {/* Items for this day */}
          <div className="space-y-2">
            {group.items.map(item => (
              <ItineraryListItem
                key={item.id}
                item={item}
                currentUserId={currentUserId}
                onClick={() => onItemClick?.(item)}
                onEdit={() => onEditItem?.(item)}
                onDelete={() => onDeleteItem?.(item)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface ItineraryListItemProps {
  item: ItineraryItemWithParticipants
  currentUserId: string
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

function ItineraryListItem({
  item,
  currentUserId,
  onClick,
  onEdit,
  onDelete,
}: ItineraryListItemProps) {
  const config = ITINERARY_ITEM_TYPE_CONFIG[item.type]
  const IconComponent =
    (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[config.icon] ||
    LucideIcons.Calendar

  const startTime = parseISO(item.start_time)
  const timeString = item.is_all_day ? 'All day' : format(startTime, 'h:mm a')

  const canEdit = item.created_by === currentUserId // Simplified - RLS will enforce full rules

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card p-4 transition-all hover:shadow-md cursor-pointer',
        config.bgColor
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Icon and content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div className={cn('mt-1 flex-shrink-0', config.color)}>
            <IconComponent className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3">
              <span className="font-medium text-base">{item.title}</span>
              {!item.is_all_day && (
                <span className="text-sm text-muted-foreground">{timeString}</span>
              )}
            </div>

            {item.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
            )}

            {item.location && (
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <LucideIcons.MapPin className="h-3 w-3" />
                <span className="truncate">{item.location}</span>
              </div>
            )}

            {/* Participants */}
            {item.participants && item.participants.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <LucideIcons.Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {item.participants.length} participant
                  {item.participants.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Type badge and actions */}
        <div className="flex items-start gap-2 flex-shrink-0">
          {/* Type label */}
          <div
            className={cn('px-2 py-1 rounded-md text-xs font-medium', config.bgColor, config.color)}
          >
            {config.label}
          </div>

          {/* Actions menu */}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation()
                    onEdit?.()
                  }}
                >
                  <LucideIcons.Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation()
                    onDelete?.()
                  }}
                  className="text-destructive"
                >
                  <LucideIcons.Trash className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  )
}
