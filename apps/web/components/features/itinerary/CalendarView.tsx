'use client'

/**
 * CalendarView Component
 *
 * Displays itinerary items in a weekly calendar grid with hourly time slots.
 * Features:
 * - 7-day week view (configurable start day)
 * - Hourly time slots from 00:00 to 24:00
 * - All-day events displayed at top
 * - Multi-day events spanning columns
 * - Click to view/edit items
 */

import { useState, useMemo } from 'react'
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'
import {
  CALENDAR_START_HOUR,
  CALENDAR_END_HOUR,
  CALENDAR_HOUR_HEIGHT,
  DAYS_OF_WEEK_SHORT,
  separateAllDayEvents,
} from '@tripthreads/core'
import { CalendarEventCard } from './CalendarEventCard'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarViewProps {
  items: ItineraryItemWithParticipants[]
  tripId: string
  tripStartDate: string // ISO string
  tripEndDate: string // ISO string
  currentUserId: string
  onItemClick?: (item: ItineraryItemWithParticipants) => void
}

export function CalendarView({ items, tripStartDate, onItemClick }: CalendarViewProps) {
  // Start with the first week of the trip
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return startOfWeek(parseISO(tripStartDate), { weekStartsOn: 0 }) // Sunday
  })

  // Generate array of 7 days for the week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  }, [currentWeekStart])

  // Separate all-day and timed events
  const { allDay: allDayItems, timed: timedItems } = useMemo(() => {
    return separateAllDayEvents(items)
  }, [items])

  // Filter items for current week
  const weekItems = useMemo(() => {
    const weekEnd = addDays(currentWeekStart, 7)
    return timedItems.filter(item => {
      const itemDate = parseISO(item.start_time)
      return itemDate >= currentWeekStart && itemDate < weekEnd
    })
  }, [timedItems, currentWeekStart])

  const weekAllDayItems = useMemo(() => {
    const weekEnd = addDays(currentWeekStart, 7)
    return allDayItems.filter(item => {
      const itemDate = parseISO(item.start_time)
      return itemDate >= currentWeekStart && itemDate < weekEnd
    })
  }, [allDayItems, currentWeekStart])

  // Navigate weeks
  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, -7))
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7))
  }

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))
  }

  // Group timed items by day
  const itemsByDay = useMemo(() => {
    const grouped: Record<string, ItineraryItemWithParticipants[]> = {}
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      grouped[dayKey] = weekItems.filter(item => {
        const itemDate = parseISO(item.start_time)
        return isSameDay(itemDate, day)
      })
    })
    return grouped
  }, [weekDays, weekItems])

  // Group all-day items by day
  const allDayItemsByDay = useMemo(() => {
    const grouped: Record<string, ItineraryItemWithParticipants[]> = {}
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      grouped[dayKey] = weekAllDayItems.filter(item => {
        const itemDate = parseISO(item.start_time)
        return isSameDay(itemDate, day)
      })
    })
    return grouped
  }, [weekDays, weekAllDayItems])

  // Generate hour labels
  const hours = Array.from(
    { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR },
    (_, i) => CALENDAR_START_HOUR + i
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousWeek}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
        <div className="text-lg font-semibold">
          {format(currentWeekStart, 'MMMM d')} -{' '}
          {format(addDays(currentWeekStart, 6), 'MMMM d, yyyy')}
        </div>
        <div className="text-sm text-muted-foreground">{/* Timezone info could go here */}</div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto border rounded-lg">
        <div className="min-w-[1000px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b bg-muted/50 sticky top-0 z-10">
            <div className="p-2 text-sm text-muted-foreground">{/* Time column header */}</div>
            {weekDays.map((day, index) => (
              <div key={index} className="p-2 text-center border-l">
                <div className="text-xs text-muted-foreground">{DAYS_OF_WEEK_SHORT[index]}</div>
                <div className="text-lg font-semibold">{format(day, 'd')}</div>
              </div>
            ))}
          </div>

          {/* All-day events section */}
          {weekAllDayItems.length > 0 && (
            <div className="grid grid-cols-8 border-b bg-background">
              <div className="p-2 text-xs text-muted-foreground flex items-center justify-center">
                All day
              </div>
              {weekDays.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd')
                const dayAllDayItems = allDayItemsByDay[dayKey] || []
                return (
                  <div key={dayKey} className="border-l p-1 min-h-[60px] space-y-1">
                    {dayAllDayItems.map(item => (
                      <CalendarEventCard
                        key={item.id}
                        item={item}
                        isAllDay
                        onClick={() => onItemClick?.(item)}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {/* Hourly grid */}
          <div className="relative">
            {hours.map(hour => (
              <div
                key={hour}
                className="grid grid-cols-8 border-b"
                style={{ height: `${CALENDAR_HOUR_HEIGHT}px` }}
              >
                {/* Time label */}
                <div className="p-2 text-xs text-muted-foreground text-right">
                  {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                </div>

                {/* Day columns */}
                {weekDays.map((day, dayIndex) => {
                  const dayKey = format(day, 'yyyy-MM-dd')
                  const dayItems = itemsByDay[dayKey] || []

                  // Filter items that start in this hour
                  const hourItems = dayItems.filter(item => {
                    const itemDate = parseISO(item.start_time)
                    return itemDate.getHours() === hour
                  })

                  return (
                    <div key={dayIndex} className="border-l relative">
                      {hourItems.map(item => {
                        const startTime = parseISO(item.start_time)
                        const endTime = item.end_time
                          ? parseISO(item.end_time)
                          : addDays(startTime, 0)

                        // Calculate position and height
                        const startHour = startTime.getHours()
                        const startMinute = startTime.getMinutes()
                        const endHour = endTime.getHours()
                        const endMinute = endTime.getMinutes()

                        const topOffset = (startMinute / 60) * CALENDAR_HOUR_HEIGHT
                        const durationHours = endHour - startHour + (endMinute - startMinute) / 60
                        const height = durationHours * CALENDAR_HOUR_HEIGHT

                        return (
                          <div
                            key={item.id}
                            className="absolute left-0 right-0 px-1"
                            style={{
                              top: `${topOffset}px`,
                              height: `${Math.max(height, 30)}px`, // Minimum height
                            }}
                          >
                            <CalendarEventCard
                              item={item}
                              isAllDay={false}
                              onClick={() => onItemClick?.(item)}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
