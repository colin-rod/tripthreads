/**
 * Avatar utilities for image compression and upload
 *
 * Handles:
 * - Image compression (<500KB target)
 * - Image resizing (512x512px max)
 * - Format conversion to JPEG
 * - Supabase Storage upload
 */

/**
 * Compress an image file to target size
 *
 * @param file - Original image file
 * @param maxSizeKB - Target size in KB (default: 500KB)
 * @param maxWidth - Maximum width in pixels (default: 512)
 * @param maxHeight - Maximum height in pixels (default: 512)
 * @returns Compressed image as Blob
 */
export async function compressAvatar(
  file: File,
  maxSizeKB = 500,
  maxWidth = 512,
  maxHeight = 512
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = e => {
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions while preserving aspect ratio
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height

          if (width > height) {
            width = maxWidth
            height = maxWidth / aspectRatio
          } else {
            height = maxHeight
            width = maxHeight * aspectRatio
          }
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Start with high quality and reduce until target size is met
        let quality = 0.9
        const tryCompress = () => {
          canvas.toBlob(
            blob => {
              if (!blob) {
                reject(new Error('Failed to compress image'))
                return
              }

              const sizeKB = blob.size / 1024

              // If size is acceptable or quality is already very low, return
              if (sizeKB <= maxSizeKB || quality <= 0.1) {
                resolve(blob)
              } else {
                // Reduce quality and try again
                quality -= 0.1
                tryCompress()
              }
            },
            'image/jpeg',
            quality
          )
        }

        tryCompress()
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}

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

/**
 * Validate avatar file before upload
 *
 * @param file - File to validate
 * @returns Validation result with error message if invalid
 */
export function validateAvatarFile(file: File): {
  valid: boolean
  error?: string
} {
  const maxSize = 5 * 1024 * 1024 // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Avatar must be less than 5MB',
    }
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Avatar must be a JPG, PNG, or WebP image',
    }
  }

  return { valid: true }
}
