/**
 * Subscription Limit Enforcement Middleware
 *
 * Provides server-side limit checking for free tier users.
 * Works in conjunction with database RLS policies for defense-in-depth.
 *
 * Free Tier Limits:
 * - Trips: 1 active trip
 * - Participants: 5 per trip
 * - Photos: 25 total across all trips
 * - Videos: 0 (hard block, Pro feature only)
 *
 * Pro Tier Limits:
 * - Trips: Unlimited
 * - Participants: Unlimited
 * - Photos: Unlimited
 * - Videos: 10GB total storage, 100MB max file size
 *
 * @module lib/subscription/limits
 */

import { createClient } from '@/lib/supabase/server'

// ==========================================
// Types
// ==========================================

export interface LimitCheckResult {
  /** Whether the action is allowed */
  allowed: boolean
  /** Human-readable reason if not allowed */
  reason?: string
  /** Current count (e.g., current number of trips) */
  currentCount: number
  /** Limit for this user's plan */
  limit: number
  /** Whether user is on Pro plan */
  isProUser: boolean
}

export interface UserSubscriptionStatus {
  plan: 'free' | 'pro'
  isActive: boolean
  expiresAt: string | null
  isInGracePeriod: boolean
  gracePeriodEnd: string | null
}

// ==========================================
// Constants
// ==========================================

const FREE_TIER_LIMITS = {
  trips: 1,
  participants: 5,
  photos: 25,
  videos: 0, // Free users cannot upload videos
  videoStorageGB: 0, // Free users have no video storage
} as const

const PRO_TIER_LIMITS = {
  videoStorageGB: 10, // 10GB total video storage for Pro users
  maxVideoFileSizeMB: 100, // 100MB max file size per video
} as const

const ERROR_MESSAGES = {
  trips: `You've reached the free tier limit of ${FREE_TIER_LIMITS.trips} trip. Upgrade to Pro for unlimited trips.`,
  participants: `This trip has reached the free tier limit of ${FREE_TIER_LIMITS.participants} participants. Upgrade to Pro for unlimited participants.`,
  photos: `You've reached the free tier limit of ${FREE_TIER_LIMITS.photos} photos. Upgrade to Pro for unlimited photos.`,
  videos: 'Video uploads are a Pro feature. Upgrade to Pro to upload videos (10GB storage).',
  videoStorage: `You've reached your ${PRO_TIER_LIMITS.videoStorageGB}GB video storage limit. Delete some videos or contact support.`,
  videoFileSize: `Video file size exceeds the ${PRO_TIER_LIMITS.maxVideoFileSizeMB}MB limit. Please compress your video or upload a shorter clip.`,
} as const

// ==========================================
// Helper Functions
// ==========================================

/**
 * Get user's subscription status
 */
export async function getUserSubscriptionStatus(userId: string): Promise<UserSubscriptionStatus> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at, grace_period_end')
    .eq('id', userId)
    .single()

  if (!profile) {
    return {
      plan: 'free',
      isActive: false,
      expiresAt: null,
      isInGracePeriod: false,
      gracePeriodEnd: null,
    }
  }

  const now = new Date()
  const expiresAt = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null
  const gracePeriodEnd = profile.grace_period_end ? new Date(profile.grace_period_end) : null

  // User is Pro if:
  // 1. Plan is 'pro' AND (no expiry OR expiry is in future) AND (no grace period OR grace period not expired)
  // 2. OR user is in grace period (grace_period_end is in future)
  const isInGracePeriod = gracePeriodEnd !== null && gracePeriodEnd > now
  const gracePeriodExpired = gracePeriodEnd !== null && gracePeriodEnd <= now

  const isActive =
    (profile.plan === 'pro' && (!expiresAt || expiresAt > now) && !gracePeriodExpired) ||
    isInGracePeriod

  return {
    plan: profile.plan as 'free' | 'pro',
    isActive,
    expiresAt: profile.plan_expires_at,
    isInGracePeriod,
    gracePeriodEnd: profile.grace_period_end,
  }
}

