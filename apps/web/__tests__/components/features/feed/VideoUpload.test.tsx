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

// Mock fetch globally
global.fetch = jest.fn()

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
  const blob = new Blob(['a'.repeat(sizeInBytes)], { type })
  return new File([blob], name, { type })
}

describe('VideoUpload Component', () => {
  const mockTripId = 'trip-123'
  const mockOnUploadComplete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockReset()
  })

  describe('Pro User - Rendering and Functionality', () => {
    it('renders video upload UI for Pro users', async () => {
      // Mock GET /api/upload-video - Pro user with available storage
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.5,
          limitGB: 10,
          remainingGB: 7.5,
        }),
      })

      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText(/Video storage:/)).toBeInTheDocument()
        expect(screen.getByText(/2.50 GB \/ 10 GB used/)).toBeInTheDocument()
        expect(screen.getByText(/7.50 GB remaining/)).toBeInTheDocument()
      })

      expect(screen.getByText('Drop videos here or click to upload')).toBeInTheDocument()
      expect(screen.getByText('Select Videos')).toBeInTheDocument()
    })

    it('allows Pro users to select valid video files', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.5,
          limitGB: 10,
          remainingGB: 7.5,
        }),
      })

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
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.5,
          limitGB: 10,
          remainingGB: 7.5,
        }),
      })

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
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
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
      })

      // Mock GET /api/upload-video - refresh after upload
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.55,
          limitGB: 10,
          remainingGB: 7.45,
        }),
      })

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
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
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
      })

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
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          isProUser: false,
          currentStorageGB: 0,
          limitGB: 0,
          remainingGB: 0,
        }),
      })

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
    beforeEach(async () => {
      // Mock GET /api/upload-video - Pro user
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.5,
          limitGB: 10,
          remainingGB: 7.5,
        }),
      })
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
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 5.25,
          limitGB: 10,
          remainingGB: 4.75,
        }),
      })

      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText(/Video storage: 5.25 GB \/ 10 GB used/)).toBeInTheDocument()
        expect(screen.getByText(/4.75 GB remaining/)).toBeInTheDocument()
      })
    })

    it('shows warning when storage is low (<1GB remaining)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 9.2,
          limitGB: 10,
          remainingGB: 0.8,
        }),
      })

      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      await waitFor(() => {
        expect(screen.getByText(/Running low on video storage/)).toBeInTheDocument()
        expect(screen.getByText(/0.80 GB remaining/)).toBeInTheDocument()
      })
    })
  })

  describe('Storage Limit Enforcement', () => {
    it('disables upload when Pro user reaches 10GB storage limit', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          isProUser: true,
          currentStorageGB: 10,
          limitGB: 10,
          remainingGB: 0,
        }),
      })

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
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.5,
          limitGB: 10,
          remainingGB: 7.5,
        }),
      })

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
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
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
      })

      // Mock GET - refreshed storage info
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.55,
          limitGB: 10,
          remainingGB: 7.45,
        }),
      })

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
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.5,
          limitGB: 10,
          remainingGB: 7.5,
        }),
      })

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
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Upload failed',
          message: 'Storage quota exceeded',
        }),
      })

      const uploadButton = screen.getByText('Upload 1 Video')
      fireEvent.click(uploadButton)

      await waitFor(() => {
        expect(screen.getByText('Storage quota exceeded')).toBeInTheDocument()
      })

      expect(mockOnUploadComplete).not.toHaveBeenCalled()
    })

    it('handles network errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<VideoUpload tripId={mockTripId} onUploadComplete={mockOnUploadComplete} />)

      // Should still render UI even if permission fetch fails
      await waitFor(() => {
        expect(screen.getByText('Select Videos')).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    beforeEach(async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          isProUser: true,
          currentStorageGB: 2.5,
          limitGB: 10,
          remainingGB: 7.5,
        }),
      })
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
