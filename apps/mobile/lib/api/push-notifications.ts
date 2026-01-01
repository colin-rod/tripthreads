/**
 * Push Notification API Functions (Mobile)
 *
 * Functions for managing push tokens from mobile app
 * Phase 4: Push Notifications
 */

import { supabase } from '../supabase'

/**
 * Update push token in database
 *
 * @param platform - Platform (web or mobile)
 * @param token - Push token string
 * @returns Success status
 */
export async function updatePushToken(
  platform: 'web' | 'mobile',
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Determine column names
    const tokenColumn = platform === 'web' ? 'push_token_web' : 'push_token_mobile'
    const timestampColumn = `${tokenColumn}_updated_at`

    // Update profile with push token
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        [tokenColumn]: token,
        [timestampColumn]: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating push token:', updateError)
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error updating push token:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Clear push token from database
 *
 * @param platform - Platform (web or mobile)
 * @returns Success status
 */
export async function clearPushToken(
  platform: 'web' | 'mobile'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Determine column names
    const tokenColumn = platform === 'web' ? 'push_token_web' : 'push_token_mobile'
    const timestampColumn = `${tokenColumn}_updated_at`

    // Clear push token
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        [tokenColumn]: null,
        [timestampColumn]: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error clearing push token:', updateError)
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error clearing push token:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
