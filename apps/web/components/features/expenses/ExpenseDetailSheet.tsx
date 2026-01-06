'use client'

/**
 * ExpenseDetailSheet Component
 *
 * Side panel displaying full expense details including all participant splits.
 * Supports two modes:
 * - View mode: Read-only display of expense details
 * - Edit mode: Inline form for editing expense details
 *
 * Shows: description, amount, payer, date, category, receipt, split breakdown
 * Includes edit/delete actions for authorized users
 */

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ExpenseWithDetails } from '@tripthreads/core'
import {
  formatCurrencyFromMinorUnits,
  createExpenseSchema,
  type CreateExpenseFormData,
} from '@tripthreads/core'
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
import { Form } from '@/components/ui/form'
import { Edit, Trash, Calendar, User, Users, DollarSign, Receipt, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { createExpense, type CreateExpenseInput } from '@/app/actions/expenses'
import { ExpenseFormFields } from './ExpenseFormFields'
import { SplitConfiguration } from './SplitConfiguration'
import type { SplitMode } from './SplitTypeSelector'

interface ExpenseDetailSheetProps {
  expense: ExpenseWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId?: string
  mode?: 'view' | 'edit'
  onModeChange?: (mode: 'view' | 'edit') => void
  tripParticipants?: Array<{ id: string; name: string; avatar_url?: string }>
  onDelete?: () => void
  onSuccess?: () => void
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
  mode = 'view',
  onModeChange,
  tripParticipants = [],
  onDelete,
  onSuccess,
}: ExpenseDetailSheetProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canEdit = currentUserId === expense.created_by
  const isPayer = currentUserId === expense.payer_id

  // Split configuration state for edit mode
  const [splitType, setSplitType] = useState<SplitMode>('equal')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [percentageSplits, setPercentageSplits] = useState<Record<string, number>>({})
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({})

  const form = useForm<CreateExpenseFormData>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      description: expense.description,
      amount: expense.amount / 100,
      currency: expense.currency,
      category: expense.category,
      payer_id: expense.payer_id,
      date: expense.date,
    },
  })

  // Load expense data when switching to edit mode
  useEffect(() => {
    if (open && mode === 'edit') {
      form.reset({
        description: expense.description,
        amount: expense.amount / 100,
        currency: expense.currency,
        category: expense.category,
        payer_id: expense.payer_id,
        date: expense.date,
      })

      // Load split configuration from expense participants
      const participantIds = expense.participants.map(p => p.user_id)
      setSelectedParticipants(participantIds)

      // Detect split type based on participants
      if (expense.participants.length > 0) {
        const firstParticipant = expense.participants[0]
        if (firstParticipant.share_type === 'equal') {
          setSplitType('equal')
        } else if (firstParticipant.share_type === 'percentage') {
          setSplitType('percentage')
          const percentages: Record<string, number> = {}
          expense.participants.forEach(p => {
            const percentage = (p.share_amount / expense.amount) * 100
            percentages[p.user_id] = percentage
          })
          setPercentageSplits(percentages)
        } else {
          setSplitType('amount')
          const amounts: Record<string, number> = {}
          expense.participants.forEach(p => {
            amounts[p.user_id] = p.share_amount / 100 // Convert from cents
          })
          setCustomAmounts(amounts)
        }
      }
    }
  }, [open, mode, expense, form])

  // Split validation
  const isSplitValid = useMemo(() => {
    if (selectedParticipants.length === 0) return false

    if (splitType === 'equal') {
      return true
    }

    if (splitType === 'percentage') {
      const total = Object.values(percentageSplits).reduce((sum, val) => sum + val, 0)
      return Math.abs(total - 100) < 0.01
    }

    if (splitType === 'amount') {
      const total = Object.values(customAmounts).reduce((sum, val) => sum + val, 0)
      const expenseAmount = form.watch('amount')
      return Math.abs(total - expenseAmount) < 0.01
    }

    return false
  }, [splitType, selectedParticipants, percentageSplits, customAmounts, form])

  async function handleSave() {
    const values = form.getValues()

    // Validate split configuration
    if (!isSplitValid) {
      toast({
        title: 'Invalid split configuration',
        description:
          splitType === 'percentage'
            ? 'Percentages must add up to 100%'
            : 'Custom amounts must equal the total expense amount',
        variant: 'destructive',
      })
      return
    }

    if (selectedParticipants.length === 0) {
      toast({
        title: 'No participants selected',
        description: 'Please select at least one participant for this expense',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const amountInCents = Math.round(values.amount * 100)

      let input: CreateExpenseInput

      if (splitType === 'equal') {
        input = {
          tripId: expense.trip_id,
          amount: amountInCents,
          currency: values.currency,
          description: values.description,
          category: values.category,
          payer: values.payer_id,
          splitType: 'equal',
          splitCount: selectedParticipants.length,
          participants: selectedParticipants,
          customSplits: null,
          percentageSplits: null,
          date: values.date,
        }
      } else if (splitType === 'percentage') {
        input = {
          tripId: expense.trip_id,
          amount: amountInCents,
          currency: values.currency,
          description: values.description,
          category: values.category,
          payer: values.payer_id,
          splitType: 'percentage',
          splitCount: null,
          participants: null,
          customSplits: null,
          percentageSplits: selectedParticipants.map(id => {
            const participant = tripParticipants.find(p => p.id === id)
            return {
              name: participant?.name || id,
              percentage: percentageSplits[id] || 0,
            }
          }),
          date: values.date,
        }
      } else {
        input = {
          tripId: expense.trip_id,
          amount: amountInCents,
          currency: values.currency,
          description: values.description,
          category: values.category,
          payer: values.payer_id,
          splitType: 'custom',
          splitCount: null,
          participants: null,
          customSplits: selectedParticipants.map(id => {
            const participant = tripParticipants.find(p => p.id === id)
            return {
              name: participant?.name || id,
              amount: Math.round((customAmounts[id] || 0) * 100),
            }
          }),
          percentageSplits: null,
          date: values.date,
        }
      }

      const result = await createExpense(input)

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: 'Expense updated!',
        description: `${values.description} has been updated successfully.`,
      })

      onSuccess?.()
      onModeChange?.('view')
    } catch (error) {
      console.error('Error updating expense:', error)
      toast({
        title: 'Error updating expense',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    // Reset form to original values
    form.reset({
      description: expense.description,
      amount: expense.amount / 100,
      currency: expense.currency,
      category: expense.category,
      payer_id: expense.payer_id,
      date: expense.date,
    })
    onModeChange?.('view')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">
            {mode === 'view' ? expense.description : 'Edit Expense'}
          </SheetTitle>
          <SheetDescription>
            {mode === 'view'
              ? `Created ${format(parseISO(expense.created_at), 'MMM d, yyyy')}`
              : 'Update the expense details and split configuration'}
          </SheetDescription>
        </SheetHeader>

        {mode === 'view' ? (
          // VIEW MODE - Read-only display
          <div className="space-y-6 py-6">
            {/* Amount */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <DollarSign className="h-4 w-4" />
                <span>Amount</span>
              </div>
              <p className="text-3xl font-bold text-primary">
                {formatCurrencyFromMinorUnits(expense.amount, expense.currency)}
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
                  const shareAmount = formatCurrencyFromMinorUnits(
                    participant.share_amount,
                    expense.currency
                  )
                  const sharePercentage = (
                    (participant.share_amount / expense.amount) *
                    100
                  ).toFixed(1)

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
                            className="h-8 w-8 rounded-full shrink-0"
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
        ) : (
          // EDIT MODE - Form fields
          <div className="space-y-6 py-6">
            <Form {...form}>
              <ExpenseFormFields
                form={form}
                tripParticipants={tripParticipants}
                isSubmitting={isSubmitting}
              />

              <Separator className="my-6" />

              <SplitConfiguration
                tripParticipants={tripParticipants}
                splitType={splitType}
                onSplitTypeChange={setSplitType}
                selectedParticipants={selectedParticipants}
                onSelectedParticipantsChange={setSelectedParticipants}
                percentageSplits={percentageSplits}
                onPercentageSplitsChange={setPercentageSplits}
                customAmounts={customAmounts}
                onCustomAmountsChange={setCustomAmounts}
                totalAmount={form.watch('amount')}
                currency={form.watch('currency')}
                payerId={form.watch('payer_id')}
                isSplitValid={isSplitValid}
              />
            </Form>
          </div>
        )}

        {/* Footer Actions */}
        {canEdit && (
          <SheetFooter className="flex-row gap-2 sm:space-x-0">
            {mode === 'view' ? (
              <>
                <Button onClick={() => onModeChange?.('edit')} variant="outline" className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {onDelete && (
                  <Button onClick={onDelete} variant="destructive" className="flex-1">
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1"
                  disabled={isSubmitting || !isSplitValid}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
