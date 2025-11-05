/**
 * Invite Acceptance Page
 *
 * Public page for accepting trip invitations.
 * Features:
 * - Display trip details
 * - Show inviter information
 * - Accept/decline buttons
 * - Auth redirect for non-logged-in users
 * - Handle already-member state
 * - Handle invalid/expired tokens
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getInviteWithDetails } from '@tripthreads/shared'
import { InviteAcceptanceCard } from '@/components/features/invites/InviteAcceptanceCard'

interface InvitePageProps {
  params: {
    token: string
  }
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = params
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get invite details
  const inviteDetails = await getInviteWithDetails(supabase, token)

  // If no invite found, redirect to error page
  if (!inviteDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="rounded-full bg-destructive/10 p-6 mx-auto w-fit">
            <svg
              className="h-12 w-12 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Invite Not Found</h1>
          <p className="text-muted-foreground">
            This invite link is no longer valid. It may have been revoked or expired.
          </p>
          <a href="/trips" className="inline-block text-primary hover:underline">
            View Your Trips
          </a>
        </div>
      </div>
    )
  }

  // If user is not authenticated, redirect to login with return URL
  if (!user) {
    redirect(`/login?redirect=/invite/${token}`)
  }

  // Check if user is already a participant
  const { data: existingParticipant } = await supabase
    .from('trip_participants')
    .select('id, role')
    .eq('trip_id', inviteDetails.trip.id)
    .eq('user_id', user.id)
    .single()

  if (existingParticipant) {
    // User is already a member - redirect to trip
    redirect(`/trips/${inviteDetails.trip.id}`)
  }

  // Render acceptance card
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <InviteAcceptanceCard inviteDetails={inviteDetails} token={token} />
    </div>
  )
}
