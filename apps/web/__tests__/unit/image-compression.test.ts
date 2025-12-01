/**
 * Unit tests for image compression utility
 * Following TDD methodology - these tests are written BEFORE implementation
 *
 * Note: These are primarily integration-style tests as image compression requires browser APIs
 */

import {
  compressImage,
  generateThumbnail,
  extractDateTaken,
  isValidImageType,
  isWithinSizeLimit,
  formatFileSize,
} from '@/lib/image-compression'

describe('Image Compression Utility', () => {
  // Helper to create a mock File object
  function createMockFile(name: string, sizeBytes: number, type: string = 'image/jpeg'): File {
    const buffer = new ArrayBuffer(sizeBytes)
    const blob = new Blob([buffer], { type })
    return new File([blob], name, { type })
  }

  describe('File Validation', () => {
    describe('isValidImageType', () => {
      it('accepts JPEG images', () => {
        const file = createMockFile('photo.jpg', 1024, 'image/jpeg')
        expect(isValidImageType(file)).toBe(true)
      })

      it('accepts PNG images', () => {
        const file = createMockFile('photo.png', 1024, 'image/png')
        expect(isValidImageType(file)).toBe(true)
      })

      it('accepts WebP images', () => {
        const file = createMockFile('photo.webp', 1024, 'image/webp')
        expect(isValidImageType(file)).toBe(true)
      })

      it('accepts HEIC images', () => {
        const file = createMockFile('photo.heic', 1024, 'image/heic')
        expect(isValidImageType(file)).toBe(true)
      })

      it('accepts HEIF images', () => {
        const file = createMockFile('photo.heif', 1024, 'image/heif')
        expect(isValidImageType(file)).toBe(true)
      })

      it('rejects PDF files', () => {
        const file = createMockFile('document.pdf', 1024, 'application/pdf')
        expect(isValidImageType(file)).toBe(false)
      })

      it('rejects text files', () => {
        const file = createMockFile('notes.txt', 1024, 'text/plain')
        expect(isValidImageType(file)).toBe(false)
      })

      it('rejects video files', () => {
        const file = createMockFile('video.mp4', 1024, 'video/mp4')
        expect(isValidImageType(file)).toBe(false)
      })
    })

    describe('isWithinSizeLimit', () => {
      it('accepts files under 10MB', () => {
        const file = createMockFile('photo.jpg', 5 * 1024 * 1024) // 5MB
        expect(isWithinSizeLimit(file)).toBe(true)
      })

      it('accepts files exactly at 10MB', () => {
        const file = createMockFile('photo.jpg', 10 * 1024 * 1024) // 10MB
        expect(isWithinSizeLimit(file)).toBe(true)
      })

      it('rejects files over 10MB', () => {
        const file = createMockFile('photo.jpg', 11 * 1024 * 1024) // 11MB
        expect(isWithinSizeLimit(file)).toBe(false)
      })

      it('accepts very small files', () => {
        const file = createMockFile('tiny.jpg', 1024) // 1KB
        expect(isWithinSizeLimit(file)).toBe(true)
      })
    })

    describe('formatFileSize', () => {
      it('formats bytes correctly', () => {
        expect(formatFileSize(500)).toBe('500 B')
      })

      it('formats kilobytes correctly', () => {
        expect(formatFileSize(1536)).toBe('1.5 KB') // 1.5KB
      })

      it('formats megabytes correctly', () => {
        expect(formatFileSize(2 * 1024 * 1024)).toBe('2.00 MB') // 2MB
      })

      it('formats large megabytes correctly', () => {
        expect(formatFileSize(9.7 * 1024 * 1024)).toBe('9.70 MB')
      })
    })
  })

  describe('compressImage', () => {
    it('throws error for non-image files', async () => {
      const pdfFile = createMockFile('document.pdf', 1024, 'application/pdf')

      await expect(compressImage(pdfFile)).rejects.toThrow('Invalid file type')
    })

    it('throws error for files exceeding 10MB', async () => {
      const largeFile = createMockFile('huge.jpg', 11 * 1024 * 1024, 'image/jpeg')

      await expect(compressImage(largeFile)).rejects.toThrow('File size exceeds 10MB limit')
    })

    it('accepts valid JPEG files', async () => {
      const jpegFile = createMockFile('photo.jpg', 100 * 1024, 'image/jpeg')

      // Should return a File (not throw)
      // Note: In test environment without real image data, this will return the original small file
      const result = await compressImage(jpegFile)
      expect(result).toBeInstanceOf(File)
    })

    it('accepts valid PNG files', async () => {
      const pngFile = createMockFile('photo.png', 500 * 1024, 'image/png')

      const result = await compressImage(pngFile)
      expect(result).toBeInstanceOf(File)
    })
  })

  describe('generateThumbnail', () => {
    it('generates thumbnail for valid images', async () => {
      const imageFile = createMockFile('photo.jpg', 500 * 1024, 'image/jpeg')

      const thumbnail = await generateThumbnail(imageFile)
      expect(thumbnail).toBeInstanceOf(File)
      expect(thumbnail.type).toBe('image/jpeg')
    })

    it('adds thumb- prefix to filename', async () => {
      const imageFile = createMockFile('beach-sunset.jpg', 500 * 1024, 'image/jpeg')

      const thumbnail = await generateThumbnail(imageFile)
      expect(thumbnail.name).toMatch(/^thumb-/)
      expect(thumbnail.name).toContain('beach-sunset')
    })
  })

  describe('extractDateTaken', () => {
    it('returns a Date object', async () => {
      const imageFile = createMockFile('photo.jpg', 100 * 1024, 'image/jpeg')

      const date = await extractDateTaken(imageFile)
      expect(date).toBeInstanceOf(Date)
    })

    it('returns current date when no EXIF data present', async () => {
      const imageFile = createMockFile('no-exif.jpg', 100 * 1024, 'image/jpeg')

      const beforeTest = new Date()
      const date = await extractDateTaken(imageFile)
      const afterTest = new Date()

      // Date should be close to current time (within 1 second)
      expect(date.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime() - 1000)
      expect(date.getTime()).toBeLessThanOrEqual(afterTest.getTime() + 1000)
    })

    it('handles various image formats', async () => {
      const formats = ['image/jpeg', 'image/png', 'image/webp']

      for (const format of formats) {
        const file = createMockFile('photo', 100 * 1024, format)
        const date = await extractDateTaken(file)
        expect(date).toBeInstanceOf(Date)
      }
    })
  })
})

describe('Image Compression Integration', () => {
  it('validates file before compression', async () => {
    const invalidFile = new File(['not an image'], 'test.txt', { type: 'text/plain' })

    await expect(compressImage(invalidFile)).rejects.toThrow()
  })

  it('handles empty files gracefully', async () => {
    const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' })

    // Should either compress or return file (not crash)
    const result = await compressImage(emptyFile)
    expect(result).toBeInstanceOf(File)
  })
})
