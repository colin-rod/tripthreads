'use client'

/**
 * ProfileCompletionProvider Component
 *
 * Checks if user profile needs completion and shows modal.
 * Should be placed in authenticated app layout.
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser, isProfileComplete } from '@shared/lib/supabase/queries/users'
import { ProfileCompletionModal } from './ProfileCompletionModal'

export function ProfileCompletionProvider() {
  const [showModal, setShowModal] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [existingName, setExistingName] = useState<string | null>(null)
  const [existingAvatar, setExistingAvatar] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    async function checkProfileCompletion() {
      try {
        const supabase = createClient()

        // Check if user is authenticated
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          setIsChecking(false)
          return
        }

        // Get user profile
        const user = await getCurrentUser(supabase)

        if (!user) {
          setIsChecking(false)
          return
        }

        // Check if profile is complete
        const complete = await isProfileComplete(supabase)

        if (!complete) {
          setUserEmail(authUser.email || '')
          setExistingName(user.full_name)
          setExistingAvatar(user.avatar_url)
          setShowModal(true)
        }
      } catch (error) {
        console.error('Error checking profile completion:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkProfileCompletion()
  }, [])

  if (isChecking) {
    return null
  }

  return (
    <ProfileCompletionModal
      open={showModal}
      onOpenChange={setShowModal}
      userEmail={userEmail}
      existingName={existingName}
      existingAvatar={existingAvatar}
    />
  )
}