/**
 * Check if user is on Pro plan (active subscription or grace period)
 */
export async function isProUser(userId: string): Promise<boolean> {
  const status = await getUserSubscriptionStatus(userId)
  return status.isActive
}

// ==========================================
// Limit Check Functions
// ==========================================

/**
 * Check if user can create a new trip
 *
 * Free tier: 1 trip maximum
 * Pro: Unlimited
 *
 * @param userId - User ID to check
 * @returns Limit check result with allowed status and metadata
 */
export async function checkTripLimit(userId: string): Promise<LimitCheckResult> {
  const supabase = await createClient()

  // Check if user is Pro
  const isPro = await isProUser(userId)

  // Get current trip count
  const { count: currentCount } = await supabase
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId)

  const tripCount = currentCount ?? 0

  // Pro users have unlimited trips
  if (isPro) {
    return {
      allowed: true,
      currentCount: tripCount,
      limit: Infinity,
      isProUser: true,
    }
  }

  // Free users limited to 1 trip
  const allowed = tripCount < FREE_TIER_LIMITS.trips

  return {
    allowed,
    reason: allowed ? undefined : ERROR_MESSAGES.trips,
    currentCount: tripCount,
    limit: FREE_TIER_LIMITS.trips,
    isProUser: false,
  }
}

/**
 * Check if participant can be added to a trip
 *
 * Free tier: 5 participants per trip
 * Pro: Unlimited
 *
 * @param tripId - Trip ID to check
 * @returns Limit check result with allowed status and metadata
 */
export async function checkParticipantLimit(tripId: string): Promise<LimitCheckResult> {
  const supabase = await createClient()

  // Get trip owner
  const { data: trip } = await supabase.from('trips').select('owner_id').eq('id', tripId).single()

  if (!trip) {
    return {
      allowed: false,
      reason: 'Trip not found',
      currentCount: 0,
      limit: 0,
      isProUser: false,
    }
  }

  // Check if trip owner is Pro
  const isPro = await isProUser(trip.owner_id)

  // Get current participant count
  const { count: currentCount } = await supabase
    .from('trip_participants')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', tripId)

  const participantCount = currentCount ?? 0

  // Pro users have unlimited participants
  if (isPro) {
    return {
      allowed: true,
      currentCount: participantCount,
      limit: Infinity,
      isProUser: true,
    }
  }

  // Free users limited to 5 participants per trip
  const allowed = participantCount < FREE_TIER_LIMITS.participants

  return {
    allowed,
    reason: allowed ? undefined : ERROR_MESSAGES.participants,
    currentCount: participantCount,
    limit: FREE_TIER_LIMITS.participants,
    isProUser: false,
  }
}

/**
 * Check if user can upload a photo
 *
 * Free tier: 25 photos total across all trips
 * Pro: Unlimited
 *
 * @param userId - User ID to check
 * @returns Limit check result with allowed status and metadata
 */
export async function checkPhotoLimit(userId: string): Promise<LimitCheckResult> {
  const supabase = await createClient()

  // Check if user is Pro
  const isPro = await isProUser(userId)

  // Get current photo count (denormalized in profiles table)
  const { data: profile } = await supabase
    .from('profiles')
    .select('photo_count')
    .eq('id', userId)
    .single()

  const photoCount = profile?.photo_count ?? 0

  // Pro users have unlimited photos
  if (isPro) {
    return {
      allowed: true,
      currentCount: photoCount,
      limit: Infinity,
      isProUser: true,
    }
  }

  // Free users limited to 25 photos total
  const allowed = photoCount < FREE_TIER_LIMITS.photos

  return {
    allowed,
    reason: allowed ? undefined : ERROR_MESSAGES.photos,
    currentCount: photoCount,
    limit: FREE_TIER_LIMITS.photos,
    isProUser: false,
  }
}

