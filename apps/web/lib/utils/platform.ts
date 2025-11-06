/**
 * Platform Detection Utilities
 *
 * Detects user's platform (web, mobile, tablet) for responsive experiences.
 */

/**
 * Check if user is on mobile device
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false

  // Check user agent
  const userAgent = window.navigator.userAgent.toLowerCase()
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i

  // Check screen size as fallback
  const isMobileWidth = window.innerWidth < 768

  return mobileRegex.test(userAgent) || isMobileWidth
}

/**
 * Check if user is on tablet
 */
export function isTablet(): boolean {
  if (typeof window === 'undefined') return false

  const userAgent = window.navigator.userAgent.toLowerCase()
  const tabletRegex = /ipad|tablet|playbook|silk/i

  const isTabletWidth = window.innerWidth >= 768 && window.innerWidth < 1024

  return tabletRegex.test(userAgent) || isTabletWidth
}

/**
 * Check if user is on desktop/web
 */
export function isDesktop(): boolean {
  return !isMobile() && !isTablet()
}

/**
 * Get platform type
 */
export type Platform = 'mobile' | 'tablet' | 'desktop'

export function getPlatform(): Platform {
  if (isMobile()) return 'mobile'
  if (isTablet()) return 'tablet'
  return 'desktop'
}

/**
 * Check if touch device
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - legacy property
    navigator.msMaxTouchPoints > 0
  )
}
