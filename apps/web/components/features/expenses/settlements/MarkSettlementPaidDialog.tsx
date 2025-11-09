'use client'

/**
 * MarkSettlementPaidDialog Component
 *
 * Dialog for marking a settlement as paid/settled.
 * Allows user to add an optional note (e.g., "Paid via Venmo").
 * Shows settlement details (from_user → to_user, amount).
 */

import { useState } from 'react'
import type { SettlementWithUsers } from '@tripthreads/core'
import { Check, ArrowRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface MarkSettlementPaidDialogProps {
  settlement: SettlementWithUsers | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (settlementId: string, note?: string) => void | Promise<void>
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

export function MarkSettlementPaidDialog({
  settlement,
  open,
  onOpenChange,
  onConfirm,
  currentUserId,
}: MarkSettlementPaidDialogProps) {
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!settlement) return null

  const isDebtor = settlement.from_user_id === currentUserId
  const isCreditor = settlement.to_user_id === currentUserId

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(settlement.id, note.trim() || undefined)
      setNote('') // Reset note after successful submission
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to mark settlement as paid:', error)
      // Error handling will be done by parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setNote('') // Reset note on cancel
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            Mark as Paid
          </DialogTitle>
          <DialogDescription>
            Confirm that this payment has been completed. This action will mark the settlement as
            settled and exclude it from future balance calculations.
          </DialogDescription>
        </DialogHeader>

        {/* Settlement Details */}
        <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
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
        </div>

        {/* Optional Note */}
        <div className="space-y-2">
          <Label htmlFor="note" className="text-sm font-medium">
            Payment Note (Optional)
          </Label>
          <Textarea
            id="note"
            placeholder="e.g., Paid via Venmo, Bank transfer on 1/29, etc."
            value={note}
            onChange={e => setNote(e.target.value)}
            className="min-h-[80px] resize-none"
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            Add an optional note to record payment method or details.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="animate-pulse">Marking as Paid...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Confirm Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
