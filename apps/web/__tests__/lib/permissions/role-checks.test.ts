/**
 * Unit Tests: Role Check Utilities
 *
 * Tests for permission checking functions used throughout the app.
 */

import {
  canEditTrip,
  isOwner,
  isViewer,
  canViewExpenses,
  canInviteOthers,
  getRoleLabel,
  getRoleDescription,
  getViewerTooltip,
} from '@/lib/permissions/role-checks'

describe('Role Check Utilities', () => {
  describe('canEditTrip', () => {
    it('allows owners to edit', () => {
      expect(canEditTrip('owner')).toBe(true)
    })

    it('allows participants to edit', () => {
      expect(canEditTrip('participant')).toBe(true)
    })

    it('prevents viewers from editing', () => {
      expect(canEditTrip('viewer')).toBe(false)
    })

    it('handles undefined role', () => {
      expect(canEditTrip(undefined)).toBe(false)
    })
  })

  describe('isOwner', () => {
    it('returns true for owner role', () => {
      expect(isOwner('owner')).toBe(true)
    })

    it('returns false for participant role', () => {
      expect(isOwner('participant')).toBe(false)
    })

    it('returns false for viewer role', () => {
      expect(isOwner('viewer')).toBe(false)
    })

    it('handles undefined role', () => {
      expect(isOwner(undefined)).toBe(false)
    })
  })

  describe('isViewer', () => {
    it('returns true for viewer role', () => {
      expect(isViewer('viewer')).toBe(true)
    })

    it('returns false for owner role', () => {
      expect(isViewer('owner')).toBe(false)
    })

    it('returns false for participant role', () => {
      expect(isViewer('participant')).toBe(false)
    })

    it('handles undefined role', () => {
      expect(isViewer(undefined)).toBe(false)
    })
  })

  describe('canViewExpenses', () => {
    it('allows owners to view expenses', () => {
      expect(canViewExpenses('owner')).toBe(true)
    })

    it('allows participants to view expenses', () => {
      expect(canViewExpenses('participant')).toBe(true)
    })

    it('prevents viewers from viewing expenses', () => {
      expect(canViewExpenses('viewer')).toBe(false)
    })

    it('handles undefined role', () => {
      expect(canViewExpenses(undefined)).toBe(false)
    })
  })

  describe('canInviteOthers', () => {
    it('allows only owners to invite', () => {
      expect(canInviteOthers('owner')).toBe(true)
    })

    it('prevents participants from inviting', () => {
      expect(canInviteOthers('participant')).toBe(false)
    })

    it('prevents viewers from inviting', () => {
      expect(canInviteOthers('viewer')).toBe(false)
    })

    it('handles undefined role', () => {
      expect(canInviteOthers(undefined)).toBe(false)
    })
  })

  describe('getRoleLabel', () => {
    it('returns "Organizer" for owner role', () => {
      expect(getRoleLabel('owner')).toBe('Organizer')
    })

    it('returns "Participant" for participant role', () => {
      expect(getRoleLabel('participant')).toBe('Participant')
    })

    it('returns "Viewer" for viewer role', () => {
      expect(getRoleLabel('viewer')).toBe('Viewer')
    })

    it('returns "Unknown" for undefined role', () => {
      expect(getRoleLabel(undefined)).toBe('Unknown')
    })
  })

  describe('getRoleDescription', () => {
    it('returns correct description for owner', () => {
      const description = getRoleDescription('owner')
      expect(description).toContain('Full access')
      expect(description).toContain('invites')
      expect(description).toContain('settings')
    })

    it('returns correct description for participant', () => {
      const description = getRoleDescription('participant')
      expect(description).toContain('edit itinerary')
      expect(description).toContain('add expenses')
      expect(description).toContain('upload photos')
    })

    it('returns correct description for viewer', () => {
      const description = getRoleDescription('viewer')
      expect(description).toContain('view')
      expect(description).toContain('cannot make changes')
    })

    it('returns empty string for undefined role', () => {
      expect(getRoleDescription(undefined)).toBe('')
    })
  })

  describe('getViewerTooltip', () => {
    it('generates correct tooltip for action', () => {
      expect(getViewerTooltip('edit itinerary')).toBe("Viewers can't edit itinerary")
    })

    it('generates correct tooltip for add action', () => {
      expect(getViewerTooltip('add expenses')).toBe("Viewers can't add expenses")
    })

    it('generates correct tooltip for delete action', () => {
      expect(getViewerTooltip('delete items')).toBe("Viewers can't delete items")
    })
  })
})
