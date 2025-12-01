'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FileImage, Loader2, Send } from 'lucide-react'
import { submitFeedbackToLinear } from '@tripthreads/core/utils/feedback'
import type { FeedbackEnvironment } from '@tripthreads/core/types/feedback'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const feedbackSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  environment: z.enum(['production', 'staging', 'development']),
  tripId: z.string().optional(),
  message: z.string().min(10, 'Please share at least 10 characters'),
})

export type FeedbackFormValues = z.infer<typeof feedbackSchema>

interface FeedbackFormProps {
  defaultEmail?: string
  defaultTripId?: string
}

export function FeedbackForm({ defaultEmail, defaultTripId }: FeedbackFormProps) {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [screenshotName, setScreenshotName] = useState<string | null>(null)
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showThanks, setShowThanks] = useState(false)

  const fallbackTripId = useMemo(
    () => searchParams.get('tripId') || defaultTripId || '',
    [searchParams, defaultTripId]
  )

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      email: defaultEmail || '',
      environment: 'production',
      tripId: fallbackTripId,
      message: '',
    },
  })

  useEffect(() => {
    if (defaultEmail && !form.getValues('email')) {
      form.setValue('email', defaultEmail)
    }
  }, [defaultEmail, form])

  useEffect(() => {
    if (fallbackTripId && !form.getValues('tripId')) {
      form.setValue('tripId', fallbackTripId)
    }
  }, [fallbackTripId, form])

  const handleScreenshotUpload = async (file?: File) => {
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Image too large',
        description: 'Please upload a screenshot under 5MB.',
        variant: 'destructive',
      })
      return
    }

    setScreenshotName(file.name)

    const reader = new FileReader()
    reader.onloadend = () => {
      setScreenshotDataUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const onSubmit = async (values: FeedbackFormValues) => {
    try {
      setIsSubmitting(true)
      setShowThanks(false)

      await submitFeedbackToLinear(supabase, {
        ...values,
        tripId: values.tripId || undefined,
        screenshotDataUrl: screenshotDataUrl || undefined,
        platform: 'web',
      })

      toast({
        title: 'Thank you for your feedback',
        description: 'We received your note and will review it shortly.',
      })
      setShowThanks(true)
      form.reset({
        email: values.email,
        environment: values.environment,
        tripId: values.tripId,
        message: '',
      })
      setScreenshotDataUrl(null)
      setScreenshotName(null)
    } catch (error) {
      console.error('Failed to send feedback', error)
      toast({
        title: 'Unable to send feedback',
        description: error instanceof Error ? error.message : 'Please try again in a moment.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select
                onValueChange={value =>
                  form.setValue('environment', value as FeedbackEnvironment, {
                    shouldValidate: true,
                  })
                }
                defaultValue={form.getValues('environment')}
              >
                <SelectTrigger id="environment">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.environment && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.environment.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tripId">Trip ID (optional)</Label>
            <Input
              id="tripId"
              placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
              {...form.register('tripId')}
            />
            {form.formState.errors.tripId && (
              <p className="text-sm text-destructive">{form.formState.errors.tripId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Feedback</Label>
            <Textarea
              id="message"
              rows={5}
              placeholder="What happened? What did you expect?"
              {...form.register('message')}
            />
            {form.formState.errors.message && (
              <p className="text-sm text-destructive">{form.formState.errors.message.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Screenshot (optional)</Label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                id="screenshot-upload"
                className="hidden"
                onChange={event => handleScreenshotUpload(event.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('screenshot-upload')?.click()}
              >
                <FileImage className="mr-2 h-4 w-4" />
                {screenshotName ? 'Replace screenshot' : 'Upload screenshot'}
              </Button>
              {screenshotName && (
                <span className="text-sm text-muted-foreground">{screenshotName}</span>
              )}
            </div>
            {screenshotDataUrl && (
              <div className="overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 p-3">
                <img
                  src={screenshotDataUrl}
                  alt="Screenshot preview"
                  className="max-h-64 w-full rounded object-contain"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {showThanks && <p className="text-sm text-primary">Thank you for your feedback!</p>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send feedback
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
