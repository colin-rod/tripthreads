'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FileImage, Loader2, Send, X } from 'lucide-react'
import { submitFeedbackToLinear, type FeedbackCategory } from '@tripthreads/core'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const feedbackSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  category: z.enum(['bug-report', 'feature-request', 'general', 'ux-issue']),
  message: z.string().min(10, 'Please share at least 10 characters'),
})

type FeedbackFormValues = z.infer<typeof feedbackSchema>

interface FeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const pathname = usePathname()
  const { toast } = useToast()
  const [screenshotName, setScreenshotName] = useState<string | null>(null)
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      email: '',
      category: 'general',
      message: '',
    },
  })

  // Fetch user email on mount
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        form.setValue('email', user.email)
      }
    }
    fetchUser()
  }, [form])

  // Extract trip ID from pathname if present
  const extractTripId = (): string | undefined => {
    // Match /trips/[uuid] pattern
    const tripMatch = pathname.match(/\/trips\/([a-f0-9-]{36})/i)
    return tripMatch?.[1]
  }

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

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      // Only handle paste when modal is open
      if (!open) return

      const items = event.clipboardData?.items
      if (!items) return

      // Look for image items in clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            handleScreenshotUpload(file)
            toast({
              title: 'Screenshot pasted',
              description: 'Your screenshot has been added to the feedback.',
            })
            event.preventDefault()
          }
          break
        }
      }
    },
    [open, toast]
  )

  const handleRemoveScreenshot = () => {
    setScreenshotDataUrl(null)
    setScreenshotName(null)
  }

  // Add paste event listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [handlePaste])

  const onSubmit = async (values: FeedbackFormValues) => {
    try {
      setIsSubmitting(true)

      const tripId = extractTripId()

      await submitFeedbackToLinear(supabase, {
        ...values,
        environment: process.env.NODE_ENV as 'production' | 'staging' | 'development',
        tripId,
        screenshotDataUrl: screenshotDataUrl || undefined,
        platform: 'web',
      })

      toast({
        title: 'Thank you for your feedback',
        description: 'We received your note and will review it shortly.',
      })

      // Close modal and reset form
      onOpenChange(false)
      form.reset({
        email: userEmail,
        category: 'general',
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share feedback</DialogTitle>
          <DialogDescription>
            Tell us what&apos;s working well and where we can improve. Screenshots help us debug
            faster.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <Label htmlFor="category">Category</Label>
            <Select
              onValueChange={value =>
                form.setValue('category', value as FeedbackCategory, {
                  shouldValidate: true,
                })
              }
              defaultValue={form.getValues('category')}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug-report">Bug Report</SelectItem>
                <SelectItem value="feature-request">Feature Request</SelectItem>
                <SelectItem value="general">General Feedback</SelectItem>
                <SelectItem value="ux-issue">UX Issue</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
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
            <p className="text-sm text-muted-foreground">
              Upload a file or paste from clipboard (Cmd/Ctrl+V)
            </p>
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
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{screenshotName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveScreenshot}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            {screenshotDataUrl && (
              <div className="overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 p-3">
                <img
                  src={screenshotDataUrl}
                  alt="Screenshot preview"
                  className="max-h-48 w-full rounded object-contain"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
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
      </DialogContent>
    </Dialog>
  )
}
