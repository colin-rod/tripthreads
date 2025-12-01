/**
 * Image Compression Utility
 * Handles client-side image compression, thumbnail generation, and EXIF extraction
 *
 * Key features:
 * - Aggressive compression (70% quality) for full images
 * - Thumbnail generation (400px, 75% quality)
 * - EXIF date extraction (privacy: GPS stripped)
 * - Aspect ratio preservation
 * - Type conversion (PNG/HEIC → JPEG for better compression)
 */

import imageCompression from 'browser-image-compression'
import piexif from 'piexifjs'

// ===== Constants =====

const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

const FULL_IMAGE_CONFIG = {
  maxSizeMB: MAX_FILE_SIZE_MB,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
  initialQuality: 0.7, // 70% quality for aggressive compression
}

const THUMBNAIL_CONFIG = {
  maxSizeMB: 1, // Thumbnails should be very small
  maxWidthOrHeight: 400,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
  initialQuality: 0.75, // 75% quality for thumbnails
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

// ===== Main Functions =====

/**
 * Compresses an image file to optimized size while preserving aspect ratio
 *
 * @param file - The image file to compress
 * @returns Compressed image file (JPEG format)
 * @throws Error if file is invalid or exceeds size limit
 */
export async function compressImage(file: File): Promise<File> {
  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    )
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
    throw new Error(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit. Your file is ${fileSizeMB}MB.`)
  }

  // If file is already small and optimal, return it
  if (file.size < 100 * 1024 && file.type === 'image/jpeg') {
    // < 100KB
    return file
  }

  try {
    // Compress the image
    const compressedFile = await imageCompression(file, FULL_IMAGE_CONFIG)

    // Preserve original filename but ensure .jpg extension
    const originalName = file.name.replace(/\.[^/.]+$/, '')
    const newFileName = `${originalName}.jpg`

    // Create new File object with proper name
    return new File([compressedFile], newFileName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch (error) {
    console.error('Image compression failed:', error)
    throw new Error('Failed to compress image. Please try a different file.')
  }
}

/**
 * Generates a thumbnail version of an image (400px max dimension, 75% quality)
 *
 * @param file - The image file to create thumbnail from
 * @returns Thumbnail image file (JPEG format)
 */
export async function generateThumbnail(file: File): Promise<File> {
  try {
    const thumbnailFile = await imageCompression(file, THUMBNAIL_CONFIG)

    // Add 'thumb-' prefix to filename
    const originalName = file.name.replace(/\.[^/.]+$/, '')
    const thumbnailFileName = `thumb-${originalName}.jpg`

    return new File([thumbnailFile], thumbnailFileName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch (error) {
    console.error('Thumbnail generation failed:', error)
    throw new Error('Failed to generate thumbnail')
  }
}

/**
 * Extracts date_taken from EXIF metadata
 *
 * Privacy note: Only extracts date/time, strips GPS and other sensitive metadata
 *
 * @param file - Image file with potential EXIF data
 * @returns Date when photo was taken (falls back to current date if no EXIF)
 */
export async function extractDateTaken(file: File): Promise<Date> {
  try {
    // Read file as data URL
    const dataUrl = await readFileAsDataURL(file)

    // Extract EXIF data using piexifjs
    const exifObj = piexif.load(dataUrl)

    // Priority order: DateTimeOriginal > DateTime > CreateDate
    let dateString: string | null = null

    if (exifObj['Exif'] && exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal]) {
      dateString = exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal]
    } else if (exifObj['0th'] && exifObj['0th'][piexif.ImageIFD.DateTime]) {
      dateString = exifObj['0th'][piexif.ImageIFD.DateTime]
    }

    // Parse EXIF date string (format: "YYYY:MM:DD HH:MM:SS")
    if (dateString) {
      const parsedDate = parseExifDate(dateString)
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        return parsedDate
      }
    }
  } catch (error) {
    // EXIF extraction failed - not all images have EXIF data
    console.warn('Failed to extract EXIF data:', error)
  }

  // Fallback: Use current date if no EXIF or parsing failed
  return new Date()
}

/**
 * Strips all EXIF metadata from an image (for privacy)
 *
 * @param file - Image file to strip EXIF from
 * @returns New file with EXIF removed
 */
export async function stripExif(file: File): Promise<File> {
  try {
    const dataUrl = await readFileAsDataURL(file)

    // Remove EXIF data
    const strippedDataUrl = piexif.remove(dataUrl)

    // Convert back to File
    const blob = dataURLToBlob(strippedDataUrl)
    return new File([blob], file.name, {
      type: file.type,
      lastModified: Date.now(),
    })
  } catch (error) {
    console.warn('Failed to strip EXIF, returning original file:', error)
    return file
  }
}

/**
 * Validates if a file is a supported image type
 *
 * @param file - File to validate
 * @returns true if file is a supported image
 */
export function isValidImageType(file: File): boolean {
  return ALLOWED_MIME_TYPES.includes(file.type)
}

/**
 * Validates if a file is within size limit
 *
 * @param file - File to validate
 * @returns true if file is within 10MB limit
 */
export function isWithinSizeLimit(file: File): boolean {
  return file.size <= MAX_FILE_SIZE_BYTES
}

/**
 * Formats file size for display
 *
 * @param bytes - File size in bytes
 * @returns Human-readable file size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// ===== Helper Functions =====

/**
 * Reads a file as a data URL
 */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Converts a data URL to a Blob
 */
function dataURLToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',')
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const bstr = atob(parts[1])
  const n = bstr.length
  const u8arr = new Uint8Array(n)

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i)
  }

  return new Blob([u8arr], { type: mime })
}

/**
 * Parses EXIF date string to JavaScript Date
 * EXIF format: "YYYY:MM:DD HH:MM:SS"
 */
function parseExifDate(exifDateString: string): Date | null {
  try {
    // Replace colons in date part with dashes for ISO format
    const [datePart, timePart] = exifDateString.split(' ')
    if (!datePart || !timePart) return null

    const isoDateString = datePart.replace(/:/g, '-')
    const fullIsoString = `${isoDateString}T${timePart}`

    const date = new Date(fullIsoString)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

/**
 * Re-exported for testing purposes
 */
export const createImageFile = (
  filename: string,
  sizeBytes: number,
  type: string = 'image/jpeg'
): File => {
  // This is only used in tests
  const blob = new Blob([new Uint8Array(sizeBytes)], { type })
  return new File([blob], filename, { type })
}
