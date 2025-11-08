'use client'

/**
 * ExpenseFilters Component
 *
 * Filter controls for expenses
 * Filters: Date range, Category, Payer, Participant
 */

import { useState } from 'react'
import type { ExpenseFiltersState } from './ExpenseListView'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Filter, X, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

interface ExpenseFiltersProps {
  filters: ExpenseFiltersState
  onFiltersChange: (filters: ExpenseFiltersState) => void
  payers: { id: string; name: string }[]
  participants: { id: string; name: string }[]
}

const CATEGORY_OPTIONS = [
  { value: 'food', label: 'Food' },
  { value: 'transport', label: 'Transport' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'activity', label: 'Activity' },
  { value: 'other', label: 'Other' },
]

export function ExpenseFilters({
  filters,
  onFiltersChange,
  payers,
  participants,
}: ExpenseFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const activeFilterCount = [
    filters.dateRange ? 1 : 0,
    filters.categories.length,
    filters.payerIds.length,
    filters.participantIds.length,
  ].reduce((a, b) => a + b, 0)

  const handleDateRangeChange = (range: { from?: Date; to?: Date } | undefined) => {
    // Only update if we have both from and to dates
    if (range?.from && range?.to) {
      onFiltersChange({
        ...filters,
        dateRange: { from: range.from, to: range.to },
      })
    } else {
      onFiltersChange({
        ...filters,
        dateRange: undefined,
      })
    }
  }

  const handleCategoryToggle = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category]

    onFiltersChange({
      ...filters,
      categories: newCategories,
    })
  }

  const handlePayerToggle = (payerId: string) => {
    const newPayerIds = filters.payerIds.includes(payerId)
      ? filters.payerIds.filter(id => id !== payerId)
      : [...filters.payerIds, payerId]

    onFiltersChange({
      ...filters,
      payerIds: newPayerIds,
    })
  }

  const handleParticipantToggle = (participantId: string) => {
    const newParticipantIds = filters.participantIds.includes(participantId)
      ? filters.participantIds.filter(id => id !== participantId)
      : [...filters.participantIds, participantId]

    onFiltersChange({
      ...filters,
      participantIds: newParticipantIds,
    })
  }

  const handleClearAll = () => {
    onFiltersChange({
      categories: [],
      payerIds: [],
      participantIds: [],
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Filters</h4>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-auto p-1 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            <Separator />

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filters.dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange ? (
                      <>
                        {format(filters.dateRange.from, 'MMM d, yyyy')} -{' '}
                        {format(filters.dateRange.to, 'MMM d, yyyy')}
                      </>
                    ) : (
                      'Select date range'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={filters.dateRange}
                    onSelect={handleDateRangeChange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              {filters.dateRange && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDateRangeChange(undefined)}
                  className="h-auto p-1 text-xs"
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear date range
                </Button>
              )}
            </div>

            <Separator />

            {/* Categories */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Categories</Label>
              <div className="space-y-2">
                {CATEGORY_OPTIONS.map(category => (
                  <div key={category.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.value}`}
                      checked={filters.categories.includes(category.value)}
                      onCheckedChange={() => handleCategoryToggle(category.value)}
                    />
                    <Label
                      htmlFor={`category-${category.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {category.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Payers */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Paid By</Label>
              <div className="max-h-32 space-y-2 overflow-y-auto">
                {payers.map(payer => (
                  <div key={payer.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`payer-${payer.id}`}
                      checked={filters.payerIds.includes(payer.id)}
                      onCheckedChange={() => handlePayerToggle(payer.id)}
                    />
                    <Label
                      htmlFor={`payer-${payer.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {payer.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Participants */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Participants</Label>
              <div className="max-h-32 space-y-2 overflow-y-auto">
                {participants.map(participant => (
                  <div key={participant.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`participant-${participant.id}`}
                      checked={filters.participantIds.includes(participant.id)}
                      onCheckedChange={() => handleParticipantToggle(participant.id)}
                    />
                    <Label
                      htmlFor={`participant-${participant.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {participant.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.dateRange && (
            <Badge variant="secondary" className="gap-1">
              {format(filters.dateRange.from, 'MMM d')} - {format(filters.dateRange.to, 'MMM d')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleDateRangeChange(undefined)}
              />
            </Badge>
          )}
          {filters.categories.map(category => (
            <Badge key={category} variant="secondary" className="gap-1">
              {category}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleCategoryToggle(category)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
