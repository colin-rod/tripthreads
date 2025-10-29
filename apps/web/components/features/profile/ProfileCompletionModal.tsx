'use client'

/**
 * ProfileCompletionModal Component
 *
 * Modal for completing user profile after OAuth or email signup.
 * Features:
 * - Display name input (required)
 * - Avatar upload with preview (optional)
 * - Notification preferences toggles (optional)
 * - Read-only email display
 * - Skip button (only if name is already set from OAuth)
 * - Non-dismissible if name is required
 */

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Loader2, Upload, User, X } from 'lucide-react'

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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'

import { createClient } from '@/lib/supabase/client'
import { completeProfile } from '@shared/lib/supabase/queries/users'
import { completeProfileSchema, type CompleteProfileInput } from '@shared/lib/validation/profile'
import { validateAvatarFile } from '@shared/lib/utils/avatar'

interface ProfileCompletionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userEmail: string
  existingName?: string | null
  existingAvatar?: string | null
}

export function ProfileCompletionModal({
  open,
  onOpenChange,
  userEmail,
  existingName,
  existingAvatar,
}: ProfileCompletionModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(existingAvatar || null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      full_name: existingName || '',
      avatar: null,
      notification_preferences: {
        email_trip_invites: true,
        email_expense_updates: true,
        email_trip_updates: true,
        push_trip_invites: true,
        push_expense_updates: true,
        push_trip_updates: true,
      },
    },
  })

  const canSkip = !!existingName

  function handleAvatarSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateAvatarFile(file)
    if (!validation.valid) {
      toast({
        title: 'Invalid file',
        description: validation.error,
        variant: 'destructive',
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    setSelectedFile(file)
    form.setValue('avatar', file as never)
  }

  function handleRemoveAvatar() {
    setAvatarPreview(null)
    setSelectedFile(null)
    form.setValue('avatar', null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function onSubmit(values: CompleteProfileInput) {
    setIsSubmitting(true)

    try {
      const supabase = createClient()

      await completeProfile(supabase, {
        full_name: values.full_name,
        avatar: selectedFile || undefined,
        notification_preferences: values.notification_preferences,
      })

      toast({
        title: 'Profile completed!',
        description: 'Your profile has been updated successfully.',
      })

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error completing profile:', error)
      toast({
        title: 'Error completing profile',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSkip() {
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={canSkip ? onOpenChange : undefined}>
      <DialogContent
        className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={canSkip ? undefined : e => e.preventDefault()}
        onEscapeKeyDown={canSkip ? undefined : e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            {canSkip
              ? 'Add more details to personalize your profile.'
              : 'Please provide your name to get started with TripThreads.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={userEmail} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Your email address cannot be changed</p>
            </div>

            {/* Display Name (Required) */}
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Display Name {!canSkip && <span className="text-destructive">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., John Doe"
                      {...field}
                      disabled={isSubmitting}
                      autoFocus={!existingName}
                    />
                  </FormControl>
                  <FormDescription>Your name as it will appear to other users</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Avatar Upload (Optional) */}
            <div className="space-y-3">
              <Label>Profile Picture (Optional)</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt="Avatar preview" />
                  ) : (
                    <AvatarFallback>
                      <User className="h-10 w-10 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>

                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarSelect}
                    className="hidden"
                    disabled={isSubmitting}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {avatarPreview ? 'Change' : 'Upload'}
                    </Button>

                    {avatarPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        disabled={isSubmitting}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or WebP. Max 5MB. Will be resized to 512x512px.
                  </p>
                </div>
              </div>
            </div>

            {/* Notification Preferences (Optional) */}
            <div className="space-y-4">
              <div>
                <Label>Notification Preferences</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose how you want to be notified about trip updates
                </p>
              </div>

              <div className="space-y-3 border rounded-lg p-4">
                <FormField
                  control={form.control}
                  name="notification_preferences.email_trip_invites"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email_trip_invites" className="font-normal cursor-pointer">
                        Trip invitations (Email)
                      </Label>
                      <Switch
                        id="email_trip_invites"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notification_preferences.email_expense_updates"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email_expense_updates" className="font-normal cursor-pointer">
                        Expense updates (Email)
                      </Label>
                      <Switch
                        id="email_expense_updates"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notification_preferences.email_trip_updates"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email_trip_updates" className="font-normal cursor-pointer">
                        Trip updates (Email)
                      </Label>
                      <Switch
                        id="email_trip_updates"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {canSkip && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Skip for now
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {canSkip ? 'Save Changes' : 'Complete Profile'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
