/**
 * Role Check Utilities
 *
 * Utility functions for checking user roles and permissions within trips.
 * Used throughout the app to enable/disable UI elements and show appropriate messages.
 */

export type TripRole = 'owner' | 'participant' | 'viewer'

/**
 * Check if a user can edit content in a trip (itinerary, expenses, invites)
 */
export function canEditTrip(role?: TripRole): boolean {
  return role === 'owner' || role === 'participant'
}

/**
 * Check if a user is the trip owner
 */
export function isOwner(role?: TripRole): boolean {
  return role === 'owner'
}

/**
 * Check if a user is a viewer (read-only access)
 */
export function isViewer(role?: TripRole): boolean {
  return role === 'viewer'
}

/**
 * Check if a user can view expenses
 * Viewers cannot see expenses (as per permission matrix)
 */
export function canViewExpenses(role?: TripRole): boolean {
  return role === 'owner' || role === 'participant'
}

/**
 * Check if a user can invite others to the trip
 * Only owners can send invites
 */
export function canInviteOthers(role?: TripRole): boolean {
  return role === 'owner'
}

/**
 * Get a human-readable label for a role
 */
export function getRoleLabel(role?: TripRole): string {
  switch (role) {
    case 'owner':
      return 'Organizer'
    case 'participant':
      return 'Participant'
    case 'viewer':
      return 'Viewer'
    default:
      return 'Unknown'
  }
}

/**
 * Get a description of what a role can do
 */
export function getRoleDescription(role?: TripRole): string {
  switch (role) {
    case 'owner':
      return 'Full access to all trip features including invites and settings'
    case 'participant':
      return 'Can view and edit itinerary, add expenses, and upload photos'
    case 'viewer':
      return 'Can view itinerary and photos but cannot make changes'
    default:
      return ''
  }
}

/**
 * Get tooltip message for disabled edit actions (for viewers)
 */
export function getViewerTooltip(action: string): string {
  return `Viewers can't ${action}`
}
