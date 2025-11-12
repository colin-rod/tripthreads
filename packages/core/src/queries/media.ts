/**
 * Media File CRUD operations
 *
 * Supabase queries for managing trip photos and videos.
 * All operations respect Row-Level Security (RLS) policies.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

type MediaFileInsert = Database['public']['Tables']['media_files']['Insert']
type MediaFileUpdate = Database['public']['Tables']['media_files']['Update']

// Export MediaFile type for external use
export type MediaFile = Database['public']['Tables']['media_files']['Row']

/**
 * Get all media files for a trip
 *
 * Returns media files sorted by date_taken (descending - newest first).
 * Includes uploader information.
 *
 * @param supabase - Authenticated Supabase client
 * @param tripId - UUID of the trip
 * @returns Array of media files with uploader info
 * @throws Error if query fails
 */
export async function getMediaFiles(supabase: SupabaseClient<Database>, tripId: string) {
  const { data, error } = await supabase
    .from('media_files')
    .select(
      `
      *,
      user:profiles!user_id (
        id,
        full_name,
        avatar_url
      )
    `
    )
    .eq('trip_id', tripId)
    .order('date_taken', { ascending: false })

  if (error) {
    console.error('Error fetching media files:', error)
    throw new Error(`Failed to fetch media files: ${error.message}`)
  }

  return data
}

/**
 * Get media files grouped by date
 *
 * Returns media files grouped by the date they were taken.
 * Useful for timeline/gallery views with date headers.
 *
 * @param supabase - Authenticated Supabase client
 * @param tripId - UUID of the trip
 * @returns Media files grouped by date
 * @throws Error if query fails
 */
export async function getMediaFilesGroupedByDate(
  supabase: SupabaseClient<Database>,
  tripId: string
) {
  const files = await getMediaFiles(supabase, tripId)

  // Group by date (YYYY-MM-DD)
  const grouped = files.reduce(
    (acc, file) => {
      const dateKey = file.date_taken.split('T')[0] // Extract date part
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(file)
      return acc
    },
    {} as Record<string, typeof files>
  )

  return grouped
}

/**
 * Get count of media files for a trip
 *
 * Used to check free tier limits (25 photos max).
 *
 * @param supabase - Authenticated Supabase client
 * @param tripId - UUID of the trip
 * @returns Count of media files
 * @throws Error if query fails
 */
export async function getMediaFileCount(
  supabase: SupabaseClient<Database>,
  tripId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('media_files')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', tripId)

  if (error) {
    console.error('Error counting media files:', error)
    throw new Error(`Failed to count media files: ${error.message}`)
  }

  return count ?? 0
}

/**
 * Get a single media file by ID
 *
 * @param supabase - Authenticated Supabase client
 * @param fileId - UUID of the media file
 * @returns Media file with uploader info
 * @throws Error if file not found or user lacks access
 */
export async function getMediaFileById(supabase: SupabaseClient<Database>, fileId: string) {
  const { data, error } = await supabase
    .from('media_files')
    .select(
      `
      *,
      user:profiles!user_id (
        id,
        full_name,
        avatar_url
      )
    `
    )
    .eq('id', fileId)
    .single()

  if (error) {
    console.error('Error fetching media file:', error)
    if (error.code === 'PGRST116') {
      throw new Error('Media file not found or you do not have access')
    }
    throw new Error(`Failed to fetch media file: ${error.message}`)
  }

  return data
}

/**
 * Create a new media file
 *
 * @param supabase - Authenticated Supabase client
 * @param mediaFile - Media file data (without id, created_at)
 * @returns Created media file
 * @throws Error if creation fails
 */
export async function createMediaFile(
  supabase: SupabaseClient<Database>,
  mediaFile: Omit<MediaFileInsert, 'id' | 'created_at'>
) {
  const { data, error } = await supabase.from('media_files').insert(mediaFile).select().single()

  if (error) {
    console.error('Error creating media file:', error)
    throw new Error(`Failed to create media file: ${error.message}`)
  }

  return data
}

/**
 * Update a media file (caption, date, etc.)
 *
 * Users can only update their own media files.
 * Owners can update any media file in their trips.
 *
 * @param supabase - Authenticated Supabase client
 * @param fileId - UUID of the media file
 * @param updates - Fields to update
 * @returns Updated media file
 * @throws Error if update fails or user lacks permission
 */
export async function updateMediaFile(
  supabase: SupabaseClient<Database>,
  fileId: string,
  updates: MediaFileUpdate
) {
  const { data, error } = await supabase
    .from('media_files')
    .update(updates)
    .eq('id', fileId)
    .select()
    .single()

  if (error) {
    console.error('Error updating media file:', error)
    if (error.code === 'PGRST116') {
      throw new Error('Media file not found or you do not have permission to update it')
    }
    throw new Error(`Failed to update media file: ${error.message}`)
  }

  return data
}

/**
 * Delete a media file
 *
 * Users can only delete their own media files.
 * Trip owners can delete any media file in their trips.
 *
 * Note: This does NOT delete the file from Supabase Storage.
 * Storage cleanup should be handled separately (e.g., via Edge Function or cron).
 *
 * @param supabase - Authenticated Supabase client
 * @param fileId - UUID of the media file
 * @throws Error if deletion fails or user lacks permission
 */
