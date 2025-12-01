/**
 * Platform-agnostic avatar utilities
 *
 * These utilities work across all platforms (web, mobile, server)
 * and have no browser-specific dependencies.
 *
 * For browser-specific utilities (compressAvatar, validateAvatarFile),
 * see:
 * - Web: apps/web/lib/utils/avatar.ts
 * - Mobile: apps/mobile/lib/utils/avatar.ts (when implemented)
 */

/**
 * Generate a unique filename for avatar upload
 *
 * @param userId - User ID
 * @param extension - File extension (default: 'jpg')
 * @returns Storage path: avatars/{userId}/{timestamp}.{extension}
 */
export function generateAvatarPath(userId: string, extension = 'jpg'): string {
  const timestamp = Date.now()
  return `${userId}/${timestamp}.${extension}`
}

/**
 * Get the public URL for an avatar in Supabase Storage
 *
 * @param supabaseUrl - Supabase project URL
 * @param path - Storage path (e.g., "userId/timestamp.jpg")
 * @returns Full public URL to the avatar
 */
export function getAvatarUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/avatars/${path}`
}
