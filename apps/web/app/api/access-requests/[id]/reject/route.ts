/**
 * API Route: Reject Access Request
 *
 * Handles email link clicks to reject access requests.
 * Redirects to the trip page after rejection.
 *
 * NOTE: This feature requires the access_requests table which is not yet implemented.
 * Stub implementation provided to avoid build errors.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, _context: { params: Promise<{ id: string }> }) {
  return NextResponse.redirect(
    new URL('/error?message=Access request feature is not yet implemented', request.url)
  )
}
