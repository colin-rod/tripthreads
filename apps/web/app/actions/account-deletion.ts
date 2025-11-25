/**
 * Account Deletion Server Actions (GDPR Compliance)
 *
 * Handles user account deletion with proper data anonymization.
 * Implements GDPR "Right to Erasure" (Article 17).
 *
 * Process:
 * 1. Verify user password
 * 2. Check trip ownership and handle transfer/deletion
 * 3. Anonymize profile data (soft delete)
 * 4. Delete user-specific records
 * 5. Delete avatar from storage
 * 6. Sign out user
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { deleteAccountSchema } from '@tripthreads/core/validation/profile'

interface OwnedTrip {
  trip_id: string
  trip_name: string
  participant_count: number
  can_transfer: boolean
  oldest_participant_id: string | null
  oldest_participant_name: string | null
}

interface AccountDeletionResult {
  success: boolean
  message: string
  tripsDeleted?: number
  tripsTransferred?: number
}

/**
 * Get owned trips that will be affected by account deletion
 *
 * Returns list of trips owned by user with transfer options
 *
 * @returns Array of owned trips with metadata
 */
export async function getOwnedTripsForDeletion(): Promise<OwnedTrip[]> {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    throw new Error('Not authenticated')
  }

  // Call database function to get owned trips
  const { data, error } = await supabase.rpc(
    // @ts-expect-error - Function added in migration 20251124000002, types will be generated after migration
    'get_owned_trips_for_deletion',
    {
      p_user_id: authUser.id,
    }
  )

  if (error) {
    console.error('Error fetching owned trips:', error)
    throw new Error('Failed to fetch owned trips')
  }

  return (data as unknown as OwnedTrip[]) || []
}

/**
 * Delete user account with proper anonymization
 *
 * Verifies password, handles trip ownership, anonymizes data, and signs out user.
 *
 * @param currentPassword - Current password for verification
 * @param confirmDeletion - User confirmation (must be true)
 * @param tripDeletionStrategy - 'transfer' or 'delete' for owned trips
 * @returns Deletion result with stats
 */
export async function deleteAccount(
  currentPassword: string,
  confirmDeletion: boolean,
  tripDeletionStrategy: 'transfer' | 'delete' = 'transfer'
): Promise<AccountDeletionResult> {
  // Validate input
  const validation = deleteAccountSchema.safeParse({
    currentPassword,
    confirmDeletion,
    tripDeletionStrategy,
  })

  if (!validation.success) {
    throw new Error(validation.error.errors[0].message)
  }

  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    throw new Error('Not authenticated')
  }

  // CRITICAL: Verify current password before deletion
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: authUser.email!,
    password: currentPassword,
  })

  if (signInError) {
    throw new Error('Current password is incorrect')
  }

  // Delete avatar from storage before anonymizing account
  try {
    const { data: existingFiles } = await supabase.storage.from('avatars').list(authUser.id)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${authUser.id}/${f.name}`)
      await supabase.storage.from('avatars').remove(filesToDelete)
    }
  } catch (error) {
    // Log error but don't fail deletion if avatar deletion fails
    console.error('Error deleting avatar during account deletion:', error)
  }

  // Call database function to anonymize account
  // This handles: profile anonymization, trip ownership transfer/deletion, and hard deletes
  const { data: deletionResult, error: deletionError } = await supabase.rpc(
    // @ts-expect-error - Function added in migration 20251124000002, types will be generated after migration
    'anonymize_user_account',
    {
      p_user_id: authUser.id,
      p_trip_deletion_strategy: tripDeletionStrategy,
    }
  )

  if (deletionError) {
    console.error('Error anonymizing account:', deletionError)
    throw new Error('Failed to delete account. Please try again or contact support.')
  }

  // Parse result
  const result = deletionResult as unknown as {
    success: boolean
    message: string
    tripsDeleted: number
    tripsTransferred: number
  }

  // Sign out user (this will redirect to login page)
  await supabase.auth.signOut()

  // Revalidate all paths to clear cached data
  revalidatePath('/', 'layout')

  return {
    success: result.success,
    message: result.message,
    tripsDeleted: result.tripsDeleted,
    tripsTransferred: result.tripsTransferred,
  }
}

/**
 * Check if user can delete their account
 *
 * Checks for any blockers that would prevent account deletion
 * (Currently no blockers, but reserved for future use)
 *
 * @returns Object with canDelete flag and optional reason
 */
export async function canDeleteAccount(): Promise<{
  canDelete: boolean
  reason?: string
}> {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return {
      canDelete: false,
      reason: 'Not authenticated',
    }
  }

  // Check if user is already deleted
  // Note: is_deleted field added in migration 20251124000002
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (profile && (profile as any).is_deleted) {
    return {
      canDelete: false,
      reason: 'Account is already deleted',
    }
  }

  // No blockers - user can delete their account
  return {
    canDelete: true,
  }
}