/**
 * Check if user can upload a video of given size
 *
 * Free tier: 0 videos (hard block, Pro feature only)
 * Pro tier: 10GB total video storage, 100MB max file size
 *
 * @param userId - User ID to check
 * @param fileSizeBytes - Video file size in bytes
 * @returns Limit check result with allowed status, storage info, and metadata
 */
export async function checkVideoLimit(
  userId: string,
  fileSizeBytes: number
): Promise<
  LimitCheckResult & { currentStorageGB?: number; limitGB?: number; remainingGB?: number }
> {
  const supabase = await createClient()

  // Check if user is Pro
  const isPro = await isProUser(userId)

  // Free users cannot upload videos at all
  if (!isPro) {
    return {
      allowed: false,
      reason: ERROR_MESSAGES.videos,
      currentCount: 0,
      limit: FREE_TIER_LIMITS.videos,
      isProUser: false,
      currentStorageGB: 0,
      limitGB: 0,
      remainingGB: 0,
    }
  }

  // Check file size limit (100MB = 104,857,600 bytes)
  const maxFileSizeBytes = PRO_TIER_LIMITS.maxVideoFileSizeMB * 1024 * 1024
  if (fileSizeBytes > maxFileSizeBytes) {
    // Get current storage for display
    const { data: profile } = await supabase
      .from('profiles')
      .select('video_storage_bytes')
      .eq('id', userId)
      .single()

    const currentStorageBytes = profile?.video_storage_bytes ?? 0
    const currentStorageGB = currentStorageBytes / (1024 * 1024 * 1024)
    const limitGB = PRO_TIER_LIMITS.videoStorageGB
    const remainingGB = Math.max(limitGB - currentStorageGB, 0)

    return {
      allowed: false,
      reason: ERROR_MESSAGES.videoFileSize,
      currentCount: 0,
      limit: Infinity,
      isProUser: true,
      currentStorageGB,
      limitGB,
      remainingGB,
    }
  }

  // Get current video storage (denormalized in profiles table)
  const { data: profile } = await supabase
    .from('profiles')
    .select('video_storage_bytes')
    .eq('id', userId)
    .single()

  const currentStorageBytes = profile?.video_storage_bytes ?? 0
  const maxStorageBytes = PRO_TIER_LIMITS.videoStorageGB * 1024 * 1024 * 1024 // 10GB in bytes

  // Convert to GB for display
  const currentStorageGB = currentStorageBytes / (1024 * 1024 * 1024)
  const limitGB = PRO_TIER_LIMITS.videoStorageGB
  const newStorageBytes = currentStorageBytes + fileSizeBytes
  const remainingGB = Math.max(limitGB - currentStorageGB, 0)

  // Check if adding this video would exceed the storage limit
  const allowed = newStorageBytes <= maxStorageBytes

  return {
    allowed,
    reason: allowed ? undefined : ERROR_MESSAGES.videoStorage,
    currentCount: 0, // We track storage, not count
    limit: Infinity, // Unlimited video count, limited by storage
    isProUser: true,
    currentStorageGB: Math.round(currentStorageGB * 100) / 100, // Round to 2 decimal places
    limitGB,
    remainingGB: Math.round(remainingGB * 100) / 100,
  }
}

// ==========================================
// Percentage-Based Helpers (for UI warnings)
// ==========================================

/**
 * Calculate percentage of limit used
 */
export function getLimitPercentage(currentCount: number, limit: number): number {
  if (limit === Infinity) return 0
  if (limit === 0) return 100
  return Math.min(Math.round((currentCount / limit) * 100), 100)
}

/**
 * Check if user is near limit (80%+ usage)
 */
export function isNearLimit(currentCount: number, limit: number): boolean {
  return getLimitPercentage(currentCount, limit) >= 80
}

/**
 * Check if user is at limit (100% usage)
 */
export function isAtLimit(currentCount: number, limit: number): boolean {
  if (limit === Infinity) return false
  return currentCount >= limit
}

// ==========================================
// Exports
// ==========================================

export { FREE_TIER_LIMITS, ERROR_MESSAGES }
