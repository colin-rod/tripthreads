'use client'

/**
 * ExpenseCard Component
 *
 * Displays an individual expense in the list view.
 * Shows: description, amount, payer, participants, split info
 * Includes edit/delete actions for authorized users
 */

import type { ExpenseWithDetails } from '@tripthreads/core'
import { formatCurrencyFromMinorUnits } from '@tripthreads/core'
import { cn } from '@/lib/utils'
import { DollarSign, MoreHorizontal, Edit, Trash, Users } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ExpenseCardProps {
  expense: ExpenseWithDetails
  currentUserId?: string
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

/**
 * Get split type label
 */
function getSplitLabel(expense: ExpenseWithDetails): string {
  const participants = expense.participants

  if (participants.length === 0) {
    return 'No split'
  }

  // Check if all participants have the same share type
  const firstType = participants[0].share_type
  const allSameType = participants.every(p => p.share_type === firstType)

  if (allSameType && firstType === 'equal') {
    return 'Even split'
  }

  if (allSameType && firstType === 'percentage') {
    return 'Percentage split'
  }

  return 'Custom split'
}

/**
 * Get owed amount display for current user
 */
function getOwedDisplay(expense: ExpenseWithDetails, currentUserId?: string): string | null {
  if (!currentUserId) return null

  const currentUserParticipant = expense.participants.find(p => p.user_id === currentUserId)

  if (!currentUserParticipant) return null

  const owedAmount = currentUserParticipant.share_amount

  // If user is the payer, show what they're owed
  if (expense.payer_id === currentUserId) {
    const totalOwed = expense.participants
      .filter(p => p.user_id !== currentUserId)
      .reduce((sum, p) => sum + p.share_amount, 0)

    if (totalOwed === 0) return null

    return `You're owed ${formatCurrencyFromMinorUnits(totalOwed, expense.currency)}`
  }

  // User owes money
  return `You owe ${formatCurrencyFromMinorUnits(owedAmount, expense.currency)}`
}

/**
 * Get category badge color
 */
function getCategoryColor(category: string): string {
  switch (category) {
    case 'food':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'transport':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'accommodation':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'activity':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function ExpenseCard({
  expense,
  currentUserId,
  onClick,
  onEdit,
  onDelete,
}: ExpenseCardProps) {
  const canEdit = currentUserId === expense.created_by // Simplified - RLS enforces full rules
  const splitLabel = getSplitLabel(expense)
  const owedDisplay = getOwedDisplay(expense, currentUserId)

  // Get participant names
  const participantNames = expense.participants.map(p => p.user.full_name)
  const participantDisplay =
    participantNames.length <= 3
      ? participantNames.join(', ')
      : `${participantNames.slice(0, 2).join(', ')} +${participantNames.length - 2} more`

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card p-4 transition-all hover:shadow-md cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Icon and content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div className="mt-1 flex-shrink-0 text-muted-foreground">
            <DollarSign className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-medium text-base">{expense.description}</span>
              <span className="text-lg font-semibold text-primary">
                {formatCurrencyFromMinorUnits(expense.amount, expense.currency)}
              </span>
            </div>

            {/* Payer info */}
            <p className="text-sm text-muted-foreground mt-1">
              {expense.payer_id === currentUserId ? 'You' : expense.payer.full_name} paid
            </p>

            {/* Participants */}
            {expense.participants.length > 0 && (
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <Users className="h-3 w-3" />
                <span className="truncate">{participantDisplay}</span>
              </div>
            )}

            {/* Split info */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {splitLabel}
              </Badge>
              {owedDisplay && <span className="text-xs text-muted-foreground">{owedDisplay}</span>}
            </div>
          </div>
        </div>

        {/* Category badge and actions */}
        <div className="flex items-start gap-2 flex-shrink-0">
          {/* Category badge */}
          <Badge
            variant="outline"
            className={cn('text-xs font-medium', getCategoryColor(expense.category))}
          >
            {expense.category}
          </Badge>

          {/* Actions menu */}
          {canEdit && (onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem
                    onClick={e => {
                      e.stopPropagation()
                      onEdit()
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={e => {
                      e.stopPropagation()
                      onDelete()
                    }}
                    className="text-destructive"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  )
}
