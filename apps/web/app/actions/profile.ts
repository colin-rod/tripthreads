/**
 * Server actions for user profile management
 *
 * Handles:
 * - Name updates
 * - Avatar upload/deletion (web-specific)
 * - Notification preferences
 * - Password changes
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { compressAvatar } from '@/lib/utils/avatar'
import { generateAvatarPath } from '@tripthreads/core/utils/avatar'
import type { Database } from '@tripthreads/core/types/database'

type User = Database['public']['Tables']['profiles']['Row']

/**
 * Update user's display name
 *
 * @param fullName - New display name
 * @returns Updated user profile
 */
export async function updateProfileName(fullName: string): Promise<User> {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    throw new Error('Not authenticated')
  }

  // Update profile
  const { data: updatedUser, error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', authUser.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile name:', error)
    throw new Error('Failed to update name')
  }

  // Revalidate profile and trips pages
  revalidatePath('/settings')
  revalidatePath('/trips')

  return updatedUser
}

/**
 * Upload and compress avatar image
 *
 * Automatically deletes old avatar before uploading new one
 *
 * @param formData - FormData containing avatar file
 * @returns Updated user profile with new avatar URL
 */
export async function uploadAvatar(formData: FormData): Promise<User> {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    throw new Error('Not authenticated')
  }

  // Get file from form data
  const file = formData.get('avatar') as File
  if (!file) {
    throw new Error('No file provided')
  }

  // Validate file
  const maxSize = 5 * 1024 * 1024 // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

  if (file.size > maxSize) {
    throw new Error('Avatar must be less than 5MB')
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Avatar must be a JPG, PNG, or WebP image')
  }

  // Compress avatar
  const compressedBlob = await compressAvatar(file)

  // Generate storage path
  const storagePath = generateAvatarPath(authUser.id)

  // Delete old avatar if exists
  const { data: existingFiles } = await supabase.storage.from('avatars').list(authUser.id)

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => `${authUser.id}/${f.name}`)
    await supabase.storage.from('avatars').remove(filesToDelete)
  }

  // Upload new avatar
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(storagePath, compressedBlob, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError)
    throw new Error('Failed to upload avatar')
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(uploadData.path)

  // Update profile with new avatar URL
  const { data: updatedUser, error: updateError } = await supabase
    .from('profiles')
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', authUser.id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating profile with avatar URL:', updateError)
    throw new Error('Failed to update profile')
  }

  // Revalidate profile and trips pages
  revalidatePath('/settings')
  revalidatePath('/trips')

  return updatedUser
}

/**
 * Delete user's avatar
 *
 * Removes avatar from storage and sets avatar_url to null
 *
 * @returns Updated user profile with null avatar_url
 */
export async function deleteAvatar(): Promise<User> {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    throw new Error('Not authenticated')
  }

  // Delete avatar from storage
  const { data: existingFiles } = await supabase.storage.from('avatars').list(authUser.id)

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => `${authUser.id}/${f.name}`)
    await supabase.storage.from('avatars').remove(filesToDelete)
  }

  // Update profile to remove avatar URL
  const { data: updatedUser, error } = await supabase
    .from('profiles')
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', authUser.id)
    .select()
    .single()

  if (error) {
    console.error('Error deleting avatar:', error)
    throw new Error('Failed to delete avatar')
  }

  // Revalidate profile and trips pages
  revalidatePath('/settings')
  revalidatePath('/trips')

  return updatedUser
}

/**
 * Update notification preferences
 *
 * @param preferences - Notification preferences object
 * @returns Updated user profile
 */
export async function updateNotificationPreferences(
  preferences: Record<string, boolean>
): Promise<User> {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    throw new Error('Not authenticated')
  }

  // Update notification preferences
  const { data: updatedUser, error } = await supabase
    .from('profiles')
    .update({
      notification_preferences: preferences as never,
      updated_at: new Date().toISOString(),
    })
    .eq('id', authUser.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating notification preferences:', error)
    throw new Error('Failed to update notification preferences')
  }

  // Revalidate settings page
  revalidatePath('/settings')

  return updatedUser
}

/**
 * Change user password
 *
 * Requires current password for verification
 *
 * @param currentPassword - Current password for verification
 * @param newPassword - New password
 * @returns Success message
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: true }> {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    throw new Error('Not authenticated')
  }

  // Verify current password by attempting sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: authUser.email!,
    password: currentPassword,
  })

  if (signInError) {
    throw new Error('Current password is incorrect')
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    console.error('Error updating password:', updateError)
    throw new Error('Failed to update password')
  }

  return { success: true }
}

/**
 * Generic profile update function
 *
 * Used for updating any profile fields (e.g., cookie consent, legal acceptance)
 *
 * @param updates - Object containing fields to update
 * @returns Updated user profile
 */
export async function updateProfile(
  updates: Partial<Omit<User, 'id' | 'created_at' | 'email'>>
): Promise<User> {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    throw new Error('Not authenticated')
  }

  // Update profile
  const { data: updatedUser, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', authUser.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    throw new Error('Failed to update profile')
  }

  // Revalidate settings page
  revalidatePath('/settings')

  return updatedUser
}
