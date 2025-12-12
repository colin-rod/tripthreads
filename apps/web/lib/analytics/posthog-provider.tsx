'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [posthogInitialized, setPosthogInitialized] = useState(false)

  useEffect(() => {
    // Initialize PostHog with dynamic import
    if (typeof window !== 'undefined') {
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

      // Only initialize if key is provided
      if (posthogKey && !posthogInitialized) {
        // Dynamic import to reduce bundle size when analytics is disabled
        import('posthog-js')
          .then(({ default: posthog }) => {
            posthog.init(posthogKey, {
              api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
              loaded: posthog => {
                if (process.env.NODE_ENV === 'development') {
                  posthog.debug()
                }
              },
              capture_pageview: false, // We'll manually capture page views
              capture_pageleave: true, // Automatically capture when users leave
            })

            // Make available globally for the wrapper
            ;(window as any).posthog = posthog
            setPosthogInitialized(true)
          })
          .catch(error => {
            console.error('Failed to load PostHog:', error)
          })
      }
    }
  }, [posthogInitialized])

  // Identify user when authenticated
  useEffect(() => {
    if (posthogInitialized && typeof window !== 'undefined' && (window as any).posthog) {
      const posthog = (window as any).posthog
      if (user) {
        posthog.identify(user.id, {
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
          plan: 'free', // TODO: Update when Pro tier implemented
        })
      } else {
        // Reset when user logs out
        posthog.reset()
      }
    }
  }, [user, posthogInitialized])

  return <>{children}</>
}
