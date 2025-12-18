/**
 * Profile Section
 *
 * Displays and allows editing of:
 * - Display name (inline editing with save button)
 * - Avatar (upload, crop, delete)
 * - Email (read-only for now)
 * - Banner for OAuth users without names
 */

'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, Trash2, AlertCircle } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { AvatarCropDialog } from './AvatarCropDialog'
import { updateProfileName, uploadAvatar, deleteAvatar } from '@/app/actions/profile'
import { validateAvatarFile } from '@/lib/utils/avatar'
import type { Database } from '@tripthreads/core'

type User = Database['public']['Tables']['profiles']['Row']

interface ProfileSectionProps {
  user: User
  onUpdate?: () => void
}

const nameSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(
      /^[a-zA-Z0-9\s'-]+$/,
      'Name can only contain letters, numbers, spaces, hyphens, and apostrophes'
    )
    .trim(),
})

type NameFormValues = z.infer<typeof nameSchema>

export function ProfileSection({ user, onUpdate }: ProfileSectionProps) {
  const { toast } = useToast()
  const [isUpdatingName, setIsUpdatingName] = React.useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false)
  const [isDeletingAvatar, setIsDeletingAvatar] = React.useState(false)
  const [cropDialogOpen, setCropDialogOpen] = React.useState(false)
  const [selectedImageSrc, setSelectedImageSrc] = React.useState<string | null>(null)
  const [selectedImageFile, setSelectedImageFile] = React.useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const form = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: {
      full_name: user.full_name || '',
    },
  })

  // Check if user has no name (OAuth users)
  const hasNoName = !user.full_name || user.full_name.trim() === ''

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (user.full_name) {
      return user.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return user.email.slice(0, 2).toUpperCase()
  }

  const handleNameSubmit = async (data: NameFormValues) => {
    try {
      setIsUpdatingName(true)
      await updateProfileName(data.full_name)
      toast({
        title: 'Name updated',
        description: 'Your display name has been updated successfully.',
      })
      onUpdate?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update name',
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingName(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
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

    // Create preview URL
    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImageSrc(reader.result as string)
      setSelectedImageFile(file)
      setCropDialogOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    try {
      setIsUploadingAvatar(true)

      // Create FormData with cropped image
      const formData = new FormData()
      const croppedFile = new File([croppedImageBlob], selectedImageFile?.name || 'avatar.jpg', {
        type: 'image/jpeg',
      })
      formData.append('avatar', croppedFile)

      // Upload avatar
      await uploadAvatar(formData)

      toast({
        title: 'Avatar updated',
        description: 'Your avatar has been updated successfully.',
      })

      onUpdate?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload avatar',
        variant: 'destructive',
      })
    } finally {
      setIsUploadingAvatar(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteAvatar = async () => {
    try {
      setIsDeletingAvatar(true)
      await deleteAvatar()
      toast({
        title: 'Avatar removed',
        description: 'Your avatar has been removed.',
      })
      onUpdate?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete avatar',
        variant: 'destructive',
      })
    } finally {
      setIsDeletingAvatar(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner for OAuth users without names */}
      {hasNoName && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Complete your profile by adding your name. This helps other travelers recognize you!
          </AlertDescription>
        </Alert>
      )}

      {/* Avatar section */}
      <div className="flex items-start gap-6">
        <Avatar className="h-24 w-24">
          <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
          <AvatarFallback className="text-xl">{getUserInitials()}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1">Profile Picture</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload a photo to personalize your profile. Accepts JPG, PNG, or WebP up to 5MB.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar || isDeletingAvatar}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}
            </Button>

            {user.avatar_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAvatar}
                disabled={isUploadingAvatar || isDeletingAvatar}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeletingAvatar ? 'Removing...' : 'Remove'}
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* Name section */}
      <form onSubmit={form.handleSubmit(handleNameSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Display Name</Label>
          <div className="flex gap-2">
            <Input
              id="full_name"
              placeholder={hasNoName ? user.email : 'Enter your name'}
              {...form.register('full_name')}
              disabled={isUpdatingName}
            />
            <Button type="submit" disabled={isUpdatingName || !form.formState.isDirty}>
              {isUpdatingName ? 'Saving...' : 'Save'}
            </Button>
          </div>
          {form.formState.errors.full_name && (
            <p className="text-sm text-red-600">{form.formState.errors.full_name.message}</p>
          )}
        </div>
      </form>

      {/* Email section (read-only) */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user.email} disabled className="bg-gray-50 dark:bg-gray-900" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Email changes coming soon. Contact support if you need to update your email.
        </p>
      </div>

      {/* Crop dialog */}
      {selectedImageSrc && (
        <AvatarCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageSrc={selectedImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  )
}
