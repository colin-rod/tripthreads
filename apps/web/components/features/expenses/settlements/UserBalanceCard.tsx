'use client'

/**
 * UserBalanceCard Component
 *
 * Displays an individual user's balance in the settlement summary.
 * Shows net position (owed money or owes money) with color coding.
 */

import type { UserBalance } from '@tripthreads/core'
import { formatCurrencyFromMinorUnits } from '@tripthreads/core'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface UserBalanceCardProps {
  balance: UserBalance
  currentUserId?: string
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

/**
 * Get balance status text
 */
function getBalanceText(balance: UserBalance, isCurrentUser: boolean): string {
  const formattedAmount = formatCurrencyFromMinorUnits(
    Math.abs(balance.net_balance),
    balance.currency
  )

  if (balance.net_balance === 0) {
    return isCurrentUser ? 'You are settled' : 'Settled'
  }

  if (balance.net_balance > 0) {
    return isCurrentUser ? `You are owed ${formattedAmount}` : `Owed ${formattedAmount}`
  }

  return isCurrentUser ? `You owe ${formattedAmount}` : `Owes ${formattedAmount}`
}

/**
 * Get color classes based on balance
 */
function getBalanceColor(netBalance: number): string {
  if (netBalance > 0) {
    // Owed money - green (success)
    return 'text-green-600 dark:text-green-400'
  }
  if (netBalance < 0) {
    // Owes money - orange (warning)
    return 'text-orange-600 dark:text-orange-400'
  }
  // Settled - muted
  return 'text-muted-foreground'
}

export function UserBalanceCard({ balance, currentUserId }: UserBalanceCardProps) {
  const isCurrentUser = balance.user_id === currentUserId
  const balanceText = getBalanceText(balance, isCurrentUser)
  const balanceColor = getBalanceColor(balance.net_balance)

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-3 transition-all hover:shadow-sm">
      {/* User info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs">{getInitials(balance.user_name)}</AvatarFallback>
        </Avatar>
        <span className={cn('font-medium text-sm truncate', isCurrentUser && 'font-semibold')}>
          {isCurrentUser ? 'You' : balance.user_name}
        </span>
      </div>

      {/* Balance */}
      <div className="flex-shrink-0">
        <span className={cn('text-sm font-medium', balanceColor)}>{balanceText}</span>
      </div>
    </div>
  )
}
