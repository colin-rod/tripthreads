'use client'

/**
 * CreateTripDialog Component
 *
 * Modal dialog for creating a new trip.
 * Features:
 * - Form validation with Zod
 * - Date range validation
 * - Real-time error messages
 * - Loading state during submission
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'

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

import { createTrip } from '@/app/actions/trips'
import type { CreateTripInput } from '@tripthreads/core'
import { UpgradePromptDialog } from '@/components/features/subscription/UpgradePromptDialog'

interface CreateTripDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface LimitInfo {
  currentCount: number
  limit: number
  isProUser: boolean
}

export function CreateTripDialog({ open, onOpenChange }: CreateTripDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null)

  type CreateTripFormInput = Omit<CreateTripInput, 'owner_id'>

  const form = useForm<CreateTripFormInput>({
    defaultValues: {
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      cover_image_url: null,
    },
  })

  async function onSubmit(values: Omit<CreateTripInput, 'owner_id'>) {
    setIsSubmitting(true)

    try {
      const result = await createTrip(values)

      if (!result.success || !result.trip) {
        // Check if this is a limit error
        if (result.limitInfo) {
          setLimitInfo(result.limitInfo)
          setShowUpgradePrompt(true)
          return
        }

        // Otherwise show generic error toast
        toast({
          title: 'Error creating trip',
          description: result.error || 'An unexpected error occurred',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Trip created!',
        description: `${result.trip.name} has been created successfully.`,
      })

      // Close dialog and navigate to trip detail page
      onOpenChange(false)
      form.reset()
      router.push(`/trips/${result.trip.id}`)
    } catch (error) {
      console.error('Error creating trip:', error)
      toast({
        title: 'Error creating trip',
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
          <DialogTitle>Create New Trip</DialogTitle>
          <DialogDescription>
            Start planning your next adventure. Add basic details to get started.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      disabled={isSubmitting}
                      data-tour="trip-name-input"
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
                        disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
                          return date < new Date(new Date().setHours(0, 0, 0, 0))
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} data-tour="create-trip-submit">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Trip
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Upgrade Prompt Dialog */}
      <UpgradePromptDialog
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        title="Trip Limit Reached"
        description="You've reached the free tier limit. Upgrade to Pro for unlimited trips."
        limitType="trips"
        currentCount={limitInfo?.currentCount ?? 0}
        limit={limitInfo?.limit ?? 1}
      />
    </Dialog>
  )
}
