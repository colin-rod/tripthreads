import * as Linking from 'expo-linking'

export type DeepLinkType = 'invite' | 'trip' | 'unknown'

export interface ParsedDeepLink {
  type: DeepLinkType
  token?: string // For invite links
  tripId?: string // For trip links
  redirectPath?: string // For auth redirects
}

/**
 * Parses a deep link URL and extracts relevant information
 * Handles both custom scheme (tripthreads://) and universal links (https://tripthreads.app)
 */
export function parseDeepLink(url: string): ParsedDeepLink {
  // Handle empty or invalid URLs early
  if (!url || url.trim() === '') {
    return { type: 'unknown' }
  }

  try {
    const parsed = Linking.parse(url)
    const { path, queryParams } = parsed

    // Handle invite links: tripthreads://invite/TOKEN or https://tripthreads.app/invite/TOKEN
    if (path?.includes('/invite/')) {
      const token = path.split('/invite/')[1]?.split('?')[0]?.replace(/\/$/, '')
      if (token) {
        return {
          type: 'invite',
          token,
          redirectPath: queryParams?.redirect as string | undefined,
        }
      }
    }

    // Handle trip links: tripthreads://trips/ID or https://tripthreads.app/trips/ID
    if (path?.includes('/trips/')) {
      const tripId = path.split('/trips/')[1]?.split('?')[0]?.replace(/\/$/, '')
      if (tripId) {
        return {
          type: 'trip',
          tripId,
        }
      }
    }

    // Unknown link type
    return { type: 'unknown' }
  } catch (error) {
    // Only log non-validation errors
    if (!(error instanceof Error && error.message.includes('Invalid URL'))) {
      console.error('Error parsing deep link:', error)
    }
    return { type: 'unknown' }
  }
}

/**
 * Constructs an Expo Router path from a parsed deep link
 */
export function getRouteFromDeepLink(parsedLink: ParsedDeepLink): string {
  switch (parsedLink.type) {
    case 'invite':
      return `/invite/${parsedLink.token}`
    case 'trip':
      return `/trips/${parsedLink.tripId}`
    default:
      return '/' // Fallback to home
  }
}

/**
 * Gets the initial deep link URL when the app is launched
 */
export async function getInitialDeepLink(): Promise<string | null> {
  try {
    const url = await Linking.getInitialURL()
    return url
  } catch (error) {
    console.error('Error getting initial deep link:', error)
    return null
  }
}
