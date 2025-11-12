'use client'

import * as React from 'react'
import ReactDatePicker from 'react-datepicker'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@tripthreads/core'
import { Button } from '@/components/ui/button'
import 'react-datepicker/dist/react-datepicker.css'

export interface DatePickerProps {
  selected?: Date
  onChange: (date: Date | null) => void
  disabled?: (date: Date) => boolean
  placeholder?: string
  className?: string
  minDate?: Date
  maxDate?: Date
  dateFormat?: string
  showYearDropdown?: boolean
  showMonthDropdown?: boolean
}

export function DatePicker({
  selected,
  onChange,
  disabled,
  placeholder = 'Pick a date',
  className,
  minDate,
  maxDate,
  dateFormat = 'MMM dd, yyyy',
  showYearDropdown = true,
  showMonthDropdown = true,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Ensure portal container exists
  React.useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('date-picker-portal')) {
      const portalDiv = document.createElement('div')
      portalDiv.id = 'date-picker-portal'
      portalDiv.style.position = 'fixed'
      portalDiv.style.top = '0'
      portalDiv.style.left = '0'
      portalDiv.style.zIndex = '100'
      portalDiv.style.pointerEvents = 'none' // Allow clicks to pass through the container
      document.body.appendChild(portalDiv)
    }
  }, [])

  return (
    <div className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full justify-between pl-3 pr-3 text-left font-normal',
          !selected && 'text-muted-foreground'
        )}
      >
        {selected ? format(selected, dateFormat) : <span>{placeholder}</span>}
        <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <ReactDatePicker
        selected={selected}
        onChange={date => {
          onChange(date)
          setIsOpen(false)
        }}
        filterDate={disabled ? date => !disabled(date) : undefined}
        minDate={minDate}
        maxDate={maxDate}
        dateFormat={dateFormat}
        showYearDropdown={showYearDropdown}
        showMonthDropdown={showMonthDropdown}
        dropdownMode="select"
        open={isOpen}
        onClickOutside={() => setIsOpen(false)}
        onSelect={() => setIsOpen(false)}
        customInput={<div style={{ display: 'none' }} />}
        portalId="date-picker-portal"
        popperClassName="date-picker-popper"
        calendarClassName="date-picker-calendar"
        className="hidden"
      />

      <style jsx global>{`
        /* Portal container */
        #date-picker-portal {
          z-index: 100 !important;
        }

        /* Popper wrapper */
        .date-picker-popper {
          z-index: 100 !important;
        }

        /* Calendar container - Playful Citrus Pop Design System */
        .date-picker-calendar {
          background-color: hsl(var(--popover));
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius-lg); /* 8px for cards/elevated surfaces */
          box-shadow: 0 4px 8px rgb(0 0 0 / 0.1); /* shadow-md */
          font-family:
            Inter,
            -apple-system,
            sans-serif;
          padding: 0.75rem;
          pointer-events: auto;
        }

        .react-datepicker-popper {
          pointer-events: auto;
        }

        .react-datepicker {
          pointer-events: auto;
        }

        /* Calendar header */
        .react-datepicker__header {
          background-color: transparent;
          border-bottom: 1px solid hsl(var(--border));
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
        }

        .react-datepicker__current-month,
        .react-datepicker__day-name {
          color: hsl(var(--foreground));
          font-weight: 600; /* Headings weight from design system */
          font-size: 0.875rem;
        }

        .react-datepicker__day-name {
          font-weight: 500;
          color: hsl(var(--muted-foreground));
        }

        /* Navigation arrows */
        .react-datepicker__navigation {
          top: 0.75rem;
          border-radius: var(--radius-md); /* 6px for buttons */
          transition: background-color 150ms ease-in-out;
        }

        .react-datepicker__navigation:hover {
          background-color: hsl(var(--muted));
        }

        .react-datepicker__navigation-icon::before {
          border-color: hsl(var(--foreground));
          border-width: 2px 2px 0 0;
        }

        /* Day cells */
        .react-datepicker__day {
          color: hsl(var(--foreground));
          border-radius: var(--radius-sm); /* 4px for day cells */
          margin: 0.125rem;
          width: 2rem;
          height: 2rem;
          line-height: 2rem;
          transition: all 150ms ease-in-out; /* transition-fast */
          font-weight: 400;
        }

        .react-datepicker__day:hover {
          background-color: hsl(var(--muted)); /* Light lavender from design system */
          color: hsl(var(--foreground));
        }

        /* Selected date - Primary Orange (#F97316) */
        .react-datepicker__day--selected {
          background-color: #f97316 !important; /* Primary orange */
          color: #ffffff !important; /* Primary foreground */
          font-weight: 600;
        }

        .react-datepicker__day--selected:hover {
          background-color: #ea580c !important; /* orange-600 */
          color: #ffffff !important;
        }

        /* Today's date - Secondary Green (#22C55E) */
        .react-datepicker__day--today {
          background-color: #22c55e; /* Secondary green */
          color: #ffffff;
          font-weight: 600;
        }

        .react-datepicker__day--today:hover {
          background-color: #16a34a; /* green-600 */
          color: #ffffff;
        }

        /* Today + Selected */
        .react-datepicker__day--today.react-datepicker__day--selected {
          background-color: #f97316 !important; /* Primary takes precedence */
          color: #ffffff !important;
        }

        /* Disabled dates */
        .react-datepicker__day--disabled {
          color: hsl(var(--muted-foreground));
          opacity: 0.4;
          cursor: not-allowed;
        }

        .react-datepicker__day--disabled:hover {
          background-color: transparent;
        }

        /* Outside month dates */
        .react-datepicker__day--outside-month {
          color: hsl(var(--muted-foreground));
          opacity: 0.3;
        }

        /* Dropdown selectors */
        .react-datepicker__month-dropdown,
        .react-datepicker__year-dropdown {
          background-color: hsl(var(--popover));
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius-md);
          color: hsl(var(--foreground));
          box-shadow: 0 2px 4px rgb(0 0 0 / 0.08); /* shadow */
        }

        .react-datepicker__month-option,
        .react-datepicker__year-option {
          color: hsl(var(--foreground));
          padding: 0.5rem 1rem;
          transition: background-color 150ms ease-in-out;
        }

        .react-datepicker__month-option:hover,
        .react-datepicker__year-option:hover {
          background-color: hsl(var(--muted));
        }

        .react-datepicker__month-option--selected,
        .react-datepicker__year-option--selected {
          background-color: #f97316; /* Primary orange */
          color: #ffffff;
        }

        .react-datepicker__month-option--selected:hover,
        .react-datepicker__year-option--selected:hover {
          background-color: #ea580c; /* orange-600 */
        }

        /* Keyboard navigation */
        .react-datepicker__day--keyboard-selected {
          background-color: hsl(var(--muted));
          color: hsl(var(--foreground));
        }

        .react-datepicker__day--keyboard-selected:hover {
          background-color: #f97316;
          color: #ffffff;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .react-datepicker__navigation-icon::before {
            border-color: hsl(var(--foreground));
          }

          .react-datepicker__day--today {
            background-color: #22c55e;
            color: #ffffff;
          }

          .react-datepicker__day--selected {
            background-color: #f97316 !important;
            color: #ffffff !important;
          }
        }
      `}</style>
    </div>
  )
}
