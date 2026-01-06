'use client'

/**
 * ExpenseFormFields Component
 *
 * Reusable expense form fields component for both create and edit modes.
 * Contains basic expense fields: description, amount, currency, category, payer, and date.
 * Designed to be used in both ExpenseFormDialog (create) and ExpenseDetailSheet (edit).
 */

import { DollarSign } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import type { CreateExpenseFormData } from '@tripthreads/core'
import { CURRENCY_CODES } from '@tripthreads/core'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'

interface ExpenseFormFieldsProps {
  form: UseFormReturn<CreateExpenseFormData>
  tripParticipants: Array<{ id: string; name: string }>
  isSubmitting?: boolean
}

export function ExpenseFormFields({
  form,
  tripParticipants,
  isSubmitting = false,
}: ExpenseFormFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Dinner at Le Bistro" {...field} disabled={isSubmitting} />
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
            <FormControl>
              <DatePicker
                selected={field.value ? new Date(field.value) : undefined}
                onChange={date => {
                  if (date) {
                    // Set to noon UTC to avoid timezone issues
                    const adjustedDate = new Date(date)
                    adjustedDate.setHours(12, 0, 0, 0)
                    field.onChange(adjustedDate.toISOString())
                  } else {
                    field.onChange(new Date().toISOString())
                  }
                }}
                disabled={date => date > new Date() || date < new Date('1900-01-01')}
                placeholder="Pick a date"
                maxDate={new Date()}
                minDate={new Date('1900-01-01')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
