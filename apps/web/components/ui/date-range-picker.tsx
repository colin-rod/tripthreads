'use client'

/**
 * DateRangePicker Component
 *
 * Reusable date range picker using react-day-picker
 * Features:
 * - Select start and end dates
 * - Min/max date constraints
 * - Visual range selection
 * - Disabled dates
 */

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DateRange, DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

import { cn } from '@tripthreads/core'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DateRangePickerProps {
  value?: DateRange
  onChange: (range: DateRange | undefined) => void
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  className?: string
}

export function DateRangePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-range"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, 'LLL dd, y')} - {format(value.to, 'LLL dd, y')}
                </>
              ) : (
                format(value.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <DayPicker
            mode="range"
            defaultMonth={value?.from || minDate}
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            disabled={[
              minDate ? { before: minDate } : false,
              maxDate ? { after: maxDate } : false,
            ].filter((item): item is { before: Date } | { after: Date } => item !== false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