export async function deleteMediaFile(supabase: SupabaseClient<Database>, fileId: string) {
  // First, get the file to retrieve storage URLs
  const file = await getMediaFileById(supabase, fileId)

  // Delete from database
  const { error } = await supabase.from('media_files').delete().eq('id', fileId)

  if (error) {
    console.error('Error deleting media file:', error)
    if (error.code === 'PGRST116') {
      throw new Error('Media file not found or you do not have permission to delete it')
    }
    throw new Error(`Failed to delete media file: ${error.message}`)
  }

  // Return the deleted file info (for storage cleanup)
  return file
}

/**
 * Delete media file from storage bucket
 *
 * Removes the actual file from Supabase Storage.
 * Should be called after deleteMediaFile().
 *
 * @param supabase - Authenticated Supabase client
 * @param storagePath - Path in storage bucket (e.g., "tripId/userId/file.jpg")
 * @throws Error if deletion fails
 */
export async function deleteMediaFileFromStorage(
  supabase: SupabaseClient<Database>,
  storagePath: string
) {
  const { error } = await supabase.storage.from('trip-media').remove([storagePath])

  if (error) {
    console.error('Error deleting file from storage:', error)
    throw new Error(`Failed to delete file from storage: ${error.message}`)
  }
}

/**
 * Check if user can upload more photos (free tier limit check)
 *
 * Free tier: 25 photos max
 * Pro tier: Unlimited
 *
 * @param supabase - Authenticated Supabase client
 * @param tripId - UUID of the trip
 * @param userId - UUID of the user
 * @returns Object with canUpload (boolean) and remaining count
 * @throws Error if query fails
 */
export async function canUploadPhoto(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
): Promise<{ canUpload: boolean; remaining: number; total: number; limit: number }> {
  // Get user's plan
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single()

  if (userError) {
    console.error('Error fetching user plan:', userError)
    throw new Error(`Failed to check user plan: ${userError.message}`)
  }

  // Pro users have unlimited uploads
  if (user.plan === 'pro') {
    const count = await getMediaFileCount(supabase, tripId)
    return {
      canUpload: true,
      remaining: Infinity,
      total: count,
      limit: Infinity,
    }
  }

  // Free tier: 25 photo limit
  const FREE_TIER_LIMIT = 25
  const count = await getMediaFileCount(supabase, tripId)

  return {
    canUpload: count < FREE_TIER_LIMIT,
    remaining: Math.max(0, FREE_TIER_LIMIT - count),
    total: count,
    limit: FREE_TIER_LIMIT,
  }
}

/**
 * Move chat attachment to gallery
 *
 * Promotes a chat attachment to the trip media gallery by creating a media_files record.
 *
 * @param supabase - Authenticated Supabase client
 * @param attachmentUrl - URL of the chat attachment
 * @param tripId - UUID of the trip
 * @param userId - UUID of the user
 * @param caption - Optional caption
 * @returns Success with media file ID or error
 */
export async function moveAttachmentToGallery(
  supabase: SupabaseClient<Database>,
  attachmentUrl: string,
  tripId: string,
  userId: string,
  caption?: string
): Promise<{ success: boolean; mediaFileId?: string; error?: string }> {
  try {
    const mediaFile = await createMediaFile(supabase, {
      trip_id: tripId,
      user_id: userId,
      type: 'photo', // Assuming photos for now
      url: attachmentUrl,
      thumbnail_url: null, // TODO: Generate thumbnail if needed
      caption: caption ?? null,
      date_taken: new Date().toISOString(), // Use current date as fallback
    })

    return { success: true, mediaFileId: mediaFile.id }
  } catch (error) {
    console.error('Error moving attachment to gallery:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Remove media file from gallery (but keep in chat)
 *
 * Deletes the media_files record but does NOT delete the storage file.
 * This allows the file to remain in chat while being removed from gallery.
 *
 * @param supabase - Authenticated Supabase client
 * @param fileId - UUID of the media file
 * @returns Success or error
 */
export async function removeFromGallery(
  supabase: SupabaseClient<Database>,
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete from media_files table only (not storage)
    const { error } = await supabase.from('media_files').delete().eq('id', fileId)

    if (error) {
      console.error('Error removing from gallery:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error removing from gallery:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if an attachment URL exists in the gallery
 *
 * @param supabase - Authenticated Supabase client
 * @param attachmentUrl - URL of the attachment to check
 * @param tripId - UUID of the trip
 * @returns Media file ID if in gallery, null otherwise
 */
export async function getMediaFileByUrl(
  supabase: SupabaseClient<Database>,
  attachmentUrl: string,
  tripId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('media_files')
      .select('id')
      .eq('trip_id', tripId)
      .eq('url', attachmentUrl)
      .maybeSingle()

    if (error) {
      console.error('Error checking if attachment is in gallery:', error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error('Error checking if attachment is in gallery:', error)
    return null
  }
}
