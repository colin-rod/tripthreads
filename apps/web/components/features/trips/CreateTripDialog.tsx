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

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
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

import { createClient } from '@/lib/supabase/client'
import { createTrip, createTripSchema, type CreateTripInput } from '@tripthreads/core'

interface CreateTripDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTripDialog({ open, onOpenChange }: CreateTripDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOwnerLoading, setIsOwnerLoading] = useState(false)
  const [ownerId, setOwnerId] = useState<string | null>(null)

  const form = useForm<CreateTripInput>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      owner_id: '',
      cover_image_url: null,
    },
  })
  const { setValue } = form

  useEffect(() => {
    if (!open) {
      return
    }

    let isMounted = true
    setIsOwnerLoading(true)

    const loadOwner = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (!isMounted) {
          return
        }

        if (error || !user) {
          setOwnerId(null)
          toast({
            title: 'Authentication required',
            description: 'You must be logged in to create a trip.',
            variant: 'destructive',
          })
          onOpenChange(false)
          return
        }

        setOwnerId(user.id)
        setValue('owner_id', user.id, { shouldDirty: false, shouldValidate: true })
      } catch (error) {
        if (!isMounted) {
          return
        }
        console.error('Error loading user for trip:', error)
        toast({
          title: 'Error creating trip',
          description: 'Unable to load your account info. Please try again.',
          variant: 'destructive',
        })
        onOpenChange(false)
      } finally {
        if (isMounted) {
          setIsOwnerLoading(false)
        }
      }
    }

    void loadOwner()

    return () => {
      isMounted = false
    }
  }, [open, supabase, setValue, toast, onOpenChange])

  async function onSubmit(values: CreateTripInput) {
    if (!ownerId) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to create a trip.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Create trip with current user as owner
      const tripData = {
        ...values,
        owner_id: ownerId,
      }

      const trip = await createTrip(supabase, tripData)

      toast({
        title: 'Trip created!',
        description: `${trip.name} has been created successfully.`,
      })

      // Close dialog and navigate to trip detail page
      onOpenChange(false)
      form.reset()
      router.push(`/trips/${trip.id}`)
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
            <input type="hidden" {...form.register('owner_id')} />
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
              <Button
                type="submit"
                disabled={isSubmitting || isOwnerLoading}
                data-tour="create-trip-submit"
              >
                {(isSubmitting || isOwnerLoading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Trip
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
