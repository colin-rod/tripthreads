/**
 * MetadataSection Component Tests
 *
 * Tests the type-specific metadata display component used in
 * expanded list items. Shows key-value pairs in a grid layout.
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { MetadataSection } from '../../components/features/itinerary/MetadataSection'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'

describe('MetadataSection', () => {
  const baseItem: Omit<ItineraryItemWithParticipants, 'type' | 'metadata'> = {
    id: '1',
    trip_id: 'trip1',
    title: 'Test Item',
    description: null,
    notes: null,
    links: [],
    start_time: '2025-06-15T08:00:00Z',
    end_time: '2025-06-15T10:30:00Z',
    is_all_day: false,
    location: null,
    created_by: 'user1',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
  }

  describe('transport items', () => {
    it('renders transport metadata with all fields', () => {
      const item: ItineraryItemWithParticipants = {
        ...baseItem,
        type: 'transport',
        metadata: {
          departure_location: 'JFK',
          arrival_location: 'CDG',
          terminal: '1',
          gate: 'A5',
          seat_number: '12A',
          booking_reference: 'ABC123',
        },
      }

      render(<MetadataSection item={item} />)

      expect(screen.getByText('Transport Details')).toBeInTheDocument()
      expect(screen.getByText('Route:')).toBeInTheDocument()
      expect(screen.getByText('JFK → CDG')).toBeInTheDocument()
      expect(screen.getByText('Terminal:')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('Gate:')).toBeInTheDocument()
      expect(screen.getByText('A5')).toBeInTheDocument()
      expect(screen.getByText('Seat:')).toBeInTheDocument()
      expect(screen.getByText('12A')).toBeInTheDocument()
      expect(screen.getByText('Booking Ref:')).toBeInTheDocument()
      expect(screen.getByText('ABC123')).toBeInTheDocument()
    })

    it('renders only available transport fields', () => {
      const item: ItineraryItemWithParticipants = {
        ...baseItem,
        type: 'transport',
        metadata: {
          terminal: '2',
        },
      }

      render(<MetadataSection item={item} />)

      expect(screen.getByText('Transport Details')).toBeInTheDocument()
      expect(screen.getByText('Terminal:')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.queryByText('Gate:')).not.toBeInTheDocument()
      expect(screen.queryByText('Route:')).not.toBeInTheDocument()
    })
  })

  describe('accommodation items', () => {
    it('renders accommodation metadata with all fields', () => {
      const item: ItineraryItemWithParticipants = {
        ...baseItem,
        type: 'accommodation',
        metadata: {
          check_in_time: '3:00 PM',
          check_out_time: '11:00 AM',
          room_number: '405',
          address: '123 Main St, Lisbon',
        },
      }

      render(<MetadataSection item={item} />)

      expect(screen.getByText('Accommodation Details')).toBeInTheDocument()
      expect(screen.getByText('Check-in:')).toBeInTheDocument()
      expect(screen.getByText('3:00 PM')).toBeInTheDocument()
      expect(screen.getByText('Check-out:')).toBeInTheDocument()
      expect(screen.getByText('11:00 AM')).toBeInTheDocument()
      expect(screen.getByText('Room:')).toBeInTheDocument()
      expect(screen.getByText('405')).toBeInTheDocument()
      expect(screen.getByText('Address:')).toBeInTheDocument()
      expect(screen.getByText('123 Main St, Lisbon')).toBeInTheDocument()
    })
  })

  describe('dining items', () => {
    it('renders dining metadata with all fields', () => {
      const item: ItineraryItemWithParticipants = {
        ...baseItem,
        type: 'dining',
        metadata: {
          reservation_time: '7:00 PM',
          cuisine_type: 'Italian',
          price_range: '$$$',
          dietary_notes: 'Vegetarian options available',
        },
      }

      render(<MetadataSection item={item} />)

      expect(screen.getByText('Dining Details')).toBeInTheDocument()
      expect(screen.getByText('Reservation:')).toBeInTheDocument()
      expect(screen.getByText('7:00 PM')).toBeInTheDocument()
      expect(screen.getByText('Cuisine:')).toBeInTheDocument()
      expect(screen.getByText('Italian')).toBeInTheDocument()
      expect(screen.getByText('Price:')).toBeInTheDocument()
      expect(screen.getByText('$$$')).toBeInTheDocument()
      expect(screen.getByText('Dietary:')).toBeInTheDocument()
      expect(screen.getByText('Vegetarian options available')).toBeInTheDocument()
    })
  })

  describe('activity items', () => {
    it('renders activity metadata with all fields', () => {
      const item: ItineraryItemWithParticipants = {
        ...baseItem,
        type: 'activity',
        metadata: {
          meeting_point: 'Hotel Lobby',
          duration: '3 hours',
          difficulty_level: 'moderate',
          group_size: '8-12 people',
        },
      }

      render(<MetadataSection item={item} />)

      expect(screen.getByText('Activity Details')).toBeInTheDocument()
      expect(screen.getByText('Meeting Point:')).toBeInTheDocument()
      expect(screen.getByText('Hotel Lobby')).toBeInTheDocument()
      expect(screen.getByText('Duration:')).toBeInTheDocument()
      expect(screen.getByText('3 hours')).toBeInTheDocument()
      expect(screen.getByText('Difficulty:')).toBeInTheDocument()
      expect(screen.getByText('moderate')).toBeInTheDocument()
      expect(screen.getByText('Group Size:')).toBeInTheDocument()
      expect(screen.getByText('8-12 people')).toBeInTheDocument()
    })
  })

  describe('sightseeing items', () => {
    it('renders sightseeing metadata with all fields', () => {
      const item: ItineraryItemWithParticipants = {
        ...baseItem,
        type: 'sightseeing',
        metadata: {
          admission_price: '€15',
          opening_hours: '9 AM - 6 PM',
          recommended_duration: '2-3 hours',
        },
      }

      render(<MetadataSection item={item} />)

      expect(screen.getByText('Sightseeing Details')).toBeInTheDocument()
      expect(screen.getByText('Admission:')).toBeInTheDocument()
      expect(screen.getByText('€15')).toBeInTheDocument()
      expect(screen.getByText('Hours:')).toBeInTheDocument()
      expect(screen.getByText('9 AM - 6 PM')).toBeInTheDocument()
      expect(screen.getByText('Suggested Duration:')).toBeInTheDocument()
      expect(screen.getByText('2-3 hours')).toBeInTheDocument()
    })
  })

  describe('general items', () => {
    it('returns null for general type', () => {
      const item: ItineraryItemWithParticipants = {
        ...baseItem,
        type: 'general',
        metadata: {},
      }

      const { container } = render(<MetadataSection item={item} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('empty metadata cases', () => {
    it('returns null when no metadata fields are present', () => {
      const item: ItineraryItemWithParticipants = {
        ...baseItem,
        type: 'transport',
        metadata: {},
      }

      const { container } = render(<MetadataSection item={item} />)

      expect(container.firstChild).toBeNull()
    })

    it('returns null when metadata is undefined', () => {
      const item: ItineraryItemWithParticipants = {
        ...baseItem,
        type: 'transport',
        metadata: {},
      }

      const { container } = render(<MetadataSection item={item} />)

      expect(container.firstChild).toBeNull()
    })

    it('returns null when all metadata values are null', () => {
      const item: ItineraryItemWithParticipants = {
        ...baseItem,
        type: 'transport',
        metadata: {
          terminal: null,
          gate: null,
        },
      }

      const { container } = render(<MetadataSection item={item} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('styling', () => {
    it('applies grid layout classes', () => {
      const item: ItineraryItemWithParticipants = {
        ...baseItem,
        type: 'transport',
        metadata: {
          terminal: '1',
        },
      }

      const { container } = render(<MetadataSection item={item} />)

      const gridElement = container.querySelector('.grid')
      expect(gridElement).toBeInTheDocument()
      expect(gridElement).toHaveClass('grid-cols-2')
      expect(gridElement).toHaveClass('gap-x-4')
      expect(gridElement).toHaveClass('gap-y-1')
      expect(gridElement).toHaveClass('text-sm')
    })

    it('applies correct heading styles', () => {
      const item: ItineraryItemWithParticipants = {
        ...baseItem,
        type: 'transport',
        metadata: {
          terminal: '1',
        },
      }

      render(<MetadataSection item={item} />)

      const heading = screen.getByText('Transport Details')
      expect(heading).toHaveClass('text-xs')
      expect(heading).toHaveClass('font-semibold')
      expect(heading).toHaveClass('text-muted-foreground')
      expect(heading).toHaveClass('mb-2')
    })

    it('applies muted text to labels', () => {
      const item: ItineraryItemWithParticipants = {
        ...baseItem,
        type: 'transport',
        metadata: {
          terminal: '1',
        },
      }

      render(<MetadataSection item={item} />)

      const label = screen.getByText('Terminal:')
      expect(label).toHaveClass('text-muted-foreground')
    })
  })

  describe('edge cases', () => {
    it('handles partial metadata gracefully', () => {
      const item: ItineraryItemWithParticipants = {
        ...baseItem,
        type: 'accommodation',
        metadata: {
          check_in_time: '3:00 PM',
          // Missing other fields
        },
      }

      render(<MetadataSection item={item} />)

      expect(screen.getByText('Accommodation Details')).toBeInTheDocument()
      expect(screen.getByText('Check-in:')).toBeInTheDocument()
      expect(screen.getByText('3:00 PM')).toBeInTheDocument()
      expect(screen.queryByText('Check-out:')).not.toBeInTheDocument()
      expect(screen.queryByText('Room:')).not.toBeInTheDocument()
    })

    it('capitalizes type name in heading', () => {
      const item: ItineraryItemWithParticipants = {
        ...baseItem,
        type: 'activity',
        metadata: {
          duration: '2 hours',
        },
      }

      render(<MetadataSection item={item} />)

      expect(screen.getByText('Activity Details')).toBeInTheDocument()
    })
  })
})
