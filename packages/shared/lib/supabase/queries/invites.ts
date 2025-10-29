/**
 * Invite queries and mutations
 *
 * Handles:
 * - Creating shareable link invites
 * - Creating email invites
 * - Accepting invites
 * - Revoking invites
 * - Resending email invites
 * - Fetching invite details
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/supabase'
import type {
  TripInvite,
  InviteWithDetails,
  InviteLinkResult,
  AcceptInviteResult,
} from '../../types/invite'

type InviteRow = Database['public']['Tables']['trip_invites']['Row']
type InviteInsert = Database['public']['Tables']['trip_invites']['Insert']
type TripParticipantInsert = Database['public']['Tables']['trip_participants']['Insert']

/**
 * Generate the full invite URL for a token
 *
 * @param token - Invite token
 * @param baseUrl - Base URL (e.g., https://tripthreads.com)
 * @returns Full invite URL
 */
export function getInviteUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/invite/${token}`
}

/**
 * Create a shareable link invite
 *
 * @param supabase - Supabase client
 * @param tripId - Trip ID
 * @param role - Role to grant (participant or viewer)
 * @returns Invite link result with URL
 */
export async function createInviteLink(
  supabase: SupabaseClient<Database>,
  tripId: string,
  role: 'participant' | 'viewer'
): Promise<InviteLinkResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Generate token
  const { data: token, error: tokenError } = await supabase.rpc('generate_invite_token')

  if (tokenError || !token) {
    console.error('Error generating invite token:', tokenError)
    throw new Error('Failed to generate invite token')
  }

  // Create invite record
  const inviteData: InviteInsert = {
    trip_id: tripId,
    token,
    invited_by: user.id,
    role,
    invite_type: 'link',
    status: 'pending',
  }

  const { data: invite, error } = await supabase
    .from('trip_invites')
    .insert(inviteData)
    .select()
    .single()

  if (error) {
    console.error('Error creating invite link:', error)
    throw new Error(error.message || 'Failed to create invite link')
  }

  const url = getInviteUrl(invite.token)

  return {
    invite: invite as TripInvite,
    url,
  }
}

/**
 * Create an email invite
 *
 * @param supabase - Supabase client
 * @param tripId - Trip ID
 * @param email - Recipient email address
 * @param role - Role to grant (participant or viewer)
 * @returns Created invite
 */
export async function createEmailInvite(
  supabase: SupabaseClient<Database>,
  tripId: string,
  email: string,
  role: 'participant' | 'viewer'
): Promise<TripInvite> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Generate token
  const { data: token, error: tokenError } = await supabase.rpc('generate_invite_token')

  if (tokenError || !token) {
    console.error('Error generating invite token:', tokenError)
    throw new Error('Failed to generate invite token')
  }

  // Create invite record
  const inviteData: InviteInsert = {
    trip_id: tripId,
    token,
    email: email.toLowerCase(),
    invited_by: user.id,
    role,
    invite_type: 'email',
    status: 'pending',
  }

  const { data: invite, error } = await supabase
    .from('trip_invites')
    .insert(inviteData)
    .select()
    .single()

  if (error) {
    console.error('Error creating email invite:', error)
    throw new Error(error.message || 'Failed to create email invite')
  }

  return invite as TripInvite
}

/**
 * Create multiple email invites in batch
 *
 * @param supabase - Supabase client
 * @param tripId - Trip ID
 * @param emails - Array of recipient email addresses
 * @param role - Role to grant (participant or viewer)
 * @returns Array of created invites
 */
export async function createBatchEmailInvites(
  supabase: SupabaseClient<Database>,
  tripId: string,
  emails: string[],
  role: 'participant' | 'viewer'
): Promise<TripInvite[]> {
  const invites: TripInvite[] = []

  // Create invites sequentially to handle rate limiting gracefully
  for (const email of emails) {
    try {
      const invite = await createEmailInvite(supabase, tripId, email, role)
      invites.push(invite)
    } catch (error) {
      console.error(`Failed to create invite for ${email}:`, error)
      // Continue with remaining emails
    }
  }

  return invites
}

/**
 * Get invite by token
 *
 * @param supabase - Supabase client
 * @param token - Invite token
 * @returns Invite or null if not found
 */
export async function getInviteByToken(
  supabase: SupabaseClient<Database>,
  token: string
): Promise<TripInvite | null> {
  const { data, error } = await supabase
    .from('trip_invites')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null
    }
    console.error('Error fetching invite:', error)
    throw new Error('Failed to fetch invite')
  }

  return data as TripInvite
}

/**
 * Get invite with trip and inviter details
 *
 * @param supabase - Supabase client
 * @param token - Invite token
 * @returns Invite with details or null if not found
 */
export async function getInviteWithDetails(
  supabase: SupabaseClient<Database>,
  token: string
): Promise<InviteWithDetails | null> {
  const { data, error } = await supabase.rpc('get_invite_with_trip_details', {
    p_token: token,
  })

  if (error) {
    console.error('Error fetching invite details:', error)
    return null
  }

  return data as InviteWithDetails
}

/**
 * Accept an invite
 *
 * Adds user to trip_participants and marks invite as accepted.
 * Increments use_count for link invites.
 *
 * @param supabase - Supabase client
 * @param token - Invite token
 * @returns Accept result with trip_id and participant_id
 */
export async function acceptInvite(
  supabase: SupabaseClient<Database>,
  token: string
): Promise<AcceptInviteResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Get invite
  const invite = await getInviteByToken(supabase, token)

  if (!invite) {
    throw new Error('Invite not found or no longer valid')
  }

  // Check if user is already a participant
  const { data: existingParticipant } = await supabase
    .from('trip_participants')
    .select('id')
    .eq('trip_id', invite.trip_id)
    .eq('user_id', user.id)
    .single()

  if (existingParticipant) {
    throw new Error('You are already a participant in this trip')
  }

  // Add user to trip_participants
  const participantData: TripParticipantInsert = {
    trip_id: invite.trip_id,
    user_id: user.id,
    role: invite.role,
    invited_by: invite.invited_by,
    joined_at: new Date().toISOString(),
  }

  const { data: participant, error: participantError } = await supabase
    .from('trip_participants')
    .insert(participantData)
    .select()
    .single()

  if (participantError) {
    console.error('Error adding participant:', participantError)
    throw new Error('Failed to join trip')
  }

  // Update invite status
  if (invite.invite_type === 'email') {
    // Email invites are one-time use - mark as accepted
    await supabase
      .from('trip_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        use_count: 1,
      })
      .eq('id', invite.id)
  } else {
    // Link invites are multi-use - increment use_count
    await supabase
      .from('trip_invites')
      .update({
        use_count: invite.use_count + 1,
      })
      .eq('id', invite.id)
  }

  return {
    trip_id: invite.trip_id,
    participant_id: participant.id,
    role: invite.role,
  }
}

/**
 * Revoke an invite
 *
 * @param supabase - Supabase client
 * @param inviteId - Invite ID
 */
export async function revokeInvite(
  supabase: SupabaseClient<Database>,
  inviteId: string
): Promise<void> {
  const { error } = await supabase
    .from('trip_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)

  if (error) {
    console.error('Error revoking invite:', error)
    throw new Error('Failed to revoke invite')
  }
}

/**
 * Get all invites for a trip
 *
 * @param supabase - Supabase client
 * @param tripId - Trip ID
 * @returns Array of invites
 */
export async function getTripInvites(
  supabase: SupabaseClient<Database>,
  tripId: string
): Promise<TripInvite[]> {
  const { data, error } = await supabase
    .from('trip_invites')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching trip invites:', error)
    throw new Error('Failed to fetch invites')
  }

  return data as InviteRow[] as TripInvite[]
}

/**
 * Resend an email invite
 *
 * Note: This will trigger the email sending logic (to be implemented in Phase 3)
 *
 * @param supabase - Supabase client
 * @param inviteId - Invite ID
 */
export async function resendEmailInvite(
  supabase: SupabaseClient<Database>,
  inviteId: string
): Promise<void> {
  // Get invite details
  const { data: invite, error } = await supabase
    .from('trip_invites')
    .select('*')
    .eq('id', inviteId)
    .eq('invite_type', 'email')
    .eq('status', 'pending')
    .single()

  if (error || !invite) {
    throw new Error('Invite not found or cannot be resent')
  }

  // TODO: Implement email sending logic in Phase 3
  // For now, just log
  console.log('Resending invite to:', invite.email)

  // In Phase 3, this will call an Edge Function or Supabase email service
  // Example:
  // await supabase.functions.invoke('send-invite-email', {
  //   body: { inviteId }
  // })
}
