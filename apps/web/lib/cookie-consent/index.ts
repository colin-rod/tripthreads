import type { CookieConsent } from './types'

export const COOKIE_CONSENT_VERSION = 1
export const COOKIE_CONSENT_KEY = 'tripthreads-cookie-consent'

// Get consent from localStorage
export function getCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null

  const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
  if (!stored) return null

  try {
    const consent = JSON.parse(stored) as CookieConsent

    // Check if version is outdated
    if (consent.version !== COOKIE_CONSENT_VERSION) {
      return null // Force re-consent
    }

    return consent
  } catch {
    return null
  }
}

// Save consent to localStorage and database
export async function saveCookieConsent(consent: CookieConsent): Promise<void> {
  if (typeof window === 'undefined') return

  // Save to localStorage
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent))

  // Sync to database (if authenticated)
  try {
    // Import dynamically to avoid circular dependencies
    const { updateProfile } = await import('@/app/actions/profile')
    await updateProfile({
      cookie_consent: consent,
      cookie_consent_updated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.warn('Failed to sync cookie consent to database:', error)
    // Don't block - localStorage is source of truth
  }
}

// Check if specific category is enabled
export function hasCookieConsent(
  category: keyof Omit<CookieConsent, 'timestamp' | 'version'>
): boolean {
  const consent = getCookieConsent()
  if (!consent) return false
  return consent[category]
}

// Initialize analytics based on consent
export function initializeAnalyticsFromConsent() {
  if (typeof window === 'undefined') return

  const consent = getCookieConsent()
  if (!consent) return // No consent yet

  // Check for DNT (Do Not Track)
  const dnt = navigator.doNotTrack === '1' || (window as any).doNotTrack === '1'
  if (dnt) {
    console.log('[Analytics] DNT detected, skipping analytics initialization')
    return
  }

  // Initialize PostHog only if analytics consent given
  if (consent.analytics && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    // PostHog will be initialized by PostHogProvider
    console.log('[Analytics] PostHog enabled via consent')
  }

  // Sentry is initialized globally, but we can disable replays
  if (!consent.functional) {
    // Disable Sentry session replay
    if ((window as any).Sentry) {
      ;(window as any).Sentry.getCurrentScope().setTag('replay', 'disabled')
      console.log('[Analytics] Sentry replay disabled via consent')
    }
  }

  // Vercel Analytics is passive and respects DNT
  // No action needed
}

// Export types for convenience
export type { CookieConsent, CookieCategory, CookieInfo } from './types'
