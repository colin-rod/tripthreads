/**
 * VideoUpload Component Tests
 *
 * Tests for the VideoUpload component including:
 * - Pro user rendering and functionality
 * - Free user blocking and upgrade prompts
 * - File type validation
 * - File size validation
 * - Storage usage display
 * - Storage limit enforcement
 * - Error handling
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import VideoUpload from '@/components/features/feed/VideoUpload'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
}))

// Helper to create mock video files
const createMockVideoFile = (
  name: string,
  sizeInBytes: number,
  type: string = 'video/mp4'
): File => {
  // Create a minimal blob but override the size property for performance
  // This avoids creating large blobs (100MB+) which are slow in tests
  // The component only checks file.size and file.type, not actual content
  const blob = new Blob(['x'], { type })
  const file = new File([blob], name, { type })

  // Override the size property to match the intended size
  Object.defineProperty(file, 'size', {
    value: sizeInBytes,
    writable: false,
  })

  return file
}

describe('VideoUpload Component', () => {
  const mockTripId = 'trip-123'
  const mockOnUploadComplete = jest.fn()
  let fetchSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    // Create a fresh fetch spy for each test
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({}),
      } as Response)
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllTimers()
  })

  describe('Pro User - Rendering and Functionality', () => {
    it('renders video upload UI for Pro users', async () => {
      // Mock GET /api/upload-video - Pro user with available storage
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.5,
          limitGB: 10,
          remainingGB: 7.5,
        }),
      } as Response)

      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(
        () => {
          expect(screen.getByText(/Video storage:/)).toBeInTheDocument()
          expect(screen.getByText(/2.50 GB \/ 10 GB used/)).toBeInTheDocument()
          expect(screen.getByText(/7.50 GB remaining/)).toBeInTheDocument()
        },
        { timeout: 1000 }
      )

      expect(screen.getByText('Drop videos here or click to upload')).toBeInTheDocument()
      expect(screen.getByText('Select Videos')).toBeInTheDocument()
    })

    it('allows Pro users to select valid video files', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.5,
          limitGB: 10,
          remainingGB: 7.5,
        }),
      } as Response)

      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText('Select Videos')).toBeInTheDocument()
      })

      const fileInput = screen.getByLabelText('Select video files')
      const videoFile = createMockVideoFile('test-video.mp4', 50 * 1024 * 1024) // 50MB

      Object.defineProperty(fileInput, 'files', {
        value: [videoFile],
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('1 video(s) ready to upload')).toBeInTheDocument()
        expect(screen.getByText('test-video.mp4')).toBeInTheDocument()
        expect(screen.getByText('50.00 MB')).toBeInTheDocument()
      })
    })

    it('successfully uploads video for Pro users', async () => {
      // Mock GET /api/upload-video
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.5,
          limitGB: 10,
          remainingGB: 7.5,
        }),
      } as Response)

      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText('Select Videos')).toBeInTheDocument()
      })

      const fileInput = screen.getByLabelText('Select video files')
      const videoFile = createMockVideoFile('test-video.mp4', 50 * 1024 * 1024)

      Object.defineProperty(fileInput, 'files', {
        value: [videoFile],
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('Upload 1 Video')).toBeInTheDocument()
      })

      // Mock POST /api/upload-video - successful upload
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          media: { id: 'media-1' },
          storageInfo: {
            currentStorageGB: 2.55,
            limitGB: 10,
            remainingGB: 7.45,
          },
        }),
      } as Response)

      // Mock GET /api/upload-video - refresh after upload
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.55,
          limitGB: 10,
          remainingGB: 7.45,
        }),
      } as Response)

      const uploadButton = screen.getByText('Upload 1 Video')
      fireEvent.click(uploadButton)

      await waitFor(() => {
        expect(mockOnUploadComplete).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Free User - Blocking and Upgrade Prompts', () => {
    it('shows upgrade prompt for free users', async () => {
      // Mock GET /api/upload-video - Free user
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          isProUser: false,
          currentStorageGB: 0,
          limitGB: 0,
          remainingGB: 0,
          reason:
            'Video uploads are a Pro feature. Upgrade to Pro to upload videos (10GB storage).',
        }),
      } as Response)

      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Video uploads are a Pro feature. Upgrade to Pro to upload videos/)
        ).toBeInTheDocument()
        expect(screen.getByText('Upgrade Now')).toBeInTheDocument()
      })

      expect(screen.getByText('Video uploads require Pro')).toBeInTheDocument()
      expect(screen.getByText('Upgrade to Pro for 10GB video storage')).toBeInTheDocument()
      expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument()
    })

    it('blocks free users from selecting video files', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          isProUser: false,
          currentStorageGB: 0,
          limitGB: 0,
          remainingGB: 0,
        }),
      } as Response)

      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument()
      })

      const selectButton = screen.getByText('Upgrade to Pro')
      fireEvent.click(selectButton)

      // Should not allow file selection, should show upgrade dialog
      await waitFor(() => {
        expect(screen.getByText('Upgrade to Pro for Video Uploads')).toBeInTheDocument()
      })
    })
  })

  describe('File Validation', () => {
    beforeEach(() => {
      // Mock GET /api/upload-video - Pro user
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.5,
          limitGB: 10,
          remainingGB: 7.5,
        }),
      } as Response)
    })

    it('rejects video files larger than 100MB', async () => {
      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText('Select Videos')).toBeInTheDocument()
      })

      const fileInput = screen.getByLabelText('Select video files')
      const largeVideoFile = createMockVideoFile('huge-video.mp4', 150 * 1024 * 1024) // 150MB

      Object.defineProperty(fileInput, 'files', {
        value: [largeVideoFile],
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(
          screen.getByText(/File size exceeds 100MB limit: huge-video.mp4/)
        ).toBeInTheDocument()
      })
    })

    it('rejects invalid video MIME types', async () => {
      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText('Select Videos')).toBeInTheDocument()
      })

      const fileInput = screen.getByLabelText('Select video files')
      const invalidFile = createMockVideoFile('file.avi', 10 * 1024 * 1024, 'video/avi')

      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(
          screen.getByText(
            /Invalid file type: file.avi. Supported formats: MP4, WebM, MOV, QuickTime/
          )
        ).toBeInTheDocument()
      })
    })

    it('accepts valid video formats (MP4, WebM, MOV)', async () => {
      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText('Select Videos')).toBeInTheDocument()
      })

      const fileInput = screen.getByLabelText('Select video files')
      const mp4File = createMockVideoFile('video1.mp4', 50 * 1024 * 1024, 'video/mp4')
      const webmFile = createMockVideoFile('video2.webm', 50 * 1024 * 1024, 'video/webm')
      const movFile = createMockVideoFile('video3.mov', 50 * 1024 * 1024, 'video/quicktime')

      Object.defineProperty(fileInput, 'files', {
        value: [mp4File, webmFile, movFile],
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('3 video(s) ready to upload')).toBeInTheDocument()
        expect(screen.getByText('video1.mp4')).toBeInTheDocument()
        expect(screen.getByText('video2.webm')).toBeInTheDocument()
        expect(screen.getByText('video3.mov')).toBeInTheDocument()
      })
    })
  })

  describe('Storage Usage Display', () => {
    it('shows storage usage for Pro users', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 5.25,
          limitGB: 10,
          remainingGB: 4.75,
        }),
      } as Response)

      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText(/Video storage: 5.25 GB \/ 10 GB used/)).toBeInTheDocument()
        expect(screen.getByText(/4.75 GB remaining/)).toBeInTheDocument()
      })
    })

    it('shows warning when storage is low (<1GB remaining)', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 9.2,
          limitGB: 10,
          remainingGB: 0.8,
        }),
      } as Response)

      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText(/Running low on video storage/)).toBeInTheDocument()
        // Use getAllByText since the storage info appears in multiple places
        const remainingTexts = screen.getAllByText(/0.80 GB remaining/)
        expect(remainingTexts.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Storage Limit Enforcement', () => {
    it('disables upload when Pro user reaches 10GB storage limit', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          isProUser: true,
          currentStorageGB: 10,
          limitGB: 10,
          remainingGB: 0,
        }),
      } as Response)

      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText(/Video storage limit reached/)).toBeInTheDocument()
        expect(
          screen.getByText(/You've used all 10 GB of your Pro tier storage/)
        ).toBeInTheDocument()
      })

      const selectButton = screen.getByText('Select Videos')
      expect(selectButton).toBeDisabled()
    })

    it('updates storage usage after successful upload', async () => {
      // Initial GET - Pro user with space
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.5,
          limitGB: 10,
          remainingGB: 7.5,
        }),
      } as Response)

      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText(/2.50 GB \/ 10 GB used/)).toBeInTheDocument()
      })

      const fileInput = screen.getByLabelText('Select video files')
      const videoFile = createMockVideoFile('test-video.mp4', 50 * 1024 * 1024) // 50MB

      Object.defineProperty(fileInput, 'files', {
        value: [videoFile],
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('Upload 1 Video')).toBeInTheDocument()
      })

      // Mock POST - successful upload
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          media: { id: 'media-1' },
          storageInfo: {
            currentStorageGB: 2.55,
            limitGB: 10,
            remainingGB: 7.45,
          },
        }),
      } as Response)

      // Mock GET - refreshed storage info
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.55,
          limitGB: 10,
          remainingGB: 7.45,
        }),
      } as Response)

      const uploadButton = screen.getByText('Upload 1 Video')
      fireEvent.click(uploadButton)

      await waitFor(() => {
        expect(screen.getByText(/2.55 GB \/ 10 GB used/)).toBeInTheDocument()
        expect(screen.getByText(/7.45 GB remaining/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles upload errors gracefully', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.5,
          limitGB: 10,
          remainingGB: 7.5,
        }),
      } as Response)

      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText('Select Videos')).toBeInTheDocument()
      })

      const fileInput = screen.getByLabelText('Select video files')
      const videoFile = createMockVideoFile('test-video.mp4', 50 * 1024 * 1024)

      Object.defineProperty(fileInput, 'files', {
        value: [videoFile],
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('Upload 1 Video')).toBeInTheDocument()
      })

      // Mock POST - upload failure
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Upload failed',
          message: 'Storage quota exceeded',
        }),
      } as Response)

      const uploadButton = screen.getByText('Upload 1 Video')
      fireEvent.click(uploadButton)

      await waitFor(() => {
        expect(screen.getByText('Storage quota exceeded')).toBeInTheDocument()
      })

      expect(mockOnUploadComplete).not.toHaveBeenCalled()
    })

    it('handles network errors gracefully', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network error'))

      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      // Should render upgrade prompt when permission fetch fails (defaults to free user)
      await waitFor(() => {
        expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    beforeEach(() => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.5,
          limitGB: 10,
          remainingGB: 7.5,
        }),
      } as Response)
    })

    it('allows users to remove selected videos', async () => {
      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText('Select Videos')).toBeInTheDocument()
      })

      const fileInput = screen.getByLabelText('Select video files')
      const videoFile = createMockVideoFile('test-video.mp4', 50 * 1024 * 1024)

      Object.defineProperty(fileInput, 'files', {
        value: [videoFile],
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('test-video.mp4')).toBeInTheDocument()
      })

      const removeButton = screen.getByRole('button', { name: '' }) // X icon button
      fireEvent.click(removeButton)

      await waitFor(() => {
        expect(screen.queryByText('test-video.mp4')).not.toBeInTheDocument()
      })
    })

    it('allows users to add captions to videos', async () => {
      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText('Select Videos')).toBeInTheDocument()
      })

      const fileInput = screen.getByLabelText('Select video files')
      const videoFile = createMockVideoFile('test-video.mp4', 50 * 1024 * 1024)

      Object.defineProperty(fileInput, 'files', {
        value: [videoFile],
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add caption (optional)')).toBeInTheDocument()
      })

      const captionInput = screen.getByPlaceholderText('Add caption (optional)')
      fireEvent.change(captionInput, { target: { value: 'Amazing sunset video' } })

      expect(captionInput).toHaveValue('Amazing sunset video')
    })
  })
})
