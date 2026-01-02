/**
 * Server Actions for Push Notifications
 *
 * Handles:
 * - Saving push tokens to database
 * - Clearing push tokens
 * - Fetching push token status
 *
 * Phase 4: Push Notifications
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Update push token for current user
 *
 * @param platform - Platform (web or mobile)
 * @param token - Push token/subscription (string)
 * @returns Success status
 */
export async function updatePushToken(
  platform: 'web' | 'mobile',
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

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

    // Revalidate settings page
    revalidatePath('/settings')

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
 * Clear push token for current user
 *
 * @param platform - Platform (web or mobile)
 * @returns Success status
 */
export async function clearPushToken(
  platform: 'web' | 'mobile'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

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

    // Revalidate settings page
    revalidatePath('/settings')

    return { success: true }
  } catch (error) {
    console.error('Unexpected error clearing push token:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get push token status for current user
 *
 * @returns Push token status (has web token, has mobile token)
 */
export async function getPushTokenStatus(): Promise<{
  hasWebToken: boolean
  hasMobileToken: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { hasWebToken: false, hasMobileToken: false, error: 'Not authenticated' }
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('push_token_web, push_token_mobile')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching push token status:', profileError)
      return {
        hasWebToken: false,
        hasMobileToken: false,
        error: profileError.message,
      }
    }

    return {
      hasWebToken: !!profile.push_token_web,
      hasMobileToken: !!profile.push_token_mobile,
    }
  } catch (error) {
    console.error('Unexpected error fetching push token status:', error)
    return {
      hasWebToken: false,
      hasMobileToken: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
