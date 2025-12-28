'use client'

/**
 * EditTripForm Component
 *
 * Reusable form for editing trip details.
 * Can be used inline (e.g., in Settings accordion) or wrapped in a dialog.
 * Extracted from EditTripDialog for better code reuse.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { useToast } from '@/hooks/use-toast'

import { createClient } from '@/lib/supabase/client'
import { updateTrip, updateTripSchema, type UpdateTripInput } from '@tripthreads/core'

interface Trip {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  cover_image_url?: string | null
}

interface EditTripFormProps {
  trip: Trip
  onSuccess?: () => void
  onCancel?: () => void
  variant?: 'default' | 'compact'
}

export function EditTripForm({
  trip,
  onSuccess,
  onCancel,
  variant = 'default',
}: EditTripFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<UpdateTripInput>({
    resolver: zodResolver(updateTripSchema),
    defaultValues: {
      name: trip.name,
      description: trip.description,
      start_date: trip.start_date,
      end_date: trip.end_date,
      cover_image_url: trip.cover_image_url,
    },
  })

  // Reset form when trip changes
  useEffect(() => {
    form.reset({
      name: trip.name,
      description: trip.description,
      start_date: trip.start_date,
      end_date: trip.end_date,
      cover_image_url: trip.cover_image_url,
    })
  }, [trip, form])

  async function onSubmit(values: UpdateTripInput) {
    setIsSubmitting(true)

    try {
      const supabase = createClient()

      await updateTrip(supabase, trip.id, values)

      toast({
        title: 'Trip updated!',
        description: 'Your changes have been saved successfully.',
      })

      router.refresh()
      onSuccess?.()
    } catch (error) {
      console.error('Error updating trip:', error)
      toast({
        title: 'Error updating trip',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isCompact = variant === 'compact'

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={isCompact ? 'space-y-4' : 'space-y-6'}
      >
        {/* Trip Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trip Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Paris Summer 2025"
                  {...field}
                  value={field.value || ''}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          {/* Start Date */}
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
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
                        field.onChange('')
                      }
                    }}
                    placeholder="Pick a date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* End Date */}
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
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
                        field.onChange('')
                      }
                    }}
                    disabled={date => {
                      const startDate = form.getValues('start_date')
                      if (startDate) {
                        return date < new Date(startDate)
                      }
                      return false
                    }}
                    placeholder="Pick a date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What's this trip about?"
                  className="resize-none"
                  {...field}
                  value={field.value || ''}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>Brief description of your trip plans</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  )
}
