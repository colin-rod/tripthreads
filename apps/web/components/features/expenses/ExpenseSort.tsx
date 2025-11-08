'use client'

/**
 * ExpenseSort Component
 *
 * Dropdown selector for sorting expenses
 * Options: Date, Amount, Category
 * Direction: Ascending, Descending
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export type SortOption = 'date' | 'amount' | 'category'
export type SortDirection = 'asc' | 'desc'

interface ExpenseSortProps {
  sortBy: SortOption
  sortDirection: SortDirection
  onSortByChange: (value: SortOption) => void
  onSortDirectionChange: (value: SortDirection) => void
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'category', label: 'Category' },
]

export function ExpenseSort({
  sortBy,
  sortDirection,
  onSortByChange,
  onSortDirectionChange,
}: ExpenseSortProps) {
  const toggleDirection = () => {
    onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger className="w-[140px]">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              Sort by {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={toggleDirection}
        title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
      >
        {sortDirection === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}
