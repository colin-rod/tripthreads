/**
 * Component tests for PhotoLightbox
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PhotoLightbox from '@/components/features/feed/PhotoLightbox'
import {
  updateMediaFile,
  deleteMediaFile,
  deleteMediaFileFromStorage,
} from '@repo/core/queries/media'
import { createClient } from '@/lib/supabase/client'

// Mock dependencies
jest.mock('@/lib/supabase/client')
jest.mock('@repo/core/queries/media')
jest.mock('date-fns', () => ({
  format: jest.fn((date: Date | string, formatStr: string) => {
    if (formatStr === 'PPP') {
      return 'January 15, 2025'
    }
    if (formatStr === 'yyyy-MM-dd') {
      return '2025-01-15'
    }
    return new Date(date).toISOString()
  }),
}))

const mockSupabase = {
  from: jest.fn(),
  storage: {
    from: jest.fn(),
  },
}

;(createClient as jest.Mock).mockReturnValue(mockSupabase)

describe('PhotoLightbox', () => {
  const mockPhotos = [
    {
      id: 'photo-1',
      url: 'https://example.com/photo1.jpg',
      thumbnail_url: 'https://example.com/thumb1.jpg',
      caption: 'Beach sunset',
      date_taken: '2025-01-15T18:00:00Z',
      user: {
        id: 'user-1',
        full_name: 'Alice Smith',
        avatar_url: null,
      },
    },
    {
      id: 'photo-2',
      url: 'https://example.com/photo2.jpg',
      thumbnail_url: 'https://example.com/thumb2.jpg',
      caption: 'Mountain view',
      date_taken: '2025-01-16T10:00:00Z',
      user: {
        id: 'user-2',
        full_name: 'Bob Jones',
        avatar_url: null,
      },
    },
    {
      id: 'photo-3',
      url: 'https://example.com/photo3.jpg',
      thumbnail_url: null,
      caption: null,
      date_taken: '2025-01-17T12:00:00Z',
      user: {
        id: 'user-1',
        full_name: 'Alice Smith',
        avatar_url: null,
      },
    },
  ]

  const mockOnClose = jest.fn()
  const mockOnDelete = jest.fn()
  const mockOnUpdate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render lightbox with initial photo', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-1"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      expect(screen.getByAltText('Beach sunset')).toBeInTheDocument()
      expect(screen.getByText('Beach sunset')).toBeInTheDocument()
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    it('should show photo without caption', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-3"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      expect(screen.getByText('3 / 3')).toBeInTheDocument()
      // Should still show user name
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should navigate to next photo on arrow click', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-1"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      const nextButton = screen.getByLabelText('Next photo')
      fireEvent.click(nextButton)

      expect(screen.getByText('Mountain view')).toBeInTheDocument()
      expect(screen.getByText('2 / 3')).toBeInTheDocument()
    })

    it('should navigate to previous photo on arrow click', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-2"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      const prevButton = screen.getByLabelText('Previous photo')
      fireEvent.click(prevButton)

      expect(screen.getByText('Beach sunset')).toBeInTheDocument()
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    it('should loop to end when pressing previous on first photo', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-1"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      const prevButton = screen.getByLabelText('Previous photo')
      fireEvent.click(prevButton)

      expect(screen.getByText('3 / 3')).toBeInTheDocument()
    })

    it('should loop to start when pressing next on last photo', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-3"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      const nextButton = screen.getByLabelText('Next photo')
      fireEvent.click(nextButton)

      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should navigate with arrow keys', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-1"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      // Press right arrow
      fireEvent.keyDown(window, { key: 'ArrowRight' })
      expect(screen.getByText('2 / 3')).toBeInTheDocument()

      // Press left arrow
      fireEvent.keyDown(window, { key: 'ArrowLeft' })
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    it('should close lightbox on Escape key', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-1"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Edit Mode', () => {
    it('should allow editing caption and date for own photos', async () => {
      const user = userEvent.setup()

      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-1"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      // Click edit button
      const editButton = screen.getByLabelText(/edit/i)
      await user.click(editButton)

      // Should show edit form
      const captionInput = screen.getByDisplayValue('Beach sunset')
      const dateInput = screen.getByDisplayValue('2025-01-15')

      expect(captionInput).toBeInTheDocument()
      expect(dateInput).toBeInTheDocument()
    })

    it('should save edited caption and date', async () => {
      const user = userEvent.setup()
      ;(updateMediaFile as jest.Mock).mockResolvedValue({
        id: 'photo-1',
        caption: 'Updated caption',
        date_taken: '2025-01-20T18:00:00Z',
      })

      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-1"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      // Enter edit mode
      const editButton = screen.getByLabelText(/edit/i)
      await user.click(editButton)

      // Edit caption
      const captionInput = screen.getByDisplayValue('Beach sunset')
      await user.clear(captionInput)
      await user.type(captionInput, 'Updated caption')

      // Save
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(updateMediaFile).toHaveBeenCalledWith(
          mockSupabase,
          'photo-1',
          expect.objectContaining({
            caption: 'Updated caption',
          })
        )
        expect(mockOnUpdate).toHaveBeenCalledWith('photo-1')
      })
    })

    it('should not show edit button for other users photos', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-2"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      // Should not show edit button for Bob's photo
      expect(screen.queryByLabelText(/edit/i)).not.toBeInTheDocument()
    })

    it('should cancel edit mode', async () => {
      const user = userEvent.setup()

      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-1"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      // Enter edit mode
      const editButton = screen.getByLabelText(/edit/i)
      await user.click(editButton)

      // Edit caption
      const captionInput = screen.getByDisplayValue('Beach sunset')
      await user.clear(captionInput)
      await user.type(captionInput, 'Changed caption')

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Should revert to original caption
      expect(screen.getByText('Beach sunset')).toBeInTheDocument()
      expect(updateMediaFile).not.toHaveBeenCalled()
    })
  })

  describe('Delete Photo', () => {
    it('should show delete button for own photos', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-1"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      expect(screen.getByLabelText(/delete/i)).toBeInTheDocument()
    })

    it('should not show delete button for other users photos', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-2"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      expect(screen.queryByLabelText(/delete/i)).not.toBeInTheDocument()
    })

    it('should show confirmation dialog when deleting', async () => {
      const user = userEvent.setup()

      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-1"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      const deleteButton = screen.getByLabelText(/delete/i)
      await user.click(deleteButton)

      expect(screen.getByText(/are you sure you want to delete this photo/i)).toBeInTheDocument()
    })

    it('should delete photo on confirmation', async () => {
      const user = userEvent.setup()
      ;(deleteMediaFile as jest.Mock).mockResolvedValue(undefined)
      ;(deleteMediaFileFromStorage as jest.Mock).mockResolvedValue(undefined)

      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-1"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      // Click delete
      const deleteButton = screen.getByLabelText(/delete/i)
      await user.click(deleteButton)

      // Confirm
      const confirmButton = screen.getByRole('button', { name: /delete/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(deleteMediaFile).toHaveBeenCalledWith(mockSupabase, 'photo-1')
        expect(mockOnDelete).toHaveBeenCalledWith('photo-1')
      })
    })

    it('should cancel deletion', async () => {
      const user = userEvent.setup()

      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-1"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      // Click delete
      const deleteButton = screen.getByLabelText(/delete/i)
      await user.click(deleteButton)

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(deleteMediaFile).not.toHaveBeenCalled()
      expect(mockOnDelete).not.toHaveBeenCalled()
    })
  })

  describe('Close Lightbox', () => {
    it('should close on close button click', async () => {
      const user = userEvent.setup()

      render(
        <PhotoLightbox
          photos={mockPhotos}
          initialPhotoId="photo-1"
          currentUserId="user-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
        />
      )

      const closeButton = screen.getByLabelText(/close/i)
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})
