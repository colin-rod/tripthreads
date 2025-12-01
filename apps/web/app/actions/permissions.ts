'use server'

/**
 * Permissions Server Actions
 *
 * Server actions for handling permission-related operations:
 * - Requesting edit access (viewer → participant)
 * - Approving/rejecting access requests
 * - Upgrading user roles
 *
 * NOTE: These functions require the access_requests table which is not yet implemented.
 * Stub implementations are provided to avoid build errors.
 */

/**
 * Request edit access for a trip (viewer requests to become participant)
 * TODO: Implement access_requests table before enabling this function
 */
export async function requestEditAccess(_tripId: string) {
  throw new Error('Access request feature is not yet implemented')
}

/**
 * Approve an access request and upgrade user to participant
 * TODO: Implement access_requests table before enabling this function
 */
export async function approveAccessRequest(_requestId: string) {
  throw new Error('Access request feature is not yet implemented')
}

/**
 * Reject an access request
 * TODO: Implement access_requests table before enabling this function
 */
export async function rejectAccessRequest(_requestId: string) {
  throw new Error('Access request feature is not yet implemented')
}
