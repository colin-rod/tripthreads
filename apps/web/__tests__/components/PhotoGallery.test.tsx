/**
 * Component tests for PhotoGallery
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'

// Create mock object at module level (hoisted)
const mockSupabase = {
  from: jest.fn(),
}

// Mock dependencies with factory functions (these run BEFORE imports)
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

jest.mock('@tripthreads/core')

jest.mock('date-fns', () => ({
  format: jest.fn((date: Date, formatStr: string) => {
    if (formatStr === 'EEEE, MMMM d, yyyy') {
      return 'Monday, January 15, 2025'
    }
    return date.toISOString()
  }),
}))

// NOW import components (mocks are already in place)
import PhotoGallery from '@/components/features/feed/PhotoGallery'
import { getMediaFilesGroupedByDate } from '@tripthreads/core'

describe('PhotoGallery', () => {
  const mockTripId = 'trip-123'
  const mockOnPhotoClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render empty state when no photos', async () => {
      ;(getMediaFilesGroupedByDate as jest.Mock).mockResolvedValue({})

      render(<PhotoGallery tripId={mockTripId} onPhotoClick={mockOnPhotoClick} />)

      await waitFor(() => {
        expect(screen.getByText(/no photos or videos yet/i)).toBeInTheDocument()
      })
    })

    it('should render loading skeletons initially', () => {
      ;(getMediaFilesGroupedByDate as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<PhotoGallery tripId={mockTripId} onPhotoClick={mockOnPhotoClick} />)

      // Should show skeleton loaders
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should render grouped photos by date', async () => {
      const mockGroupedPhotos = {
        '2025-01-15': [
          {
            id: 'photo-1',
            url: 'https://example.com/photo1.jpg',
            thumbnail_url: 'https://example.com/thumb1.jpg',
            caption: 'Beach photo',
            date_taken: '2025-01-15T10:00:00Z',
            type: 'photo',
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
            caption: 'Sunset',
            date_taken: '2025-01-15T18:00:00Z',
            type: 'photo',
            user: {
              id: 'user-2',
              full_name: 'Bob Jones',
              avatar_url: null,
            },
          },
        ],
        '2025-01-16': [
          {
            id: 'photo-3',
            url: 'https://example.com/photo3.jpg',
            thumbnail_url: null,
            caption: null,
            date_taken: '2025-01-16T12:00:00Z',
            type: 'photo',
            user: {
              id: 'user-1',
              full_name: 'Alice Smith',
              avatar_url: null,
            },
          },
        ],
      }

      ;(getMediaFilesGroupedByDate as jest.Mock).mockResolvedValue(mockGroupedPhotos)

      render(<PhotoGallery tripId={mockTripId} onPhotoClick={mockOnPhotoClick} />)

      await waitFor(() => {
        // Should show date headers (there are two groups with this date format)
        const dateHeaders = screen.getAllByText('Monday, January 15, 2025')
        expect(dateHeaders.length).toBeGreaterThan(0)

        // Should show photo count
        expect(screen.getByText('(2 photos)')).toBeInTheDocument()
        expect(screen.getByText('(1 photo)')).toBeInTheDocument()

        // Should show photos
        expect(screen.getAllByRole('img')).toHaveLength(3)
      })
    })

    it('should use thumbnail_url when available, fallback to url', async () => {
      const mockGroupedPhotos = {
        '2025-01-15': [
          {
            id: 'photo-1',
            url: 'https://example.com/full.jpg',
            thumbnail_url: 'https://example.com/thumb.jpg',
            caption: null,
            date_taken: '2025-01-15T10:00:00Z',
            type: 'photo',
            user: { id: 'user-1', full_name: 'Alice', avatar_url: null },
          },
          {
            id: 'photo-2',
            url: 'https://example.com/full2.jpg',
            thumbnail_url: null,
            caption: null,
            date_taken: '2025-01-15T11:00:00Z',
            type: 'photo',
            user: { id: 'user-1', full_name: 'Alice', avatar_url: null },
          },
        ],
      }

      ;(getMediaFilesGroupedByDate as jest.Mock).mockResolvedValue(mockGroupedPhotos)

      render(<PhotoGallery tripId={mockTripId} onPhotoClick={mockOnPhotoClick} />)

      await waitFor(() => {
        const images = screen.getAllByRole('img')
        expect(images[0]).toHaveAttribute('src', expect.stringContaining('thumb.jpg'))
        expect(images[1]).toHaveAttribute('src', expect.stringContaining('full2.jpg'))
      })
    })
  })

  describe('Interactions', () => {
    it('should call onPhotoClick when photo is clicked', async () => {
      const mockGroupedPhotos = {
        '2025-01-15': [
          {
            id: 'photo-1',
            url: 'https://example.com/photo1.jpg',
            thumbnail_url: 'https://example.com/thumb1.jpg',
            caption: 'Test photo',
            date_taken: '2025-01-15T10:00:00Z',
            type: 'photo',
            user: { id: 'user-1', full_name: 'Alice', avatar_url: null },
          },
        ],
      }

      ;(getMediaFilesGroupedByDate as jest.Mock).mockResolvedValue(mockGroupedPhotos)

      render(<PhotoGallery tripId={mockTripId} onPhotoClick={mockOnPhotoClick} />)

      await waitFor(() => {
        expect(screen.getByAltText('Test photo')).toBeInTheDocument()
      })

      const photoCard = screen.getByAltText('Test photo').closest('.cursor-pointer')
      fireEvent.click(photoCard!)

      expect(mockOnPhotoClick).toHaveBeenCalledWith('photo-1', 'https://example.com/photo1.jpg')
    })

    it('should show caption when available', async () => {
      const mockGroupedPhotos = {
        '2025-01-15': [
          {
            id: 'photo-1',
            url: 'https://example.com/photo1.jpg',
            thumbnail_url: 'https://example.com/thumb1.jpg',
            caption: 'Beautiful sunset',
            date_taken: '2025-01-15T18:00:00Z',
            type: 'photo',
            user: { id: 'user-1', full_name: 'Alice Smith', avatar_url: null },
          },
        ],
      }

      ;(getMediaFilesGroupedByDate as jest.Mock).mockResolvedValue(mockGroupedPhotos)

      render(<PhotoGallery tripId={mockTripId} onPhotoClick={mockOnPhotoClick} />)

      await waitFor(() => {
        expect(screen.getByText('Beautiful sunset')).toBeInTheDocument()
      })
    })

    it('should show user name when no caption', async () => {
      const mockGroupedPhotos = {
        '2025-01-15': [
          {
            id: 'photo-1',
            url: 'https://example.com/photo1.jpg',
            thumbnail_url: 'https://example.com/thumb1.jpg',
            caption: null,
            date_taken: '2025-01-15T18:00:00Z',
            type: 'photo',
            user: { id: 'user-1', full_name: 'Alice Smith', avatar_url: null },
          },
        ],
      }

      ;(getMediaFilesGroupedByDate as jest.Mock).mockResolvedValue(mockGroupedPhotos)

      render(<PhotoGallery tripId={mockTripId} onPhotoClick={mockOnPhotoClick} />)

      await waitFor(() => {
        expect(screen.getByText('by Alice Smith')).toBeInTheDocument()
      })
    })
  })

  describe('Date Sorting', () => {
    it('should sort dates in descending order (newest first)', async () => {
      const mockGroupedPhotos = {
        '2025-01-10': [
          {
            id: 'photo-1',
            url: 'https://example.com/old.jpg',
            thumbnail_url: null,
            caption: 'Old photo',
            date_taken: '2025-01-10T10:00:00Z',
            type: 'photo',
            user: { id: 'user-1', full_name: 'Alice', avatar_url: null },
          },
        ],
        '2025-01-20': [
          {
            id: 'photo-2',
            url: 'https://example.com/new.jpg',
            thumbnail_url: null,
            caption: 'New photo',
            date_taken: '2025-01-20T10:00:00Z',
            type: 'photo',
            user: { id: 'user-1', full_name: 'Alice', avatar_url: null },
          },
        ],
      }

      ;(getMediaFilesGroupedByDate as jest.Mock).mockResolvedValue(mockGroupedPhotos)

      render(<PhotoGallery tripId={mockTripId} onPhotoClick={mockOnPhotoClick} />)

      await waitFor(() => {
        const dateHeaders = screen.getAllByText(/2025/)
        // Newer date (2025-01-20) should come first
        expect(dateHeaders[0].textContent).toContain('January')
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error state when fetch fails', async () => {
      ;(getMediaFilesGroupedByDate as jest.Mock).mockRejectedValue(new Error('Failed to fetch'))

      render(<PhotoGallery tripId={mockTripId} onPhotoClick={mockOnPhotoClick} />)

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch')).toBeInTheDocument()
      })
    })
  })

  describe('Refresh on Trip Change', () => {
    it('should refetch photos when tripId changes', async () => {
      const mockGroupedPhotos1 = {
        '2025-01-15': [
          {
            id: 'photo-1',
            url: 'https://example.com/photo1.jpg',
            thumbnail_url: null,
            caption: 'Trip 1 photo',
            date_taken: '2025-01-15T10:00:00Z',
            type: 'photo',
            user: { id: 'user-1', full_name: 'Alice', avatar_url: null },
          },
        ],
      }

      ;(getMediaFilesGroupedByDate as jest.Mock).mockResolvedValue(mockGroupedPhotos1)

      const { rerender } = render(<PhotoGallery tripId="trip-1" onPhotoClick={mockOnPhotoClick} />)

      await waitFor(() => {
        expect(screen.getByText('Trip 1 photo')).toBeInTheDocument()
      })

      // Change tripId
      const mockGroupedPhotos2 = {
        '2025-01-16': [
          {
            id: 'photo-2',
            url: 'https://example.com/photo2.jpg',
            thumbnail_url: null,
            caption: 'Trip 2 photo',
            date_taken: '2025-01-16T10:00:00Z',
            type: 'photo',
            user: { id: 'user-1', full_name: 'Alice', avatar_url: null },
          },
        ],
      }

      ;(getMediaFilesGroupedByDate as jest.Mock).mockResolvedValue(mockGroupedPhotos2)

      rerender(<PhotoGallery tripId="trip-2" onPhotoClick={mockOnPhotoClick} />)

      await waitFor(() => {
        expect(getMediaFilesGroupedByDate).toHaveBeenCalledWith(mockSupabase, 'trip-2')
      })
    })
  })
})
