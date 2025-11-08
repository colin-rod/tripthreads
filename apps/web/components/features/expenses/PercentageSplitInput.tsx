'use client'

/**
 * PercentageSplitInput Component
 *
 * Input fields for configuring percentage-based splits.
 * Features:
 * - Input field for each participant
 * - Real-time sum validation (must equal 100%)
 * - Visual progress bar
 * - Error messaging
 */

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@tripthreads/core'

interface Participant {
  id: string
  name: string
  avatar_url?: string
}

interface PercentageSplitInputProps {
  participants: Participant[]
  values: Record<string, number>
  onChange: (values: Record<string, number>) => void
  isValid: boolean
}

export function PercentageSplitInput({
  participants,
  values,
  onChange,
  isValid,
}: PercentageSplitInputProps) {
  const handleChange = (participantId: string, value: string) => {
    const numericValue = parseFloat(value) || 0
    onChange({
      ...values,
      [participantId]: numericValue,
    })
  }

  const totalPercentage = Object.values(values).reduce((sum, val) => sum + val, 0)
  const progressValue = Math.min(totalPercentage, 100)

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-sm font-medium">Configure Percentage Split</Label>
        <p className="text-sm text-muted-foreground">
          Assign percentage to each participant (must total 100%)
        </p>
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
              data-testid={`percentage-input-${participant.id}`}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={participant.avatar_url} alt={participant.name} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label htmlFor={`percentage-${participant.id}`} className="text-sm">
                  {participant.name}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id={`percentage-${participant.id}`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={values[participant.id] || ''}
                  onChange={e => handleChange(participant.id, e.target.value)}
                  className="w-24 text-right"
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground w-4">%</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Total Percentage</Label>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-semibold',
                isValid ? 'text-green-600' : 'text-destructive'
              )}
            >
              {totalPercentage.toFixed(1)}%
            </span>
            {isValid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
          </div>
        </div>
        <Progress value={progressValue} className="h-2" />
        {!isValid && (
          <p className="text-sm text-destructive">
            Percentages must add up to 100%. Currently: {totalPercentage.toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  )
}
