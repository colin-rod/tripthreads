'use client'

import { useMemo, useState } from 'react'
import {
  format,
  startOfMonth,
  startOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  parseISO,
  addMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DayDetailPopover } from './DayDetailPopover'

interface MonthViewProps {
  items: ItineraryItemWithParticipants[]
  tripStartDate: string
  tripEndDate: string
  currentMonth: Date
  onMonthChange: (month: Date) => void
  onItemClick: (item: ItineraryItemWithParticipants) => void
  onNavigateToWeek: (date: Date) => void
  onCreateItem: (date: Date) => void
  currentUserId: string
  canEdit: boolean
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_DOTS_PER_DAY = 5

const DOT_COLOR_CLASSES: Record<string, string> = {
  transport: 'bg-blue-600',
  accommodation: 'bg-purple-600',
  dining: 'bg-orange-600',
  activity: 'bg-green-600',
  sightseeing: 'bg-pink-600',
  general: 'bg-gray-600',
}

export function MonthView({
  items,
  tripStartDate,
  tripEndDate,
  currentMonth,
  onMonthChange,
  onItemClick,
  onNavigateToWeek,
  onCreateItem,
  canEdit,
}: MonthViewProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Calculate trip month range
  const tripMonths = useMemo(() => {
    const start = startOfMonth(parseISO(tripStartDate))
    const end = startOfMonth(parseISO(tripEndDate))
    const months: Date[] = []
    let current = start

    while (current <= end) {
      months.push(current)
      current = addMonths(current, 1)
    }

    return months
  }, [tripStartDate, tripEndDate])

  // Check if navigation is allowed
  const canNavigatePrev = currentMonth > tripMonths[0]
  const canNavigateNext = currentMonth < tripMonths[tripMonths.length - 1]

  // Navigation handlers
  const handlePrevMonth = () => {
    if (canNavigatePrev) {
      onMonthChange(addMonths(currentMonth, -1))
    }
  }

  const handleNextMonth = () => {
    if (canNavigateNext) {
      onMonthChange(addMonths(currentMonth, 1))
    }
  }

  const handleToday = () => {
    const today = new Date()
    const todayMonth = startOfMonth(today)

    // Only navigate if today is within trip months
    if (todayMonth >= tripMonths[0] && todayMonth <= tripMonths[tripMonths.length - 1]) {
      onMonthChange(todayMonth)
    } else {
      // Default to first trip month if today is outside range
      onMonthChange(tripMonths[0])
    }
  }

  // Generate calendar weeks (6 weeks = 42 days)
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart)

    // Always generate 6 weeks (42 days) for consistent layout
    const weeksArray: Date[][] = []
    let currentWeekStart = calendarStart

    for (let i = 0; i < 6; i++) {
      const week: Date[] = []
      for (let j = 0; j < 7; j++) {
        week.push(addDays(currentWeekStart, j))
      }
      weeksArray.push(week)
      currentWeekStart = addDays(currentWeekStart, 7)
    }

