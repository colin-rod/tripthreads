/**
 * User profile queries and mutations
 *
 * Handles:
 * - Profile completion detection
 * - Profile updates (name, avatar, preferences)
 * - Avatar upload to Supabase Storage
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@tripthreads/core'
import { compressAvatar } from '../../../../../apps/web/lib/utils/avatar'
import { generateAvatarPath } from '@tripthreads/core'

type User = Database['public']['Tables']['profiles']['Row']
type UserUpdate = Database['public']['Tables']['profiles']['Update']

/**
 * Get current user profile
 *
 * @param supabase - Supabase client
 * @returns User profile or null if not authenticated
 */
export async function getCurrentUser(supabase: SupabaseClient<Database>): Promise<User | null> {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return null
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

/**
 * Check if user profile is complete
 *
 * Profile is complete if:
 * - full_name is set and not empty
 *
 * @param supabase - Supabase client
 * @returns True if profile is complete, false otherwise
 */
export async function isProfileComplete(supabase: SupabaseClient<Database>): Promise<boolean> {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return false
  }

  const { data, error } = await supabase.rpc('is_profile_complete', {
    p_user_id: authUser.id,
  })

  if (error) {
    console.error('Error checking profile completion:', error)
    return false
  }

  return data as boolean
}

/**
 * Upload avatar to Supabase Storage
 *
 * @param supabase - Supabase client
 * @param file - Avatar file to upload
 * @param userId - User ID
 * @returns Storage path or null on error
 */
export async function uploadAvatar(
  supabase: SupabaseClient<Database>,
  file: File,
  userId: string
): Promise<string | null> {
  try {
    // Compress avatar
    const compressedBlob = await compressAvatar(file)

    // Generate storage path
    const storagePath = generateAvatarPath(userId)

    // Delete old avatar if exists
    const { data: existingFiles } = await supabase.storage.from('avatars').list(userId)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`)
      await supabase.storage.from('avatars').remove(filesToDelete)
    }

    // Upload new avatar
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(storagePath, compressedBlob, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) {
      console.error('Error uploading avatar:', error)
      return null
    }

    return data.path
  } catch (error) {
    console.error('Error processing avatar:', error)
    return null
  }
}

/**
 * Complete user profile
 *
 * Updates profile with required and optional fields.
 * Sets profile_completed_at timestamp if not already set.
 *
 * @param supabase - Supabase client
 * @param data - Profile data to update
 * @returns Updated user or null on error
 */
export async function completeProfile(
  supabase: SupabaseClient<Database>,
  data: {
    full_name: string
    avatar?: File
    notification_preferences?: Record<string, boolean>
  }
): Promise<User | null> {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    throw new Error('Not authenticated')
  }

  // Upload avatar if provided
  let avatarUrl: string | undefined

  if (data.avatar) {
    const storagePath = await uploadAvatar(supabase, data.avatar, authUser.id)

    if (storagePath) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(storagePath)
      avatarUrl = urlData.publicUrl
    }
  }

  // Prepare update data
  const updateData: UserUpdate = {
    full_name: data.full_name,
    updated_at: new Date().toISOString(),
  }

  // Only set profile_completed_at if not already set
  const currentUser = await getCurrentUser(supabase)
  if (currentUser && !currentUser.profile_completed_at) {
    updateData.profile_completed_at = new Date().toISOString()
  }

  if (avatarUrl) {
    updateData.avatar_url = avatarUrl
  }

  if (data.notification_preferences) {
    updateData.notification_preferences = data.notification_preferences as never
  }

  // Update user profile
  const { data: updatedUser, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', authUser.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    throw new Error('Failed to update profile')
  }

  return updatedUser
}

/**
 * Update user profile (for existing profiles)
 *
 * @param supabase - Supabase client
 * @param data - Profile data to update (all fields optional)
 * @returns Updated user or null on error
 */
export async function updateProfile(
  supabase: SupabaseClient<Database>,
  data: {
    full_name?: string
    avatar?: File
    notification_preferences?: Record<string, boolean>
  }
): Promise<User | null> {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    throw new Error('Not authenticated')
  }

  // Upload avatar if provided
  let avatarUrl: string | undefined

  if (data.avatar) {
    const storagePath = await uploadAvatar(supabase, data.avatar, authUser.id)

    if (storagePath) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(storagePath)
      avatarUrl = urlData.publicUrl
    }
  }

  // Prepare update data
  const updateData: UserUpdate = {
    updated_at: new Date().toISOString(),
  }

  if (data.full_name) {
    updateData.full_name = data.full_name
  }

  if (avatarUrl) {
    updateData.avatar_url = avatarUrl
  }

  if (data.notification_preferences) {
    updateData.notification_preferences = data.notification_preferences as never
  }

  // Update user profile
  const { data: updatedUser, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', authUser.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    throw new Error('Failed to update profile')
  }

  return updatedUser
}
