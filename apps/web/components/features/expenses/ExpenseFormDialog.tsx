'use client'

/**
 * ExpenseFormDialog Component
 *
 * Modal dialog for creating and editing expenses.
 * Features:
 * - Form validation with Zod
 * - Interactive split configuration (equal/percentage/custom)
 * - Participant selection
 * - Real-time split preview
 * - Real-time error messages
 * - Loading state during submission
 */

import { useState, useEffect, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Loader2, DollarSign, Upload } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@tripthreads/core'

import { createExpenseSchema, CURRENCY_CODES, type CreateExpenseFormData } from '@tripthreads/core'
import { createExpense, type CreateExpenseInput } from '@/app/actions/expenses'
import type { ExpenseWithDetails } from '@tripthreads/core'
import { SplitTypeSelector, type SplitMode } from './SplitTypeSelector'
import { ParticipantPicker } from './ParticipantPicker'
import { PercentageSplitInput } from './PercentageSplitInput'
import { CustomAmountInput } from './CustomAmountInput'
import { SplitPreview } from './SplitPreview'
import { Separator } from '@/components/ui/separator'

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: string
  tripParticipants: { id: string; name: string; avatar_url?: string }[]
  expense?: ExpenseWithDetails // For edit mode
  onSuccess?: () => void
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  tripId,
  tripParticipants,
  expense,
  onSuccess,
}: ExpenseFormDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditMode = !!expense

  // Split configuration state
  const [splitType, setSplitType] = useState<SplitMode>('equal')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [percentageSplits, setPercentageSplits] = useState<Record<string, number>>({})
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({})

  const form = useForm<CreateExpenseFormData>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      description: '',
      amount: 0,
      currency: 'EUR',
      category: 'other',
      payer_id: '',
      date: new Date().toISOString(),
    },
  })

  // Initialize split state when dialog opens
  useEffect(() => {
    if (open && !expense) {
      // Default: all participants selected, payer included
      const allParticipantIds = tripParticipants.map(p => p.id)
      setSelectedParticipants(allParticipantIds)
      setSplitType('equal')
      setPercentageSplits({})
      setCustomAmounts({})
    }
  }, [open, expense, tripParticipants])

  // Load expense data in edit mode
  useEffect(() => {
    if (expense && open) {
      form.reset({
        description: expense.description,
        amount: expense.amount / 100, // Convert from cents to major units
        currency: expense.currency,
        category: expense.category,
        payer_id: expense.payer_id,
        date: expense.date,
      })
      // TODO: Load split configuration from expense participants
    } else if (!expense && open) {
      // Reset to defaults for create mode
      form.reset({
        description: '',
        amount: 0,
        currency: 'EUR',
        category: 'other',
        payer_id: tripParticipants[0]?.id || '',
        date: new Date().toISOString(),
      })
    }
  }, [expense, open, form, tripParticipants])

  // Ensure payer is included in participants by default
  useEffect(() => {
    const payerId = form.watch('payer_id')
    if (payerId && !selectedParticipants.includes(payerId)) {
      setSelectedParticipants(prev => [...prev, payerId])
    }
  }, [form.watch('payer_id'), selectedParticipants])

  // Split validation
  const isSplitValid = useMemo(() => {
    if (selectedParticipants.length === 0) return false

    if (splitType === 'equal') {
      return true // Equal split is always valid if participants selected
    }

    if (splitType === 'percentage') {
      const total = Object.values(percentageSplits).reduce((sum, val) => sum + val, 0)
      return Math.abs(total - 100) < 0.01 // Allow small floating point errors
    }

    if (splitType === 'amount') {
      const total = Object.values(customAmounts).reduce((sum, val) => sum + val, 0)
      const expenseAmount = form.watch('amount')
      return Math.abs(total - expenseAmount) < 0.01
    }

    return false
  }, [splitType, selectedParticipants, percentageSplits, customAmounts, form.watch('amount')])

  // Calculate preview data
  const splitPreviewData = useMemo(() => {
    const amount = form.watch('amount')

    return selectedParticipants
      .map(participantId => {
        const participant = tripParticipants.find(p => p.id === participantId)
        if (!participant) return null

        let shareAmount = 0
        let sharePercentage = 0

        if (splitType === 'equal') {
          shareAmount = amount / selectedParticipants.length
          sharePercentage = 100 / selectedParticipants.length
        } else if (splitType === 'percentage') {
          sharePercentage = percentageSplits[participantId] || 0
          shareAmount = (amount * sharePercentage) / 100
        } else if (splitType === 'amount') {
          shareAmount = customAmounts[participantId] || 0
          sharePercentage = amount > 0 ? (shareAmount / amount) * 100 : 0
        }

        return {
          id: participantId,
          name: participant.name,
          avatar_url: participant.avatar_url,
          amount: shareAmount,
          percentage: sharePercentage,
        }
      })
      .filter(Boolean) as Array<{
      id: string
      name: string
      avatar_url?: string
      amount: number
      percentage: number
    }>
  }, [
    form.watch('amount'),
    form.watch('currency'),
    splitType,
    selectedParticipants,
    percentageSplits,
    customAmounts,
    tripParticipants,
  ])

  async function onSubmit(values: CreateExpenseFormData) {
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
      // Convert amount from major units to cents
      const amountInCents = Math.round(values.amount * 100)

      // Build split configuration
      let input: CreateExpenseInput

      if (splitType === 'equal') {
        input = {
          tripId,
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
          tripId,
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
        // Custom amounts
        input = {
          tripId,
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
              amount: Math.round((customAmounts[id] || 0) * 100), // Convert to cents
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
        title: isEditMode ? 'Expense updated!' : 'Expense created!',
        description: `${values.description} has been ${isEditMode ? 'updated' : 'added'} successfully.`,
      })

      // Close dialog and reset form
      onOpenChange(false)
      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error('Error saving expense:', error)
      toast({
        title: `Error ${isEditMode ? 'updating' : 'creating'} expense`,
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the expense details and split configuration.'
              : 'Track a new expense and configure how it should be split among participants.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Dinner at Le Bistro"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount and Currency */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="pl-9"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCY_CODES.map((code: string) => (
                          <SelectItem key={code} value={code}>
                            {code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="accommodation">Accommodation</SelectItem>
                      <SelectItem value="activity">Activity</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payer */}
            <FormField
              control={form.control}
              name="payer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid By</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tripParticipants.map(participant => (
                        <SelectItem key={participant.id} value={participant.id}>
                          {participant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                          disabled={isSubmitting}
                        >
                          {field.value ? (
                            format(new Date(field.value), 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={date => field.onChange(date?.toISOString())}
                        disabled={date => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Split Configuration Section */}
            <Separator className="my-6" />

            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Split Configuration</h4>

              {/* Split Type Selector */}
              <SplitTypeSelector value={splitType} onChange={setSplitType} />

              {/* Participant Picker */}
              <ParticipantPicker
                participants={tripParticipants.map(p => ({
                  id: p.id,
                  name: p.name,
                  avatar_url: p.avatar_url,
                }))}
                selectedIds={selectedParticipants}
                onChange={setSelectedParticipants}
                payerId={form.watch('payer_id')}
              />

              {/* Percentage Split Input */}
              {splitType === 'percentage' && selectedParticipants.length > 0 && (
                <PercentageSplitInput
                  participants={selectedParticipants
                    .map(id => tripParticipants.find(p => p.id === id))
                    .filter(Boolean)
                    .map(p => ({
                      id: p!.id,
                      name: p!.name,
                      avatar_url: p!.avatar_url,
                    }))}
                  values={percentageSplits}
                  onChange={setPercentageSplits}
                  isValid={isSplitValid}
                />
              )}

              {/* Custom Amount Input */}
              {splitType === 'amount' && selectedParticipants.length > 0 && (
                <CustomAmountInput
                  participants={selectedParticipants
                    .map(id => tripParticipants.find(p => p.id === id))
                    .filter(Boolean)
                    .map(p => ({
                      id: p!.id,
                      name: p!.name,
                      avatar_url: p!.avatar_url,
                    }))}
                  totalAmount={form.watch('amount')}
                  currency={form.watch('currency')}
                  values={customAmounts}
                  onChange={setCustomAmounts}
                  isValid={isSplitValid}
                />
              )}

              {/* Split Preview */}
              {selectedParticipants.length > 0 && form.watch('amount') > 0 && (
                <SplitPreview
                  totalAmount={form.watch('amount')}
                  currency={form.watch('currency')}
                  splitType={splitType}
                  participants={splitPreviewData}
                />
              )}

              {/* Receipt Upload Placeholder */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full"
                  data-testid="receipt-upload-button"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Receipt (Coming Soon)
                </Button>
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  Receipt upload will be available in a future update
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isSplitValid}
                data-testid="submit-expense"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Update' : 'Create'} Expense
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