    return weeksArray
  }, [currentMonth])

  // Group items by date for efficient lookup
  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, ItineraryItemWithParticipants[]>()

    items.forEach(item => {
      const startDate = parseISO(item.start_time)
      const endDate = item.end_time ? parseISO(item.end_time) : startDate

      // Add item to all dates it spans
      let current = startDate
      while (current <= endDate) {
        const dateKey = format(current, 'yyyy-MM-dd')
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, [])
        }
        grouped.get(dateKey)!.push(item)
        current = addDays(current, 1)
      }
    })

    return grouped
  }, [items])

  // Get items for a specific date
  const getItemsForDate = (date: Date): ItineraryItemWithParticipants[] => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return itemsByDate.get(dateKey) || []
  }

  // Check if a date is within the trip range
  const isTripDate = (date: Date): boolean => {
    try {
      return isWithinInterval(date, {
        start: parseISO(tripStartDate),
        end: parseISO(tripEndDate),
      })
    } catch {
      return false
    }
  }

  // Handle day click to show popover
  const handleDayClick = (date: Date) => {
    if (isTripDate(date)) {
      setSelectedDay(date)
    }
  }

  // Close popover
  const handleClosePopover = () => {
    setSelectedDay(null)
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No itinerary items yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start planning your trip by adding flights, stays, and activities.
        </p>
        {canEdit && <Button onClick={() => onCreateItem(new Date())}>Add First Item</Button>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={handlePrevMonth} disabled={!canNavigatePrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextMonth} disabled={!canNavigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-t">
            {week.map(date => {
              const dayItems = getItemsForDate(date)
              const isCurrentMonth = isSameMonth(date, currentMonth)
              const isToday = isSameDay(date, new Date())
              const isTripDay = isTripDate(date)

              return (
                <DayCell
                  key={date.toISOString()}
                  date={date}
                  items={dayItems}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isToday}
                  isTripDate={isTripDay}
                  onClick={() => handleDayClick(date)}
                  onNavigateToWeek={onNavigateToWeek}
                  onCreateItem={onCreateItem}
                  canEdit={canEdit}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Day detail popover */}
      {selectedDay && (
        <DayDetailPopover
          date={selectedDay}
          items={getItemsForDate(selectedDay)}
          onViewItem={onItemClick}
          onNavigateToWeek={onNavigateToWeek}
          onCreateItem={onCreateItem}
          onClose={handleClosePopover}
          canEdit={canEdit}
        />
      )}
    </div>
  )
}

interface DayCellProps {
  date: Date
  items: ItineraryItemWithParticipants[]
  isCurrentMonth: boolean
  isToday: boolean
  isTripDate: boolean
  onClick: () => void
  onNavigateToWeek: (date: Date) => void
  onCreateItem: (date: Date) => void
  canEdit: boolean
}

function DayCell({
  date,
  items,
  isCurrentMonth,
  isToday,
  isTripDate,
  onClick,
  onNavigateToWeek,
  onCreateItem,
  canEdit,
}: DayCellProps) {
  const hasItems = items.length > 0
  const visibleDots = items.slice(0, MAX_DOTS_PER_DAY)
  const remainingCount = Math.max(0, items.length - MAX_DOTS_PER_DAY)

  // Determine cell styling
  const cellClasses = [
    'relative min-h-[60px] p-2 border-r last:border-r-0',
    isToday && 'bg-primary/10 border-primary border-2',
    !isToday && isTripDate && 'bg-muted/50',
    !isCurrentMonth && 'text-muted-foreground',
    isTripDate && 'cursor-pointer hover:bg-muted/70 transition-colors',
    !isTripDate && 'cursor-not-allowed opacity-50',
  ]
    .filter(Boolean)
    .join(' ')

  if (!isTripDate || !hasItems) {
    // Non-clickable cell (no dropdown)
    return (
      <div className={cellClasses}>
        <div className="text-sm font-medium mb-1">{format(date, 'd')}</div>
        {hasItems && (
          <div className="flex flex-wrap gap-1 justify-center items-center">
            {visibleDots.map((item, index) => (
              <div
                key={index}
                className={`h-1.5 w-1.5 rounded-full ${DOT_COLOR_CLASSES[item.type] || 'bg-gray-600'}`}
                title={item.title}
              />
            ))}
            {remainingCount > 0 && (
              <div className="text-xs text-muted-foreground">+{remainingCount}</div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Clickable cell with dropdown menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cellClasses}>
          <div className="text-sm font-medium mb-1">{format(date, 'd')}</div>
          {hasItems && (
            <div className="flex flex-wrap gap-1 justify-center items-center">
              {visibleDots.map((item, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full ${DOT_COLOR_CLASSES[item.type] || 'bg-gray-600'}`}
                  title={item.title}
                />
              ))}
              {remainingCount > 0 && (
                <div className="text-xs text-muted-foreground">+{remainingCount}</div>
              )}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={onClick}>View Day Details</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNavigateToWeek(date)}>Go to Week View</DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem onClick={() => onCreateItem(date)}>Add New Item</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
