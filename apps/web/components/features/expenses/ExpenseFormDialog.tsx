'use client'

/**
 * ExpenseFormDialog Component
 *
 * Modal dialog for creating and editing expenses.
 * Features:
 * - Form validation with Zod
 * - Basic fields only (no split editing for MVP)
 * - Default equal split among all trip participants
 * - Real-time error messages
 * - Loading state during submission
 */

import { useState, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Loader2, DollarSign } from 'lucide-react'
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
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@tripthreads/core'

import { createExpenseSchema, CURRENCY_CODES, type CreateExpenseFormData } from '@tripthreads/core'
import { createExpense, type CreateExpenseInput } from '@/app/actions/expenses'
import type { ExpenseWithDetails } from '@tripthreads/core'

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: string
  tripParticipants: { id: string; name: string }[]
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

  async function onSubmit(values: CreateExpenseFormData) {
    setIsSubmitting(true)

    try {
      // Convert amount from major units to cents
      const amountInCents = Math.round(values.amount * 100)

      // Get all participant IDs for equal split
      const participantIds = tripParticipants.map(p => p.id)

      const input: CreateExpenseInput = {
        tripId,
        amount: amountInCents,
        currency: values.currency,
        description: values.description,
        category: values.category,
        payer: values.payer_id,
        splitType: 'equal',
        splitCount: participantIds.length,
        participants: participantIds,
        customSplits: null,
        date: values.date,
      }

      await createExpense(input)

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
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the expense details below.'
              : 'Track a new expense for this trip. Split details can be adjusted later.'}
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
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
