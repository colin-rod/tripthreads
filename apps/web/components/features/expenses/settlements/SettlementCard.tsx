'use client'

/**
 * SettlementCard Component
 *
 * Displays an individual settlement suggestion (transfer from one user to another).
 * Visual representation: Debtor → Creditor with amount.
 */

import type { OptimizedSettlement } from '@tripthreads/core'
import { ArrowRight } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface SettlementCardProps {
  settlement: OptimizedSettlement
  currentUserId?: string
}

/**
 * Format amount from cents to display format
 */
function formatAmount(amount: number, currency: string): string {
  const majorUnits = amount / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(majorUnits)
}

/**
 * Get initials from full name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function SettlementCard({ settlement, currentUserId }: SettlementCardProps) {
  const isDebtor = settlement.from_user_id === currentUserId
  const isCreditor = settlement.to_user_id === currentUserId

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-all hover:shadow-sm">
      {/* From user (debtor) */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs">
            {getInitials(settlement.from_user_name)}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm truncate">
          {isDebtor ? 'You' : settlement.from_user_name}
        </span>
      </div>

      {/* Arrow */}
      <div className="flex-shrink-0">
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* To user (creditor) */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs">
            {getInitials(settlement.to_user_name)}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm truncate">
          {isCreditor ? 'You' : settlement.to_user_name}
        </span>
      </div>

      {/* Amount */}
      <div className="flex-shrink-0">
        <span className="font-semibold text-lg text-primary">
          {formatAmount(settlement.amount, settlement.currency)}
        </span>
      </div>
    </div>
  )
}
