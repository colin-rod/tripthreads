/**
 * Unit tests for notification preference utilities
 *
 * Tests inheritance logic, preference resolution, and helper functions.
 * Following TDD principles with comprehensive coverage.
 */

import {
  getEffectivePreference,
  shouldNotifyUser,
  getAllEffectivePreferences,
  isPreferenceInherited,
  getEventTypeLabel,
  getEventTypeDescription,
  type GlobalNotificationPreferences,
  type NotificationEventType,
} from '@/lib/utils/notifications'
import type { TripNotificationPreferences } from '@tripthreads/core/validation/trip'

describe('Notification Preference Utilities', () => {
  // Mock global preferences (from profiles.notification_preferences)
  const mockGlobalPreferences: GlobalNotificationPreferences = {
    email_trip_invites: true,
    email_expense_updates: true,
    email_trip_updates: false, // Disabled globally
    push_trip_invites: true,
    push_expense_updates: false,
    push_trip_updates: true,
  }

  describe('getEffectivePreference', () => {
    it('should return trip preference when explicitly set to true', () => {
      const tripPrefs: TripNotificationPreferences = {
        expenses: true,
      }
      expect(getEffectivePreference('expenses', tripPrefs, mockGlobalPreferences, 'email')).toBe(
        true
      )
    })

    it('should return trip preference when explicitly set to false', () => {
      const tripPrefs: TripNotificationPreferences = {
        invites: false,
      }
      expect(getEffectivePreference('invites', tripPrefs, mockGlobalPreferences, 'email')).toBe(
        false
      )
    })

    it('should inherit from global when trip preference is null', () => {
      const tripPrefs: TripNotificationPreferences = {
        invites: null,
      }
      expect(getEffectivePreference('invites', tripPrefs, mockGlobalPreferences, 'email')).toBe(
        true
      ) // Global is true
    })

    it('should inherit from global when trip preference is undefined', () => {
      const tripPrefs: TripNotificationPreferences = {
        // expenses not defined
      }
      expect(getEffectivePreference('expenses', tripPrefs, mockGlobalPreferences, 'email')).toBe(
        true
      ) // Global is true
    })

    it('should inherit from global when trip preferences object is null', () => {
      expect(getEffectivePreference('invites', null, mockGlobalPreferences, 'email')).toBe(true) // Global is true
    })

    it('should inherit from global when trip preferences object is undefined', () => {
      expect(getEffectivePreference('expenses', undefined, mockGlobalPreferences, 'email')).toBe(
        true
      ) // Global is true
    })

    it('should override global with trip preference even when global is true', () => {
      const tripPrefs: TripNotificationPreferences = {
        invites: false, // Override global (which is true)
      }
      expect(getEffectivePreference('invites', tripPrefs, mockGlobalPreferences, 'email')).toBe(
        false
      )
    })

    it('should override global with trip preference even when global is false', () => {
      const tripPrefs: TripNotificationPreferences = {
        itinerary: true, // Override global (which is false for email_trip_updates)
      }
      expect(getEffectivePreference('itinerary', tripPrefs, mockGlobalPreferences, 'email')).toBe(
        true
      )
    })

    it('should default to false when global preference is missing', () => {
      const emptyGlobalPrefs: GlobalNotificationPreferences = {}
      expect(getEffectivePreference('invites', null, emptyGlobalPrefs, 'email')).toBe(false)
    })

    it('should respect email channel preferences', () => {
      expect(getEffectivePreference('expenses', null, mockGlobalPreferences, 'email')).toBe(true) // email_expense_updates is true
    })

    it('should respect push channel preferences', () => {
      expect(getEffectivePreference('expenses', null, mockGlobalPreferences, 'push')).toBe(false) // push_expense_updates is false
    })

    it('should map event types to correct global email keys', () => {
      expect(getEffectivePreference('invites', null, mockGlobalPreferences, 'email')).toBe(true) // email_trip_invites

      expect(getEffectivePreference('itinerary', null, mockGlobalPreferences, 'email')).toBe(false) // email_trip_updates

      expect(getEffectivePreference('expenses', null, mockGlobalPreferences, 'email')).toBe(true) // email_expense_updates

      expect(getEffectivePreference('photos', null, mockGlobalPreferences, 'email')).toBe(false) // email_trip_updates (same as itinerary)

      expect(getEffectivePreference('chat', null, mockGlobalPreferences, 'email')).toBe(false) // email_trip_updates (same as itinerary)

      expect(getEffectivePreference('settlements', null, mockGlobalPreferences, 'email')).toBe(true) // email_expense_updates (same as expenses)
    })

    it('should map event types to correct global push keys', () => {
      expect(getEffectivePreference('invites', null, mockGlobalPreferences, 'push')).toBe(true) // push_trip_invites

      expect(getEffectivePreference('itinerary', null, mockGlobalPreferences, 'push')).toBe(true) // push_trip_updates

      expect(getEffectivePreference('expenses', null, mockGlobalPreferences, 'push')).toBe(false) // push_expense_updates

      expect(getEffectivePreference('photos', null, mockGlobalPreferences, 'push')).toBe(true) // push_trip_updates (same as itinerary)

      expect(getEffectivePreference('chat', null, mockGlobalPreferences, 'push')).toBe(true) // push_trip_updates (same as itinerary)

      expect(getEffectivePreference('settlements', null, mockGlobalPreferences, 'push')).toBe(false) // push_expense_updates (same as expenses)
    })
  })

  describe('shouldNotifyUser', () => {
    it('should be an alias for getEffectivePreference', () => {
      const tripPrefs: TripNotificationPreferences = {
        expenses: true,
      }
      expect(shouldNotifyUser('expenses', tripPrefs, mockGlobalPreferences, 'email')).toBe(
        getEffectivePreference('expenses', tripPrefs, mockGlobalPreferences, 'email')
      )
    })

    it('should return correct value for complex scenario', () => {
      const tripPrefs: TripNotificationPreferences = {
        invites: false, // Explicitly disabled
        expenses: null, // Inherit from global (true)
        itinerary: true, // Explicitly enabled
      }

      expect(shouldNotifyUser('invites', tripPrefs, mockGlobalPreferences, 'email')).toBe(false)
      expect(shouldNotifyUser('expenses', tripPrefs, mockGlobalPreferences, 'email')).toBe(true)
      expect(shouldNotifyUser('itinerary', tripPrefs, mockGlobalPreferences, 'email')).toBe(true)
    })
  })

  describe('getAllEffectivePreferences', () => {
    it('should return all event types with their effective preferences', () => {
      const tripPrefs: TripNotificationPreferences = {
        invites: false,
        expenses: true,
      }

      const result = getAllEffectivePreferences(tripPrefs, mockGlobalPreferences, 'email')

      expect(result).toEqual({
        invites: false, // Trip override
        itinerary: false, // Global
        expenses: true, // Trip override
        photos: false, // Global (email_trip_updates)
        chat: false, // Global (email_trip_updates)
        settlements: true, // Global (email_expense_updates)
      })
    })

    it('should return all inherited preferences when trip prefs is null', () => {
      const result = getAllEffectivePreferences(null, mockGlobalPreferences, 'email')

      expect(result).toEqual({
        invites: true, // Global
        itinerary: false, // Global
        expenses: true, // Global
        photos: false, // Global
        chat: false, // Global
        settlements: true, // Global
      })
    })

    it('should work for push channel', () => {
      const result = getAllEffectivePreferences(null, mockGlobalPreferences, 'push')

      expect(result).toEqual({
        invites: true, // Global push_trip_invites
        itinerary: true, // Global push_trip_updates
        expenses: false, // Global push_expense_updates
        photos: true, // Global push_trip_updates
        chat: true, // Global push_trip_updates
        settlements: false, // Global push_expense_updates
      })
    })
  })

  describe('isPreferenceInherited', () => {
    it('should return true when trip preferences is null', () => {
      expect(isPreferenceInherited('invites', null)).toBe(true)
    })

    it('should return true when trip preferences is undefined', () => {
      expect(isPreferenceInherited('invites', undefined)).toBe(true)
    })

    it('should return true when event type is not in trip preferences', () => {
      const tripPrefs: TripNotificationPreferences = {
        expenses: true,
      }
      expect(isPreferenceInherited('invites', tripPrefs)).toBe(true)
    })

    it('should return true when event type is explicitly null', () => {
      const tripPrefs: TripNotificationPreferences = {
        invites: null,
      }
      expect(isPreferenceInherited('invites', tripPrefs)).toBe(true)
    })

    it('should return false when event type is explicitly true', () => {
      const tripPrefs: TripNotificationPreferences = {
        invites: true,
      }
      expect(isPreferenceInherited('invites', tripPrefs)).toBe(false)
    })

    it('should return false when event type is explicitly false', () => {
      const tripPrefs: TripNotificationPreferences = {
        invites: false,
      }
      expect(isPreferenceInherited('invites', tripPrefs)).toBe(false)
    })
  })

  describe('getEventTypeLabel', () => {
    it('should return correct labels for all event types', () => {
      const eventTypes: NotificationEventType[] = [
        'invites',
        'itinerary',
        'expenses',
        'photos',
        'chat',
        'settlements',
      ]

      eventTypes.forEach(eventType => {
        const label = getEventTypeLabel(eventType)
        expect(label).toBeTruthy()
        expect(typeof label).toBe('string')
        expect(label.length).toBeGreaterThan(0)
      })

      expect(getEventTypeLabel('invites')).toBe('Trip invitations')
      expect(getEventTypeLabel('itinerary')).toBe('Itinerary changes')
      expect(getEventTypeLabel('expenses')).toBe('Expense updates')
      expect(getEventTypeLabel('photos')).toBe('Photo uploads')
      expect(getEventTypeLabel('chat')).toBe('Chat messages')
      expect(getEventTypeLabel('settlements')).toBe('Settlement updates')
    })
  })

  describe('getEventTypeDescription', () => {
    it('should return correct descriptions for all event types', () => {
      const eventTypes: NotificationEventType[] = [
        'invites',
        'itinerary',
        'expenses',
        'photos',
        'chat',
        'settlements',
      ]

      eventTypes.forEach(eventType => {
        const description = getEventTypeDescription(eventType)
        expect(description).toBeTruthy()
        expect(typeof description).toBe('string')
        expect(description.length).toBeGreaterThan(0)
      })

      expect(getEventTypeDescription('invites')).toContain('invite')
      expect(getEventTypeDescription('itinerary')).toContain('flights')
      expect(getEventTypeDescription('expenses')).toContain('expense')
      expect(getEventTypeDescription('photos')).toContain('photo')
      expect(getEventTypeDescription('chat')).toContain('message')
      expect(getEventTypeDescription('settlements')).toContain('settlement')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty global preferences gracefully', () => {
      const emptyGlobal: GlobalNotificationPreferences = {}
      const tripPrefs: TripNotificationPreferences = {
        invites: true,
      }

      expect(getEffectivePreference('invites', tripPrefs, emptyGlobal, 'email')).toBe(true)
      expect(getEffectivePreference('expenses', null, emptyGlobal, 'email')).toBe(false)
    })

    it('should handle mixed null and boolean values in trip preferences', () => {
      const tripPrefs: TripNotificationPreferences = {
        invites: true,
        itinerary: false,
        expenses: null,
        photos: undefined,
      }

      expect(getEffectivePreference('invites', tripPrefs, mockGlobalPreferences, 'email')).toBe(
        true
      )
      expect(getEffectivePreference('itinerary', tripPrefs, mockGlobalPreferences, 'email')).toBe(
        false
      )
      expect(getEffectivePreference('expenses', tripPrefs, mockGlobalPreferences, 'email')).toBe(
        true
      ) // Inherited
      expect(getEffectivePreference('photos', tripPrefs, mockGlobalPreferences, 'email')).toBe(
        false
      ) // Inherited
    })

    it('should handle all possible combinations of preferences', () => {
      const testCases = [
        {
          trip: { invites: true },
          global: true,
          expected: true,
          desc: 'trip true, global true',
        },
        {
          trip: { invites: true },
          global: false,
          expected: true,
          desc: 'trip true, global false',
        },
        {
          trip: { invites: false },
          global: true,
          expected: false,
          desc: 'trip false, global true',
        },
        {
          trip: { invites: false },
          global: false,
          expected: false,
          desc: 'trip false, global false',
        },
        {
          trip: { invites: null },
          global: true,
          expected: true,
          desc: 'trip null, global true',
        },
        {
          trip: { invites: null },
          global: false,
          expected: false,
          desc: 'trip null, global false',
        },
      ]

      testCases.forEach(({ trip, global, expected }) => {
        const globalPrefs: GlobalNotificationPreferences = {
          email_trip_invites: global,
        }
        expect(getEffectivePreference('invites', trip, globalPrefs, 'email')).toBe(expected)
      })
    })
  })
})
