/**
 * Browser-specific avatar utilities for image compression and upload
 *
 * These utilities use browser-only APIs (FileReader, Image, document)
 * and should only be imported by web-specific code.
 *
 * For platform-agnostic avatar utilities (generateAvatarPath, getAvatarUrl),
 * import from @tripthreads/core
 */

/**
 * Compress an image file to target size
 *
 * Uses browser APIs: FileReader, Image, document.createElement
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
 * Validate avatar file before upload
 *
 * Uses browser API: File type checking
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
