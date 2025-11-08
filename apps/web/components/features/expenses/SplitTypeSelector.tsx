'use client'

/**
 * SplitTypeSelector Component
 *
 * Radio group for selecting the expense split type.
 * Options: Equal Split, Percentage Split, Custom Amounts
 */

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export type SplitMode = 'equal' | 'percentage' | 'amount'

interface SplitOption {
  value: SplitMode
  label: string
  description: string
}

const splitOptions: SplitOption[] = [
  {
    value: 'equal',
    label: 'Equal Split',
    description: 'Split evenly among participants',
  },
  {
    value: 'percentage',
    label: 'Percentage Split',
    description: 'Split by percentage (e.g., 60/40)',
  },
  {
    value: 'amount',
    label: 'Custom Amounts',
    description: 'Set exact amount per person',
  },
]

interface SplitTypeSelectorProps {
  value: SplitMode
  onChange: (value: SplitMode) => void
}

export function SplitTypeSelector({ value, onChange }: SplitTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Split Type</Label>
      <RadioGroup value={value} onValueChange={onChange} data-testid="split-type-selector">
        {splitOptions.map(option => (
          <div
            key={option.value}
            className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors"
            data-testid={`split-type-${option.value}`}
          >
            <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
            <div className="flex-1 space-y-1">
              <Label htmlFor={option.value} className="font-medium cursor-pointer">
                {option.label}
              </Label>
              <p className="text-sm text-muted-foreground">{option.description}</p>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
