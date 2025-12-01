'use client'

/**
 * CustomAmountInput Component
 *
 * Input fields for configuring custom amount splits.
 * Features:
 * - Currency-formatted input for each participant
 * - Real-time sum validation (must equal total expense)
 * - Remaining amount indicator
 * - Error messaging
 */

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@tripthreads/core'

interface Participant {
  id: string
  name: string
  avatar_url?: string
}

interface CustomAmountInputProps {
  participants: Participant[]
  totalAmount: number // In major units (e.g., 60.00 EUR)
  currency: string
  values: Record<string, number>
  onChange: (values: Record<string, number>) => void
  isValid: boolean
}

export function CustomAmountInput({
  participants,
  totalAmount,
  currency,
  values,
  onChange,
  isValid,
}: CustomAmountInputProps) {
  const handleChange = (participantId: string, value: string) => {
    const numericValue = parseFloat(value) || 0
    onChange({
      ...values,
      [participantId]: numericValue,
    })
  }

  const totalAssigned = Object.values(values).reduce((sum, val) => sum + val, 0)
  const remaining = totalAmount - totalAssigned

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-sm font-medium">Configure Custom Amounts</Label>
        <p className="text-sm text-muted-foreground">Assign specific amount to each participant</p>
      </div>

      <div className="space-y-3">
        {participants.map(participant => {
          const initials = participant.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()

          return (
            <div
              key={participant.id}
              className="flex items-center gap-3"
              data-testid={`amount-input-${participant.id}`}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={participant.avatar_url} alt={participant.name} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label htmlFor={`amount-${participant.id}`} className="text-sm">
                  {participant.name}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{currency}</span>
                <Input
                  id={`amount-${participant.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={values[participant.id] || ''}
                  onChange={e => handleChange(participant.id, e.target.value)}
                  className="w-28 text-right"
                  placeholder="0.00"
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Total Assigned</Label>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-semibold',
                isValid ? 'text-green-600' : 'text-destructive'
              )}
            >
              {currency} {totalAssigned.toFixed(2)} / {currency} {totalAmount.toFixed(2)}
            </span>
            {isValid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Remaining</span>
          <span
            className={cn(
              'font-medium',
              remaining === 0
                ? 'text-green-600'
                : remaining > 0
                  ? 'text-orange-600'
                  : 'text-destructive'
            )}
          >
            {currency} {Math.abs(remaining).toFixed(2)}
          </span>
        </div>
        {!isValid && (
          <p className="text-sm text-destructive">
            Custom amounts must add up to {currency} {totalAmount.toFixed(2)}. Currently: {currency}{' '}
            {totalAssigned.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  )
}
