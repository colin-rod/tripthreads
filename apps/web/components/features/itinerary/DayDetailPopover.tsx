'use client'

import { format } from 'date-fns'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'
import { ITINERARY_ITEM_TYPE_CONFIG } from '@tripthreads/core'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface DayDetailPopoverProps {
  date: Date
  items: ItineraryItemWithParticipants[]
  onViewItem: (item: ItineraryItemWithParticipants) => void
  onNavigateToWeek: (date: Date) => void
  onCreateItem: (date: Date) => void
  onClose: () => void
  canEdit: boolean
}

export function DayDetailPopover({
  date,
  items,
  onViewItem,
  onNavigateToWeek,
  onCreateItem,
  onClose,
  canEdit,
}: DayDetailPopoverProps) {
  // Sort items by start time
  const sortedItems = [...items].sort((a, b) => {
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  })

  const formatTimeRange = (item: ItineraryItemWithParticipants): string => {
    if (item.is_all_day) {
      return 'All day'
    }

    const startTime = format(new Date(item.start_time), 'h:mm a')
    if (item.end_time) {
      const endTime = format(new Date(item.end_time), 'h:mm a')
      return `${startTime} - ${endTime}`
    }

    return startTime
  }

  return (
    <Dialog open={true} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{format(date, 'EEEE, MMMM d, yyyy')}</span>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Items list */}
          {sortedItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items scheduled for this day
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {sortedItems.map(item => {
                const typeConfig = ITINERARY_ITEM_TYPE_CONFIG[item.type]
                return (
                  <div
                    key={item.id}
                    className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Badge
                          variant="outline"
                          className={`${typeConfig.bgColor} ${typeConfig.borderColor} mb-2`}
                        >
                          {typeConfig.label}
                        </Badge>
                        <h4 className="font-medium truncate">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{formatTimeRange(item)}</p>
                        {item.location && (
                          <p className="text-sm text-muted-foreground truncate">{item.location}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onViewItem(item)
                        onClose()
                      }}
                      className="w-full"
                    >
                      View Details
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                onNavigateToWeek(date)
                onClose()
              }}
              className="flex-1"
            >
              View Week
            </Button>
            {canEdit && (
              <Button
                onClick={() => {
                  onCreateItem(date)
                  onClose()
                }}
                className="flex-1"
              >
                Add Item
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
