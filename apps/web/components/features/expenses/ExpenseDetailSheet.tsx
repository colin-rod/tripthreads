'use client'

/**
 * ExpenseDetailSheet Component
 *
 * Side panel displaying full expense details including all participant splits.
 * Shows: description, amount, payer, date, category, receipt, split breakdown
 * Includes edit/delete actions for authorized users
 */

import type { ExpenseWithDetails } from '@tripthreads/core'
import { format, parseISO } from 'date-fns'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Edit, Trash, Calendar, User, Users, DollarSign, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExpenseDetailSheetProps {
  expense: ExpenseWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId?: string
  onEdit?: () => void
  onDelete?: () => void
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

export function ExpenseDetailSheet({
  expense,
  open,
  onOpenChange,
  currentUserId,
  onEdit,
  onDelete,
}: ExpenseDetailSheetProps) {
  const canEdit = currentUserId === expense.created_by
  const isPayer = currentUserId === expense.payer_id

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">{expense.description}</SheetTitle>
          <SheetDescription>
            Created {format(parseISO(expense.created_at), 'MMM d, yyyy')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Amount */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              <span>Amount</span>
            </div>
            <p className="text-3xl font-bold text-primary">
              {formatAmount(expense.amount, expense.currency)}
            </p>
          </div>

          <Separator />

          {/* Date */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span>Date</span>
            </div>
            <p className="text-base">{format(parseISO(expense.date), 'EEEE, MMMM d, yyyy')}</p>
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <span>Category</span>
            </div>
            <Badge
              variant="outline"
              className={cn('text-sm font-medium', getCategoryColor(expense.category))}
            >
              {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
            </Badge>
          </div>

          <Separator />

          {/* Payer */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <User className="h-4 w-4" />
              <span>Paid by</span>
            </div>
            <div className="flex items-center gap-3">
              {expense.payer.avatar_url && (
                <img
                  src={expense.payer.avatar_url}
                  alt={expense.payer.full_name || 'User'}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <div>
                <p className="text-base font-medium">
                  {isPayer ? 'You' : expense.payer.full_name || 'Unknown User'}
                </p>
                {isPayer && (
                  <p className="text-sm text-muted-foreground">You paid for this expense</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Split breakdown */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
              <Users className="h-4 w-4" />
              <span>Split Details</span>
            </div>
            <div className="space-y-2">
              {expense.participants.map(participant => {
                const isCurrentUser = participant.user_id === currentUserId
                const shareAmount = formatAmount(participant.share_amount, expense.currency)
                const sharePercentage = ((participant.share_amount / expense.amount) * 100).toFixed(
                  1
                )

                return (
                  <div
                    key={participant.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      isCurrentUser && 'bg-accent/50 border-primary/20'
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {participant.user.avatar_url && (
                        <img
                          src={participant.user.avatar_url}
                          alt={participant.user.full_name || 'User'}
                          className="h-8 w-8 rounded-full flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {isCurrentUser ? 'You' : participant.user.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sharePercentage}% • {participant.share_type} split
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{shareAmount}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Receipt */}
          {expense.receipt_url && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <Receipt className="h-4 w-4" />
                  <span>Receipt</span>
                </div>
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View receipt
                </a>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {canEdit && (onEdit || onDelete) && (
          <SheetFooter className="flex-row gap-2 sm:space-x-0">
            {onEdit && (
              <Button onClick={onEdit} variant="outline" className="flex-1">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button onClick={onDelete} variant="destructive" className="flex-1">
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
