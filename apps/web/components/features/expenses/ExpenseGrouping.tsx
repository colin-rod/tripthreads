'use client'

/**
 * ExpenseGrouping Component
 *
 * Dropdown selector for changing expense grouping
 * Options: Date, Category, Payer, Participant
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Group } from 'lucide-react'

export type GroupingOption = 'date' | 'category' | 'payer' | 'participant'

interface ExpenseGroupingProps {
  value: GroupingOption
  onChange: (value: GroupingOption) => void
}

const GROUPING_OPTIONS: { value: GroupingOption; label: string }[] = [
  { value: 'date', label: 'Group by Date' },
  { value: 'category', label: 'Group by Category' },
  { value: 'payer', label: 'Group by Payer' },
  { value: 'participant', label: 'Group by Participant' },
]

export function ExpenseGrouping({ value, onChange }: ExpenseGroupingProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <div className="flex items-center gap-2">
          <Group className="h-4 w-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {GROUPING_OPTIONS.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
