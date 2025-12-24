/**
 * Rate Limiting Utilities
 *
 * Database-based rate limiting system to prevent abuse across critical endpoints.
 * Uses Supabase database with atomic increment operations for accurate counting.
 *
 * Rate Limits:
 * - Expenses: 50 per hour per trip
 * - Chat messages: 30 per minute per user
 * - Photo uploads: 10 per hour per user
 * - Access requests: 5 per hour per trip
 * - API calls: 100 per minute per user
 */

import { createClient } from '@/lib/supabase/server'

export type RateLimitResource =
  | 'expense'
  | 'chat_message'
  | 'photo_upload'
  | 'api_call'
  | 'access_request'

export interface RateLimitConfig {
  limit: number
  windowMinutes: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

// Rate limit configurations
const RATE_LIMITS: Record<RateLimitResource, RateLimitConfig> = {
  expense: { limit: 50, windowMinutes: 60 },
  chat_message: { limit: 30, windowMinutes: 1 },
  photo_upload: { limit: 10, windowMinutes: 60 },
  api_call: { limit: 100, windowMinutes: 1 },
  access_request: { limit: 5, windowMinutes: 60 },
}

/**
 * Check and enforce rate limit for a specific resource
 *
 * @param userId - User ID to check rate limit for
 * @param resourceType - Type of resource being rate limited
 * @param resourceKey - Unique identifier for the resource (e.g., trip_id or endpoint)
 * @returns RateLimitResult with allowed status, remaining requests, and reset time
 *
 * @example
 * ```typescript
 * const result = await checkRateLimit(userId, 'expense', tripId);
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: 'Rate limit exceeded. Try again later.' },
 *     { status: 429 }
 *   );
 * }
 * ```
 */
export async function checkRateLimit(
  userId: string,
  resourceType: RateLimitResource,
  resourceKey: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[resourceType]
  const supabase = await createClient()

  // Calculate window start time
  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setMinutes(
    Math.floor(windowStart.getMinutes() / config.windowMinutes) * config.windowMinutes,
    0,
    0
  )

  // Calculate reset time (end of current window)
  const resetAt = new Date(windowStart)
  resetAt.setMinutes(resetAt.getMinutes() + config.windowMinutes)

  try {
    // Call the database RPC function to atomically check and increment
    const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
      p_user_id: userId,
      p_resource_type: resourceType,
      p_resource_key: resourceKey,
      p_window_start: windowStart.toISOString(),
      p_limit: config.limit,
    })

    if (error) {
      console.error('[Rate Limit] Database error:', error)
      // On error, fail open (allow the request) to prevent blocking legitimate users
      // but log the error for investigation
      return {
        allowed: true,
        remaining: config.limit,
        resetAt,
      }
    }

    const result = Array.isArray(data) ? data[0] : data

    return {
      allowed: result.allowed,
      remaining: Math.max(0, config.limit - result.current_count),
      resetAt,
    }
  } catch (error) {
    console.error('[Rate Limit] Unexpected error:', error)
    // Fail open on unexpected errors
    return {
      allowed: true,
      remaining: config.limit,
      resetAt,
    }
  }
}

/**
 * Get the current rate limit status without incrementing
 *
 * @param userId - User ID to check
 * @param resourceType - Type of resource
 * @param resourceKey - Resource identifier
 * @returns Current rate limit status
 */
export async function getRateLimitStatus(
  userId: string,
  resourceType: RateLimitResource,
  resourceKey: string
): Promise<{ current: number; limit: number; resetAt: Date }> {
  const config = RATE_LIMITS[resourceType]
  const supabase = await createClient()

  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setMinutes(
    Math.floor(windowStart.getMinutes() / config.windowMinutes) * config.windowMinutes,
    0,
    0
  )

  const resetAt = new Date(windowStart)
  resetAt.setMinutes(resetAt.getMinutes() + config.windowMinutes)

  try {
    const { data, error } = await supabase
      .from('rate_limits')
      .select('request_count')
      .eq('user_id', userId)
      .eq('resource_type', resourceType)
      .eq('resource_key', resourceKey)
      .eq('window_start', windowStart.toISOString())
      .single()

    if (error || !data) {
      return { current: 0, limit: config.limit, resetAt }
    }

    return {
      current: data.request_count,
      limit: config.limit,
      resetAt,
    }
  } catch (error) {
    console.error('[Rate Limit] Error getting status:', error)
    return { current: 0, limit: config.limit, resetAt }
  }
}

/**
 * Create rate limit error response with proper headers
 *
 * @param result - Rate limit result
 * @returns Response object with 429 status and rate limit headers
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      resetAt: result.resetAt.toISOString(),
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit':
          RATE_LIMITS[Object.keys(RATE_LIMITS)[0] as RateLimitResource].limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetAt.toISOString(),
      },
    }
  )
}
