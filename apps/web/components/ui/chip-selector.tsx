import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ChipOption<T extends string> {
  value: T
  label: string
  icon: LucideIcon
  description?: string
}

interface ChipSelectorProps<T extends string> {
  options: ChipOption<T>[]
  value: T
  onValueChange: (value: T) => void
  'aria-label': string
  className?: string
  disabled?: boolean
}

export function ChipSelector<T extends string>({
  options,
  value,
  onValueChange,
  'aria-label': ariaLabel,
  className,
  disabled = false,
}: ChipSelectorProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('grid grid-cols-2 gap-1 rounded-lg border border-border p-1', className)}
    >
      {options.map(option => {
        const Icon = option.icon
        const isSelected = value === option.value

        return (
          <Button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.description || option.label}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onValueChange(option.value)}
            className="gap-2"
            disabled={disabled}
          >
            <Icon className="h-4 w-4" />
            <span>{option.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
