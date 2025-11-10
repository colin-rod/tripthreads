/**
 * Integration tests for chat-gallery integration
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatAttachmentDisplay } from '@/components/features/chat/ChatAttachment'
import { addAttachmentToGallery, removeAttachmentFromGallery } from '@/app/actions/chat'
import { getMediaFileByUrl } from '@repo/core/queries/media'
import { createClient } from '@/lib/supabase/client'

// Mock dependencies
jest.mock('@/lib/supabase/client')
jest.mock('@/app/actions/chat')
jest.mock('@repo/core/queries/media')

const mockSupabase = {
  from: jest.fn(),
}

;(createClient as jest.Mock).mockReturnValue(mockSupabase)

describe('Chat-Gallery Integration', () => {
  const mockTripId = 'trip-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ChatAttachmentDisplay', () => {
    const mockImageAttachment = {
      url: 'https://example.com/chat-photo.jpg',
      type: 'image' as const,
      name: 'photo.jpg',
      size: 1024000,
    }

    it('should show "Add to gallery" button for images not in gallery', async () => {
      ;(getMediaFileByUrl as jest.Mock).mockResolvedValue(null)

      render(<ChatAttachmentDisplay attachment={mockImageAttachment} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Add to gallery')).toBeInTheDocument()
      })
    })

    it('should show "Remove from gallery" button for images in gallery', async () => {
      ;(getMediaFileByUrl as jest.Mock).mockResolvedValue('media-123')

      render(<ChatAttachmentDisplay attachment={mockImageAttachment} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Remove from gallery')).toBeInTheDocument()
      })
    })

    it('should show colored border for images in gallery', async () => {
      ;(getMediaFileByUrl as jest.Mock).mockResolvedValue('media-123')

      const { container } = render(
        <ChatAttachmentDisplay attachment={mockImageAttachment} tripId={mockTripId} />
      )

      await waitFor(() => {
        const img = container.querySelector('img')
        expect(img).toHaveClass('ring-2')
        expect(img).toHaveClass('ring-primary')
      })
    })

    it('should not show gallery button for document attachments', async () => {
      const mockDocAttachment = {
        url: 'https://example.com/document.pdf',
        type: 'document' as const,
        name: 'document.pdf',
        size: 2048000,
      }

      render(<ChatAttachmentDisplay attachment={mockDocAttachment} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.queryByText('Add to gallery')).not.toBeInTheDocument()
        expect(screen.queryByText('Remove from gallery')).not.toBeInTheDocument()
      })
    })

    it('should add image to gallery when button clicked', async () => {
      const user = userEvent.setup()
      ;(getMediaFileByUrl as jest.Mock).mockResolvedValue(null)
      ;(addAttachmentToGallery as jest.Mock).mockResolvedValue({
        success: true,
        mediaFileId: 'media-456',
      })

      render(<ChatAttachmentDisplay attachment={mockImageAttachment} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Add to gallery')).toBeInTheDocument()
      })

      const addButton = screen.getByText('Add to gallery')
      await user.click(addButton)

      await waitFor(() => {
        expect(addAttachmentToGallery).toHaveBeenCalledWith(
          'https://example.com/chat-photo.jpg',
          mockTripId,
          undefined // caption
        )
      })

      // Button should change to "Remove from gallery"
      await waitFor(() => {
        expect(screen.getByText('Remove from gallery')).toBeInTheDocument()
      })
    })

    it('should remove image from gallery when button clicked', async () => {
      const user = userEvent.setup()
      ;(getMediaFileByUrl as jest.Mock).mockResolvedValue('media-123')
      ;(removeAttachmentFromGallery as jest.Mock).mockResolvedValue({
        success: true,
      })

      render(<ChatAttachmentDisplay attachment={mockImageAttachment} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Remove from gallery')).toBeInTheDocument()
      })

      const removeButton = screen.getByText('Remove from gallery')
      await user.click(removeButton)

      await waitFor(() => {
        expect(removeAttachmentFromGallery).toHaveBeenCalledWith('media-123', mockTripId)
      })

      // Button should change back to "Add to gallery"
      await waitFor(() => {
        expect(screen.getByText('Add to gallery')).toBeInTheDocument()
      })
    })

    it('should disable button while loading', async () => {
      const user = userEvent.setup()
      ;(getMediaFileByUrl as jest.Mock).mockResolvedValue(null)
      ;(addAttachmentToGallery as jest.Mock).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ success: true, mediaFileId: 'media-456' }), 100)
          )
      )

      render(<ChatAttachmentDisplay attachment={mockImageAttachment} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Add to gallery')).toBeInTheDocument()
      })

      const addButton = screen.getByText('Add to gallery').closest('button')!
      await user.click(addButton)

      // Button should be disabled during loading
      expect(addButton).toBeDisabled()

      await waitFor(() => {
        expect(addButton).not.toBeDisabled()
      })
    })

    it('should handle add to gallery errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      ;(getMediaFileByUrl as jest.Mock).mockResolvedValue(null)
      ;(addAttachmentToGallery as jest.Mock).mockRejectedValue(
        new Error('Failed to add to gallery')
      )

      render(<ChatAttachmentDisplay attachment={mockImageAttachment} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Add to gallery')).toBeInTheDocument()
      })

      const addButton = screen.getByText('Add to gallery')
      await user.click(addButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error adding to gallery:', expect.any(Error))
      })

      // Button should remain "Add to gallery" on error
      expect(screen.getByText('Add to gallery')).toBeInTheDocument()

      consoleErrorSpy.mockRestore()
    })

    it('should handle remove from gallery errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      ;(getMediaFileByUrl as jest.Mock).mockResolvedValue('media-123')
      ;(removeAttachmentFromGallery as jest.Mock).mockRejectedValue(
        new Error('Failed to remove from gallery')
      )

      render(<ChatAttachmentDisplay attachment={mockImageAttachment} tripId={mockTripId} />)

      await waitFor(() => {
        expect(screen.getByText('Remove from gallery')).toBeInTheDocument()
      })

      const removeButton = screen.getByText('Remove from gallery')
      await user.click(removeButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error removing from gallery:',
          expect.any(Error)
        )
      })

      // Button should remain "Remove from gallery" on error
      expect(screen.getByText('Remove from gallery')).toBeInTheDocument()

      consoleErrorSpy.mockRestore()
    })

    it('should check gallery status on mount for each image', async () => {
      ;(getMediaFileByUrl as jest.Mock).mockResolvedValue(null)

      render(<ChatAttachmentDisplay attachment={mockImageAttachment} tripId={mockTripId} />)

      await waitFor(() => {
        expect(getMediaFileByUrl).toHaveBeenCalledWith(
          mockSupabase,
          'https://example.com/chat-photo.jpg',
          mockTripId
        )
      })
    })

    it('should update gallery status when URL or tripId changes', async () => {
      ;(getMediaFileByUrl as jest.Mock).mockResolvedValue(null)

      const { rerender } = render(
        <ChatAttachmentDisplay attachment={mockImageAttachment} tripId="trip-1" />
      )

      await waitFor(() => {
        expect(getMediaFileByUrl).toHaveBeenCalledWith(
          mockSupabase,
          'https://example.com/chat-photo.jpg',
          'trip-1'
        )
      })

      // Change tripId
      jest.clearAllMocks()

      rerender(<ChatAttachmentDisplay attachment={mockImageAttachment} tripId="trip-2" />)

      await waitFor(() => {
        expect(getMediaFileByUrl).toHaveBeenCalledWith(
          mockSupabase,
          'https://example.com/chat-photo.jpg',
          'trip-2'
        )
      })
    })
  })

  describe('Visual Distinction', () => {
    it('should apply ring classes to images in gallery', async () => {
      const mockImageAttachment = {
        url: 'https://example.com/photo.jpg',
        type: 'image' as const,
        name: 'photo.jpg',
        size: 1024000,
      }

      ;(getMediaFileByUrl as jest.Mock).mockResolvedValue('media-123')

      const { container } = render(
        <ChatAttachmentDisplay attachment={mockImageAttachment} tripId={mockTripId} />
      )

      await waitFor(() => {
        const img = container.querySelector('img')
        expect(img?.className).toContain('ring-2')
        expect(img?.className).toContain('ring-primary')
        expect(img?.className).toContain('ring-offset-2')
      })
    })

    it('should not apply ring classes to images not in gallery', async () => {
      const mockImageAttachment = {
        url: 'https://example.com/photo.jpg',
        type: 'image' as const,
        name: 'photo.jpg',
        size: 1024000,
      }

      ;(getMediaFileByUrl as jest.Mock).mockResolvedValue(null)

      const { container } = render(
        <ChatAttachmentDisplay attachment={mockImageAttachment} tripId={mockTripId} />
      )

      await waitFor(() => {
        const img = container.querySelector('img')
        expect(img?.className).not.toContain('ring-2')
        expect(img?.className).not.toContain('ring-primary')
      })
    })
  })
})
