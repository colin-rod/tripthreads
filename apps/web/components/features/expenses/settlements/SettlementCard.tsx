'use client'

/**
 * SettlementCard Component
 *
 * Displays an individual settlement (transfer from one user to another).
 * Shows pending settlements with "Mark as Paid" button, or settled settlements with status.
 * Visual representation: Debtor → Creditor with amount.
 */

import type { SettlementWithUsers } from '@tripthreads/core'
import { ArrowRight, Check } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

interface SettlementCardProps {
  settlement: SettlementWithUsers
  currentUserId?: string
  onMarkAsPaid?: (settlementId: string) => void
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

export function SettlementCard({ settlement, currentUserId, onMarkAsPaid }: SettlementCardProps) {
  const isDebtor = settlement.from_user_id === currentUserId
  const isCreditor = settlement.to_user_id === currentUserId
  const isPending = settlement.status === 'pending'
  const isSettled = settlement.status === 'settled'
  const canMarkAsPaid = isPending && (isDebtor || isCreditor) && onMarkAsPaid

  return (
    <div
      className={`flex items-center gap-4 rounded-lg border bg-card p-4 transition-all ${
        isPending ? 'hover:shadow-sm' : 'opacity-75'
      }`}
    >
      {/* From user (debtor) */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs">
            {getInitials(settlement.from_user.full_name || 'Unknown User')}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm truncate">
          {isDebtor ? 'You' : settlement.from_user.full_name || 'Unknown User'}
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
            {getInitials(settlement.to_user.full_name || 'Unknown User')}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm truncate">
          {isCreditor ? 'You' : settlement.to_user.full_name || 'Unknown User'}
        </span>
      </div>

      {/* Amount */}
      <div className="flex-shrink-0">
        <span className="font-semibold text-lg text-primary">
          {formatAmount(settlement.amount, settlement.currency)}
        </span>
      </div>

      {/* Status / Action */}
      <div className="flex-shrink-0">
        {isSettled ? (
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              Settled
            </Badge>
            {settlement.settled_at && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(settlement.settled_at), { addSuffix: true })}
              </span>
            )}
            {settlement.note && (
              <span className="text-xs text-muted-foreground italic">{settlement.note}</span>
            )}
          </div>
        ) : canMarkAsPaid ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMarkAsPaid(settlement.id)}
            className="flex items-center gap-1"
          >
            <Check className="h-3 w-3" />
            Mark as Paid
          </Button>
        ) : null}
      </div>
    </div>
  )
}
