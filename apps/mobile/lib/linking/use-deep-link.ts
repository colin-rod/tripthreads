import { useEffect, useState } from 'react'
import { useRouter, useSegments } from 'expo-router'
import * as Linking from 'expo-linking'
import { parseDeepLink, getRouteFromDeepLink, getInitialDeepLink } from './deep-link-parser'
import { useAuth } from '../auth/auth-context'

/**
 * Hook that handles deep linking throughout the app lifecycle
 * Handles both:
 * 1. Initial URL when app is launched from a link
 * 2. URLs that come in while the app is running
 */
export function useDeepLink() {
  const router = useRouter()
  const segments = useSegments()
  const { user, loading: authLoading } = useAuth()
  const [isProcessingLink, setIsProcessingLink] = useState(false)

  // Handle deep link navigation
  const handleDeepLink = async (url: string) => {
    if (!url || isProcessingLink) return

    setIsProcessingLink(true)

    try {
      const parsedLink = parseDeepLink(url)

      // Don't navigate if we're already on this route
      const targetRoute = getRouteFromDeepLink(parsedLink)
      const currentPath = `/${segments.join('/')}`

      if (currentPath === targetRoute) {
        setIsProcessingLink(false)
        return
      }

      // Handle invite links - require auth
      if (parsedLink.type === 'invite') {
        if (!user && !authLoading) {
          // User not authenticated - redirect to login with invite token
          router.replace({
            pathname: '/login',
            params: {
              redirect: targetRoute,
            },
          })
        } else if (user) {
          // User authenticated - navigate to invite screen
          router.push(targetRoute)
        }
        // If authLoading, wait for auth state to resolve
      }

      // Handle trip links - require auth
      else if (parsedLink.type === 'trip') {
        if (!user && !authLoading) {
          // User not authenticated - redirect to login with trip ID
          router.replace({
            pathname: '/login',
            params: {
              redirect: targetRoute,
            },
          })
        } else if (user) {
          // User authenticated - navigate to trip
          router.push(targetRoute)
        }
        // If authLoading, wait for auth state to resolve
      }

      // Unknown link type - navigate to home
      else {
        router.replace('/')
      }
    } catch (error) {
      console.error('Error handling deep link:', error)
      router.replace('/')
    } finally {
      setIsProcessingLink(false)
    }
  }

  // Handle initial URL when app launches
  useEffect(() => {
    if (authLoading) return // Wait for auth to initialize

    getInitialDeepLink().then(url => {
      if (url) {
        handleDeepLink(url)
      }
    })
  }, [authLoading])

  // Listen for new URLs while app is running
  useEffect(() => {
    const subscription = Linking.addEventListener('url', event => {
      handleDeepLink(event.url)
    })

    return () => {
      subscription.remove()
    }
  }, [user, authLoading, segments])

  return {
    isProcessingLink,
  }
}
