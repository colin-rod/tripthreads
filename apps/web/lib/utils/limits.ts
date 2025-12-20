/**
 * Free Tier Limits and Tracking
 *
 * Defines limits for free tier users and provides utilities for checking and tracking limit hits.
 */

import { trackParticipantLimitReached, trackPhotoLimitReached } from '@/lib/analytics'

export const FREE_TIER_LIMITS = {
  PARTICIPANTS: 10,
  PHOTOS: 50,
} as const

/**
 * Check if participant limit is reached
 *
 * @param count - Current participant count
 * @param isPro - Whether user has Pro subscription
 * @returns True if limit is reached (and user should be blocked)
 */
export function checkParticipantLimit(count: number, isPro: boolean): boolean {
  return !isPro && count >= FREE_TIER_LIMITS.PARTICIPANTS
}

/**
 * Check if photo limit is reached
 *
 * @param count - Current photo count
 * @param isPro - Whether user has Pro subscription
 * @returns True if limit is reached (and user should be blocked)
 */
export function checkPhotoLimit(count: number, isPro: boolean): boolean {
  return !isPro && count >= FREE_TIER_LIMITS.PHOTOS
}

/**
 * Track and return participant limit hit
 *
 * Checks if limit is reached, tracks the event if so, and returns the result.
 *
 * @param params - Trip ID, current count, attempted action, and Pro status
 * @returns True if limit is reached
 */
export function handleParticipantLimit(params: {
  tripId: string
  currentCount: number
  attemptedAction: 'invite' | 'accept_request'
  isPro: boolean
}): boolean {
  const limitReached = checkParticipantLimit(params.currentCount, params.isPro)

  if (limitReached) {
    trackParticipantLimitReached({
      tripId: params.tripId,
      currentCount: params.currentCount,
      attemptedAction: params.attemptedAction,
    })
  }

  return limitReached
}

/**
 * Track and return photo limit hit
 *
 * Checks if limit is reached, tracks the event if so, and returns the result.
 *
 * @param params - Trip ID, current count, and Pro status
 * @returns True if limit is reached
 */
export function handlePhotoLimit(params: {
  tripId: string
  currentCount: number
  isPro: boolean
}): boolean {
  const limitReached = checkPhotoLimit(params.currentCount, params.isPro)

  if (limitReached) {
    trackPhotoLimitReached({
      tripId: params.tripId,
      currentCount: params.currentCount,
    })
  }

  return limitReached
}
