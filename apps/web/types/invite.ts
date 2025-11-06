/**
 * Invite types for trip invitations
 *
 * Supports both shareable links and email invitations
 */

export type InviteRole = 'participant' | 'viewer'
export type InviteType = 'link' | 'email'
export type InviteStatus = 'pending' | 'accepted' | 'revoked'

/**
 * Trip invite record from database
 */
export interface TripInvite {
  id: string
  trip_id: string
  token: string
  email: string | null
  invited_by: string
  role: InviteRole
  invite_type: InviteType
  status: InviteStatus
  use_count: number
  created_at: string
  accepted_at: string | null
}

/**
 * Invite with populated trip and inviter details
 * Used for acceptance page
 */
export interface InviteWithDetails {
  invite: {
    id: string
    token: string
    role: InviteRole
    invite_type: InviteType
    status: InviteStatus
    created_at: string
  }
  trip: {
    id: string
    name: string
    start_date: string
    end_date: string
    cover_image_url: string | null
    description: string | null
  }
  inviter: {
    id: string
    full_name: string
    avatar_url: string | null
  }
}

/**
 * Input for creating a shareable link invite
 */
export interface CreateInviteLinkInput {
  trip_id: string
  role: InviteRole
}

/**
 * Input for creating an email invite
 */
export interface CreateEmailInviteInput {
  trip_id: string
  email: string
  role: InviteRole
}

/**
 * Input for accepting an invite
 */
export interface AcceptInviteInput {
  token: string
}

/**
 * Result of creating an invite link
 */
export interface InviteLinkResult {
  invite: TripInvite
  url: string
}

/**
 * Result of accepting an invite
 */
export interface AcceptInviteResult {
  trip_id: string
  participant_id: string
  role: InviteRole
}
