/**
 * Itinerary Utility Functions Tests
 *
 * Test Coverage:
 * - calculateDuration: All duration formats (hours+mins, hours only, mins only, days, null cases)
 * - getKeyMetadata: All 6 item types with various metadata combinations
 * - formatBookingReference: Transport (flight/train) and accommodation cases
 *
 * Target: 100% coverage for utility functions
 *
 * How to run:
 * npm test -- packages/core/src/utils/__tests__/itinerary.test.ts
 */

import { calculateDuration, getKeyMetadata, formatBookingReference } from '../itinerary'
import type { ItineraryItemWithParticipants } from '../../types/itinerary'

describe('itinerary utilities', () => {
  describe('calculateDuration', () => {
    describe('same-day durations', () => {
      it('calculates hours and minutes', () => {
        const result = calculateDuration('2025-06-15T08:00:00Z', '2025-06-15T10:30:00Z')
        expect(result).toBe('2h 30m')
      })

      it('calculates hours only', () => {
        const result = calculateDuration('2025-06-15T08:00:00Z', '2025-06-15T11:00:00Z')
        expect(result).toBe('3h')
      })

      it('calculates minutes only', () => {
        const result = calculateDuration('2025-06-15T08:00:00Z', '2025-06-15T08:45:00Z')
        expect(result).toBe('45m')
      })

      it('handles single digit hours', () => {
        const result = calculateDuration('2025-06-15T08:00:00Z', '2025-06-15T09:15:00Z')
        expect(result).toBe('1h 15m')
      })

      it('handles very short durations', () => {
        const result = calculateDuration('2025-06-15T08:00:00Z', '2025-06-15T08:05:00Z')
        expect(result).toBe('5m')
      })

      it('handles 24 hours exactly', () => {
        const result = calculateDuration('2025-06-15T08:00:00Z', '2025-06-16T08:00:00Z')
        expect(result).toBe('1 day')
      })
    })

    describe('multi-day durations', () => {
      it('calculates single day', () => {
        const result = calculateDuration('2025-06-15T14:00:00Z', '2025-06-16T16:00:00Z')
        expect(result).toBe('1 day')
      })

      it('calculates multiple days', () => {
        const result = calculateDuration('2025-06-15T08:00:00Z', '2025-06-18T08:00:00Z')
        expect(result).toBe('3 days')
      })

      it('calculates week-long duration', () => {
        const result = calculateDuration('2025-06-15T08:00:00Z', '2025-06-22T08:00:00Z')
        expect(result).toBe('7 days')
      })
    })

    describe('edge cases', () => {
      it('returns null when end_time is null', () => {
        const result = calculateDuration('2025-06-15T08:00:00Z', null)
        expect(result).toBeNull()
      })

      it('handles zero duration (same time)', () => {
        const result = calculateDuration('2025-06-15T08:00:00Z', '2025-06-15T08:00:00Z')
        expect(result).toBe('0m')
      })

      it('handles date-only format (no time)', () => {
        const result = calculateDuration('2025-06-15', '2025-06-17')
        expect(result).toBe('2 days')
      })
    })
  })

  describe('getKeyMetadata', () => {
    describe('transport items', () => {
      it('returns flight number, route, terminal, gate, and booking ref', () => {
        const item: ItineraryItemWithParticipants = {
          id: '1',
          trip_id: 'trip1',
          type: 'transport',
          title: 'Flight to Lisbon',
          description: null,
          notes: null,
          links: [],
          start_time: '2025-06-15T08:00:00Z',
          end_time: '2025-06-15T10:30:00Z',
          is_all_day: false,
          location: null,
          metadata: {
            flight_number: 'TP123',
            departure_location: 'JFK',
            arrival_location: 'LIS',
            terminal: '1',
            gate: 'A5',
            booking_reference: 'ABC123',
          },
          created_by: 'user1',
          created_at: '2025-06-01T00:00:00Z',
          updated_at: '2025-06-01T00:00:00Z',
        }

        const result = getKeyMetadata(item)

        expect(result).toContain('Flight TP123')
        expect(result).toContain('JFK → LIS')
        expect(result).toContain('Terminal 1 • Gate A5')
        expect(result).toContain('Booking: ABC123')
        expect(result.length).toBeGreaterThan(0)
      })

      it('handles train number instead of flight', () => {
        const item: ItineraryItemWithParticipants = {
          id: '1',
          trip_id: 'trip1',
          type: 'transport',
          title: 'Train to Paris',
          description: null,
          notes: null,
          links: [],
          start_time: '2025-06-15T08:00:00Z',
          end_time: '2025-06-15T10:30:00Z',
          is_all_day: false,
          location: null,
          metadata: {
            train_number: 'TGV9123',
            departure_location: 'London',
            arrival_location: 'Paris',
          },
          created_by: 'user1',
          created_at: '2025-06-01T00:00:00Z',
          updated_at: '2025-06-01T00:00:00Z',
        }

        const result = getKeyMetadata(item)

        expect(result).toContain('Train TGV9123')
        expect(result).toContain('London → Paris')
      })

      it('handles partial metadata (only terminal)', () => {
        const item: ItineraryItemWithParticipants = {
          id: '1',
          trip_id: 'trip1',
          type: 'transport',
          title: 'Flight',
          description: null,
          notes: null,
          links: [],
          start_time: '2025-06-15T08:00:00Z',
          end_time: null,
          is_all_day: false,
          location: null,
          metadata: {
            terminal: '2',
          },
          created_by: 'user1',
          created_at: '2025-06-01T00:00:00Z',
          updated_at: '2025-06-01T00:00:00Z',
        }

        const result = getKeyMetadata(item)

        expect(result).toContain('Terminal 2')
        expect(result.some(line => line.includes('Gate'))).toBe(false)
      })

      it('handles empty metadata', () => {
        const item: ItineraryItemWithParticipants = {
          id: '1',
          trip_id: 'trip1',
          type: 'transport',
          title: 'Flight',
          description: null,
          notes: null,
          links: [],
          start_time: '2025-06-15T08:00:00Z',
          end_time: null,
          is_all_day: false,
          location: null,
          metadata: {},
          created_by: 'user1',
          created_at: '2025-06-01T00:00:00Z',
          updated_at: '2025-06-01T00:00:00Z',
        }

        const result = getKeyMetadata(item)

        expect(result).toEqual([])
      })
    })

    describe('accommodation items', () => {
      it('returns confirmation, check-in/out times, address, room', () => {
        const item: ItineraryItemWithParticipants = {
          id: '1',
          trip_id: 'trip1',
          type: 'accommodation',
          title: 'Hotel Lisbon',
          description: null,
          notes: null,
          links: [],
          start_time: '2025-06-15T14:00:00Z',
          end_time: '2025-06-17T11:00:00Z',
          is_all_day: false,
          location: null,
          metadata: {
            confirmation_number: 'CONF123',
            check_in_time: '3:00 PM',
            check_out_time: '11:00 AM',
            address: '123 Rua Augusta, Lisbon',
            room_number: '405',
          },
          created_by: 'user1',
          created_at: '2025-06-01T00:00:00Z',
          updated_at: '2025-06-01T00:00:00Z',
        }

        const result = getKeyMetadata(item)

        expect(result).toContain('Conf: CONF123')
        expect(result).toContain('Check-in: 3:00 PM')
        expect(result).toContain('123 Rua Augusta, Lisbon')
      })

      it('handles partial metadata (confirmation only)', () => {
        const item: ItineraryItemWithParticipants = {
          id: '1',
          trip_id: 'trip1',
          type: 'accommodation',
          title: 'Hotel',
          description: null,
          notes: null,
          links: [],
          start_time: '2025-06-15T14:00:00Z',
          end_time: null,
          is_all_day: false,
          location: null,
          metadata: {
            confirmation_number: 'ABC456',
          },
          created_by: 'user1',
          created_at: '2025-06-01T00:00:00Z',
          updated_at: '2025-06-01T00:00:00Z',
        }

        const result = getKeyMetadata(item)

        expect(result).toEqual(['Conf: ABC456'])
      })
    })

    describe('dining items', () => {
      it('returns reservation name, cuisine + price, dietary notes', () => {
        const item: ItineraryItemWithParticipants = {
          id: '1',
          trip_id: 'trip1',
          type: 'dining',
          title: 'Dinner at Trattoria',
          description: null,
          notes: null,
          links: [],
          start_time: '2025-06-15T19:00:00Z',
          end_time: '2025-06-15T21:00:00Z',
          is_all_day: false,
          location: null,
          metadata: {
            reservation_name: 'Smith',
            cuisine_type: 'Italian',
            price_range: '$$$',
          },
          created_by: 'user1',
          created_at: '2025-06-01T00:00:00Z',
          updated_at: '2025-06-01T00:00:00Z',
        }

        const result = getKeyMetadata(item)

        expect(result).toContain('Reservation: Smith')
        expect(result).toContain('Italian • $$$')
      })

      it('handles cuisine without price range', () => {
        const item: ItineraryItemWithParticipants = {
          id: '1',
          trip_id: 'trip1',
          type: 'dining',
          title: 'Lunch',
          description: null,
          notes: null,
          links: [],
          start_time: '2025-06-15T12:00:00Z',
          end_time: null,
          is_all_day: false,
          location: null,
          metadata: {
            cuisine_type: 'Japanese',
          },
          created_by: 'user1',
          created_at: '2025-06-01T00:00:00Z',
          updated_at: '2025-06-01T00:00:00Z',
        }

        const result = getKeyMetadata(item)

        expect(result.length).toBe(0) // Only shows when both are present
      })
    })

    describe('activity items', () => {
      it('returns meeting point, duration, difficulty, group size', () => {
        const item: ItineraryItemWithParticipants = {
          id: '1',
          trip_id: 'trip1',
          type: 'activity',
          title: 'Hiking Tour',
          description: null,
          notes: null,
          links: [],
          start_time: '2025-06-15T09:00:00Z',
          end_time: '2025-06-15T13:00:00Z',
          is_all_day: false,
          location: null,
          metadata: {
            meeting_point: 'Hotel Lobby',
            duration: '4 hours',
            difficulty_level: 'moderate',
            group_size: '8-12 people',
          },
          created_by: 'user1',
          created_at: '2025-06-01T00:00:00Z',
          updated_at: '2025-06-01T00:00:00Z',
        }

        const result = getKeyMetadata(item)

        expect(result).toContain('Meet: Hotel Lobby')
        expect(result).toContain('Duration: 4 hours')
        expect(result).toContain('Difficulty: moderate')
        expect(result).toContain('Group Size: 8-12 people')
      })
    })

    describe('sightseeing items', () => {
      it('returns admission price, opening hours, recommended duration', () => {
        const item: ItineraryItemWithParticipants = {
          id: '1',
          trip_id: 'trip1',
          type: 'sightseeing',
          title: 'Louvre Museum',
          description: null,
          notes: null,
          links: [],
          start_time: '2025-06-15T10:00:00Z',
          end_time: '2025-06-15T13:00:00Z',
          is_all_day: false,
          location: null,
          metadata: {
            admission_price: '€17',
            opening_hours: '9 AM - 6 PM',
            recommended_duration: '3 hours',
          },
          created_by: 'user1',
          created_at: '2025-06-01T00:00:00Z',
          updated_at: '2025-06-01T00:00:00Z',
        }

        const result = getKeyMetadata(item)

        expect(result).toContain('Admission: €17')
        expect(result).toContain('Open: 9 AM - 6 PM')
      })
    })

    describe('general items', () => {
      it('returns empty array for general type', () => {
        const item: ItineraryItemWithParticipants = {
          id: '1',
          trip_id: 'trip1',
          type: 'general',
          title: 'Free Time',
          description: null,
          notes: null,
          links: [],
          start_time: '2025-06-15T14:00:00Z',
          end_time: null,
          is_all_day: false,
          location: null,
          metadata: {},
          created_by: 'user1',
          created_at: '2025-06-01T00:00:00Z',
          updated_at: '2025-06-01T00:00:00Z',
        }

        const result = getKeyMetadata(item)

        expect(result).toEqual([])
      })
    })

    describe('edge cases', () => {
      it('handles undefined metadata', () => {
        const item: ItineraryItemWithParticipants = {
          id: '1',
          trip_id: 'trip1',
          type: 'transport',
          title: 'Flight',
          description: null,
          notes: null,
          links: [],
          start_time: '2025-06-15T08:00:00Z',
          end_time: null,
          is_all_day: false,
          location: null,
          metadata: {},
          created_by: 'user1',
          created_at: '2025-06-01T00:00:00Z',
          updated_at: '2025-06-01T00:00:00Z',
        }

        const result = getKeyMetadata(item)

        expect(result).toEqual([])
      })

      it('handles null metadata values', () => {
        const item: ItineraryItemWithParticipants = {
          id: '1',
          trip_id: 'trip1',
          type: 'transport',
          title: 'Flight',
          description: null,
          notes: null,
          links: [],
          start_time: '2025-06-15T08:00:00Z',
          end_time: null,
          is_all_day: false,
          location: null,
          metadata: {
            flight_number: null,
            terminal: null,
          },
          created_by: 'user1',
          created_at: '2025-06-01T00:00:00Z',
          updated_at: '2025-06-01T00:00:00Z',
        }

        const result = getKeyMetadata(item)

        expect(result).toEqual([])
      })
    })
  })

  describe('formatBookingReference', () => {
    describe('transport items', () => {
      it('formats flight number', () => {
        const result = formatBookingReference('transport', { flight_number: 'TP123' })
        expect(result).toBe('Flight TP123')
      })

      it('formats train number', () => {
        const result = formatBookingReference('transport', { train_number: 'TGV456' })
        expect(result).toBe('Train TGV456')
      })

      it('prioritizes flight number over train number', () => {
        const result = formatBookingReference('transport', {
          flight_number: 'AA123',
          train_number: 'TGV456',
        })
        expect(result).toBe('Flight AA123')
      })

      it('returns null when no booking info', () => {
        const result = formatBookingReference('transport', {})
        expect(result).toBeNull()
      })
    })

    describe('accommodation items', () => {
      it('formats confirmation number', () => {
        const result = formatBookingReference('accommodation', { confirmation_number: 'CONF123' })
        expect(result).toBe('Conf: CONF123')
      })

      it('returns null when no confirmation', () => {
        const result = formatBookingReference('accommodation', {})
        expect(result).toBeNull()
      })
    })

    describe('other item types', () => {
      it('returns null for dining', () => {
        const result = formatBookingReference('dining', { reservation_name: 'Smith' })
        expect(result).toBeNull()
      })

      it('returns null for activity', () => {
        const result = formatBookingReference('activity', { meeting_point: 'Lobby' })
        expect(result).toBeNull()
      })

      it('returns null for sightseeing', () => {
        const result = formatBookingReference('sightseeing', { admission_price: '€10' })
        expect(result).toBeNull()
      })

      it('returns null for general', () => {
        const result = formatBookingReference('general', {})
        expect(result).toBeNull()
      })
    })

    describe('edge cases', () => {
      it('handles empty metadata', () => {
        const result = formatBookingReference('transport', {})
        expect(result).toBeNull()
      })

      it('handles undefined metadata', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = formatBookingReference('transport', undefined as any)
        expect(result).toBeNull()
      })
    })
  })
})
