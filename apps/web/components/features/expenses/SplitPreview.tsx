'use client'

/**
 * SplitPreview Component
 *
 * Summary card showing the calculated split breakdown.
 * Features:
 * - Shows total amount and split type
 * - Displays each participant's share with percentage
 * - Collapsible for space efficiency
 */

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@tripthreads/core'

interface ParticipantShare {
  id: string
  name: string
  avatar_url?: string
  amount: number // In major units
  percentage?: number
}

interface SplitPreviewProps {
  totalAmount: number
  currency: string
  splitType: 'equal' | 'percentage' | 'amount'
  participants: ParticipantShare[]
  className?: string
}

const splitTypeLabels = {
  equal: 'Equal Split',
  percentage: 'Percentage Split',
  amount: 'Custom Amounts',
}

export function SplitPreview({
  totalAmount,
  currency,
  splitType,
  participants,
  className,
}: SplitPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className={cn('space-y-3 rounded-lg border p-4 bg-muted/30', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Split Preview</h4>
          <p className="text-xs text-muted-foreground">{splitTypeLabels[splitType]}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">
            {currency} {totalAmount.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">{participants.length} participants</p>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between h-8 px-2"
      >
        <span className="text-xs">{isExpanded ? 'Hide' : 'Show'} breakdown</span>
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      {isExpanded && (
        <div className="space-y-2 pt-2 border-t">
          {participants.map(participant => {
            const initials = participant.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
            const percentage = participant.percentage || (participant.amount / totalAmount) * 100

            return (
              <div key={participant.id} className="flex items-center justify-between gap-3 py-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={participant.avatar_url} alt={participant.name} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{participant.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {currency} {participant.amount.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground text-xs w-12 text-right">
                    ({percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
