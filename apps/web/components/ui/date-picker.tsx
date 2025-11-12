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
      portalDiv.style.position = 'relative'
      portalDiv.style.zIndex = '100'
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

        /* Calendar container */
        .date-picker-calendar {
          background-color: hsl(var(--popover));
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius-md);
          box-shadow:
            0 10px 15px -3px rgb(0 0 0 / 0.1),
            0 4px 6px -4px rgb(0 0 0 / 0.1);
          font-family: inherit;
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
        }

        .react-datepicker__current-month,
        .react-datepicker__day-name {
          color: hsl(var(--foreground));
          font-weight: 500;
        }

        /* Navigation arrows */
        .react-datepicker__navigation {
          top: 0.75rem;
        }

        .react-datepicker__navigation-icon::before {
          border-color: hsl(var(--foreground));
        }

        /* Day cells */
        .react-datepicker__day {
          color: hsl(var(--foreground));
          border-radius: var(--radius-sm);
          margin: 0.125rem;
        }

        .react-datepicker__day:hover {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }

        .react-datepicker__day--selected {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }

        .react-datepicker__day--selected:hover {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }

        .react-datepicker__day--today {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
          font-weight: 600;
        }

        .react-datepicker__day--disabled {
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
          cursor: not-allowed;
        }

        .react-datepicker__day--disabled:hover {
          background-color: transparent;
        }

        .react-datepicker__day--outside-month {
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
        }

        /* Dropdown selectors */
        .react-datepicker__month-dropdown,
        .react-datepicker__year-dropdown {
          background-color: hsl(var(--popover));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
        }

        .react-datepicker__month-option,
        .react-datepicker__year-option {
          color: hsl(var(--foreground));
        }

        .react-datepicker__month-option:hover,
        .react-datepicker__year-option:hover {
          background-color: hsl(var(--accent));
        }

        .react-datepicker__month-option--selected,
        .react-datepicker__year-option--selected {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .react-datepicker__navigation-icon::before {
            border-color: hsl(var(--foreground));
          }
        }
      `}</style>
    </div>
  )
}
