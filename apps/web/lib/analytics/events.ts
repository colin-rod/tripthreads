/**
 * Analytics Event Tracking Helpers
 *
 * Typed helper functions for all 39 PostHog analytics events.
 * These helpers ensure consistent event naming, prevent property typos,
 * and provide TypeScript autocomplete for event tracking.
 *
 * Usage:
 * ```typescript
 * import { trackSignup, trackTripCreated } from '@/lib/analytics'
 *
 * // After successful signup
 * trackSignup('email', user.id)
 *
 * // After trip creation
 * trackTripCreated({
 *   tripId: trip.id,
 *   hasDates: true,
 *   hasDescription: false,
 *   source: 'manual',
 * })
 * ```
 *
 * @see docs/ANALYTICS_EVENTS.md for full event documentation
 */

import { posthog } from './posthog'
import type { ItemType } from '@tripthreads/core'

// Server-side capture - only available on server
let captureServerEvent:
  | ((distinctId: string, event: string, properties?: Record<string, unknown>) => void)
  | null = null

// Lazy load server capture on first use (server only)
if (typeof window === 'undefined') {
  import('./posthog-server')
    .then(module => {
      captureServerEvent = module.captureServerEvent
    })
    .catch(err => {
      console.error('Failed to load server PostHog:', err)
    })
}

// ============================================================================
// Authentication Events
// ============================================================================

/**
 * Track user signup
 * @param method - Authentication method used
 * @param userId - Supabase user ID
 */
export const trackSignup = async (method: 'email' | 'google' | 'apple', userId: string) => {
  const eventData = {
    method,
    user_id: userId,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (userId && captureServerEvent) {
      await captureServerEvent(userId, 'signup', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('signup', eventData)
}

/**
 * Track user login
 * @param method - Authentication method used
 * @param userId - Supabase user ID
 */
export const trackLogin = async (method: 'email' | 'google' | 'apple', userId: string) => {
  const eventData = {
    method,
    user_id: userId,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (userId && captureServerEvent) {
      await captureServerEvent(userId, 'login', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('login', eventData)
}

/**
 * Track user logout
 * @param userId - Optional user ID for server-side tracking
 */
export const trackLogout = async (userId?: string) => {
  const eventData = {}

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (userId && captureServerEvent) {
      await captureServerEvent(userId, 'logout', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('logout', eventData)
}

// ============================================================================
// Onboarding Events (Already implemented - included for completeness)
// ============================================================================

/**
 * Track onboarding start
 * @param userId - Optional user ID for server-side tracking
 */
export const trackOnboardingStarted = async (userId?: string) => {
  const eventData = {}

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (userId && captureServerEvent) {
      await captureServerEvent(userId, 'onboarding_started', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('onboarding_started', eventData)
}

/**
 * Track onboarding step view
 * @param step - Step identifier
 * @param userId - Optional user ID for server-side tracking
 */
export const trackOnboardingStepViewed = async (
  step: 'welcome' | 'roles' | 'features' | 'first-trip',
  userId?: string
) => {
  const eventData = { step }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (userId && captureServerEvent) {
      await captureServerEvent(userId, 'onboarding_step_viewed', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('onboarding_step_viewed', eventData)
}

/**
 * Track onboarding completion
 * @param userId - Optional user ID for server-side tracking
 */
export const trackOnboardingCompleted = async (userId?: string) => {
  const eventData = {}

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (userId && captureServerEvent) {
      await captureServerEvent(userId, 'onboarding_completed', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('onboarding_completed', eventData)
}

/**
 * Track onboarding skip
 * @param step - Step where user skipped
 * @param userId - Optional user ID for server-side tracking
 */
export const trackOnboardingSkipped = async (
  step: 'welcome' | 'roles' | 'features' | 'first-trip',
  userId?: string
) => {
  const eventData = { step }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (userId && captureServerEvent) {
      await captureServerEvent(userId, 'onboarding_skipped', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('onboarding_skipped', eventData)
}

/**
 * Track platform detection during onboarding
 * @param platform - Detected platform
 * @param userId - Optional user ID for server-side tracking
 */
export const trackOnboardingPlatformDetected = async (
  platform: 'web' | 'ios' | 'android',
  userId?: string
) => {
  const eventData = { platform }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (userId && captureServerEvent) {
      await captureServerEvent(userId, 'onboarding_platform_detected', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('onboarding_platform_detected', eventData)
}

// ============================================================================
// Tour Events (Already implemented - included for completeness)
// ============================================================================

/**
 * Track tour start
 * @param tourId - Tour identifier
 * @param userId - Optional user ID for server-side tracking
 */
export const trackTourStarted = async (tourId: string, userId?: string) => {
  const eventData = { tour_id: tourId }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (userId && captureServerEvent) {
      await captureServerEvent(userId, 'tour_started', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('tour_started', eventData)
}

/**
 * Track tour step advancement
 * @param params - Tour step parameters
 */
export const trackTourStepAdvanced = async (params: {
  tourId: string
  step: number
  stepId: string
  userId?: string
}) => {
  const eventData = {
    tour_id: params.tourId,
    step: params.step,
    step_id: params.stepId,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'tour_step_advanced', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('tour_step_advanced', eventData)
}

/**
 * Track tour completion
 * @param tourId - Tour identifier
 * @param userId - Optional user ID for server-side tracking
 */
export const trackTourCompleted = async (tourId: string, userId?: string) => {
  const eventData = { tour_id: tourId }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (userId && captureServerEvent) {
      await captureServerEvent(userId, 'tour_completed', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('tour_completed', eventData)
}

/**
 * Track tour skip
 * @param params - Tour skip parameters
 */
export const trackTourSkipped = async (params: {
  tourId: string
  step: number
  userId?: string
}) => {
  const eventData = {
    tour_id: params.tourId,
    step: params.step,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'tour_skipped', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('tour_skipped', eventData)
}

/**
 * Track tour dismissal (can be resumed later)
 * @param params - Tour dismiss parameters
 */
export const trackTourDismissed = async (params: {
  tourId: string
  step: number
  userId?: string
}) => {
  const eventData = {
    tour_id: params.tourId,
    step: params.step,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'tour_dismissed', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('tour_dismissed', eventData)
}

// ============================================================================
// Trip Management Events
// ============================================================================

/**
 * Track trip creation
 * @param params - Trip creation parameters
 */
export const trackTripCreated = (params: {
  tripId: string
  hasDates: boolean
  hasDescription: boolean
  source: 'manual' | 'template' | 'import'
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    has_dates: params.hasDates,
    has_description: params.hasDescription,
    source: params.source,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      captureServerEvent(params.userId, 'trip_created', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('trip_created', eventData)
}

/**
 * Track trip view
 * @param tripId - Trip ID being viewed
 * @param userId - Optional user ID for server-side tracking
 */
export const trackTripViewed = async (tripId: string, userId?: string) => {
  const eventData = { trip_id: tripId }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (userId && captureServerEvent) {
      await captureServerEvent(userId, 'trip_viewed', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('trip_viewed', eventData)
}

/**
 * Track trip edit
 * @param params - Trip edit parameters
 *
 * TODO: Implement when trip edit server action is created
 * Currently trip editing functionality doesn't exist in apps/web/app/actions/trips.ts
 */
export const trackTripEdited = async (params: {
  tripId: string
  fieldsChanged: string[]
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    fields_changed: params.fieldsChanged,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'trip_edited', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('trip_edited', eventData)
}

/**
 * Track trip archival
 * @param tripId - Trip ID being archived
 * @param userId - Optional user ID for server-side tracking
 *
 * TODO: Implement when trip archive server action is created
 * Currently trip archiving functionality doesn't exist in apps/web/app/actions/trips.ts
 */
export const trackTripArchived = async (tripId: string, userId?: string) => {
  const eventData = { trip_id: tripId }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (userId && captureServerEvent) {
      await captureServerEvent(userId, 'trip_archived', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('trip_archived', eventData)
}

/**
 * Track trip deletion
 * @param params - Trip deletion parameters
 */
export const trackTripDeleted = async (params: {
  tripId: string
  participantCount: number
  itemCount: number
  expenseCount: number
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    participant_count: params.participantCount,
    item_count: params.itemCount,
    expense_count: params.expenseCount,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'trip_deleted', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('trip_deleted', eventData)
}

// ============================================================================
// Invite Events
// ============================================================================

/**
 * Track invite sent
 * @param params - Invite parameters
 */
export const trackInviteSent = async (params: {
  tripId: string
  inviteMethod: 'email' | 'link' | 'qr'
  role: 'participant' | 'viewer'
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    invite_method: params.inviteMethod,
    role: params.role,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'invite_sent', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('invite_sent', eventData)
}

/**
 * Track invite acceptance
 * @param params - Invite acceptance parameters
 */
export const trackInviteAccepted = async (params: {
  tripId: string
  role: 'participant' | 'viewer'
  inviteMethod: 'email' | 'link' | 'qr'
  isPartialJoiner: boolean
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    role: params.role,
    invite_method: params.inviteMethod,
    is_partial_joiner: params.isPartialJoiner,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'invite_accepted', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('invite_accepted', eventData)
}

// ============================================================================
// Itinerary Events
// ============================================================================

/**
 * Track itinerary item added via natural language
 * @param params - Item parameters
 */
export const trackItemAddedNl = (params: {
  tripId: string
  itemType: ItemType
  parseSuccess: boolean
  hasTime: boolean
  hasLocation: boolean
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    item_type: params.itemType,
    parse_success: params.parseSuccess,
    has_time: params.hasTime,
    has_location: params.hasLocation,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      captureServerEvent(params.userId, 'item_added_nl', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('item_added_nl', eventData)
}

/**
 * Track itinerary item added via manual form
 * @param params - Item parameters
 */
export const trackItemAddedManual = (params: {
  tripId: string
  itemType: ItemType
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    item_type: params.itemType,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      captureServerEvent(params.userId, 'item_added_manual', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('item_added_manual', eventData)
}

/**
 * Track itinerary item edit
 * @param params - Item edit parameters
 */
export const trackItemEdited = (params: {
  tripId: string
  itemId: string
  itemType: ItemType
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    item_id: params.itemId,
    item_type: params.itemType,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      captureServerEvent(params.userId, 'item_edited', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('item_edited', eventData)
}

/**
 * Track itinerary item deletion
 * @param params - Item deletion parameters
 */
export const trackItemDeleted = (params: {
  tripId: string
  itemId: string
  itemType: ItemType
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    item_id: params.itemId,
    item_type: params.itemType,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      captureServerEvent(params.userId, 'item_deleted', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('item_deleted', eventData)
}

// ============================================================================
// Expense Events
// ============================================================================

/**
 * Track expense added via natural language
 * @param params - Expense parameters
 */
export const trackExpenseAddedNl = (params: {
  tripId: string
  amountCents: number
  currency: string
  splitType: 'equal' | 'percentage' | 'amount' | 'custom' | 'none'
  participantCount: number
  parseSuccess: boolean
  hasReceipt: boolean
  userId?: string
}) => {
  // Map 'custom' to 'amount' for analytics (they mean the same thing)
  const splitType = params.splitType === 'custom' ? 'amount' : params.splitType

  const eventData = {
    trip_id: params.tripId,
    amount_cents: params.amountCents,
    currency: params.currency,
    split_type: splitType,
    participant_count: params.participantCount,
    parse_success: params.parseSuccess,
    has_receipt: params.hasReceipt,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      captureServerEvent(params.userId, 'expense_added_nl', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('expense_added_nl', eventData)
}

/**
 * Track expense added via manual form
 * @param params - Expense parameters
 */
export const trackExpenseAddedManual = (params: {
  tripId: string
  amountCents: number
  currency: string
  splitType: 'equal' | 'percentage' | 'amount' | 'custom' | 'none'
  participantCount: number
  hasReceipt: boolean
  userId?: string
}) => {
  // Map 'custom' to 'amount' for analytics (they mean the same thing)
  const splitType = params.splitType === 'custom' ? 'amount' : params.splitType

  const eventData = {
    trip_id: params.tripId,
    amount_cents: params.amountCents,
    currency: params.currency,
    split_type: splitType,
    participant_count: params.participantCount,
    has_receipt: params.hasReceipt,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      captureServerEvent(params.userId, 'expense_added_manual', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('expense_added_manual', eventData)
}

/**
 * Track expense edit
 * @param params - Expense edit parameters
 *
 * TODO: Implement when expense edit server action is created
 * Currently expense editing functionality doesn't exist in apps/web/app/actions/expenses.ts
 */
export const trackExpenseEdited = async (params: {
  tripId: string
  expenseId: string
  fieldsChanged: string[]
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    expense_id: params.expenseId,
    fields_changed: params.fieldsChanged,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'expense_edited', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('expense_edited', eventData)
}

/**
 * Track expense deletion
 * @param params - Expense deletion parameters
 *
 * TODO: Implement when expense delete server action is created
 * Currently expense deletion functionality doesn't exist in apps/web/app/actions/expenses.ts
 */
export const trackExpenseDeleted = async (params: {
  tripId: string
  expenseId: string
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    expense_id: params.expenseId,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'expense_deleted', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('expense_deleted', eventData)
}

// ============================================================================
// Settlement Events
// ============================================================================

/**
 * Track settlement creation
 * @param params - Settlement calculation parameters
 */
export const trackSettlementCreated = async (params: {
  tripId: string
  settlementCount: number
  totalDebts: number
  currency: string
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    settlement_count: params.settlementCount,
    total_debts: params.totalDebts,
    currency: params.currency,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'settlement_created', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('settlement_created', eventData)
}

/**
 * Track settlement marked as paid
 * @param params - Settlement payment parameters
 */
export const trackSettlementMarkedPaid = (params: {
  tripId: string
  settlementId: string
  amountCents: number
  currency: string
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    settlement_id: params.settlementId,
    amount_cents: params.amountCents,
    currency: params.currency,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      captureServerEvent(params.userId, 'settlement_marked_paid', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('settlement_marked_paid', eventData)
}

// ============================================================================
// Chat Events
// ============================================================================

/**
 * Track chat message sent
 * @param params - Chat message parameters
 */
export const trackChatMessageSent = (params: {
  tripId: string
  isAiResponse: boolean
  hasMentions: boolean
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    is_ai_response: params.isAiResponse,
    has_mentions: params.hasMentions,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      captureServerEvent(params.userId, 'chat_message_sent', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('chat_message_sent', eventData)
}

/**
 * Track message reaction added
 * @param params - Reaction parameters
 */
export const trackMessageReactionAdded = (params: {
  tripId: string
  emoji: string
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    emoji: params.emoji,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      captureServerEvent(params.userId, 'message_reaction_added', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('message_reaction_added', eventData)
}

/**
 * Track AI response generated
 * @param params - AI response parameters
 */
export const trackAiResponseGenerated = async (params: {
  tripId: string
  tokenCount: number
  responseTime: number
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    token_count: params.tokenCount,
    response_time: params.responseTime,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'ai_response_generated', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('ai_response_generated', eventData)
}

// ============================================================================
// Limit Events
// ============================================================================

/**
 * Track participant limit reached (Free tier: 10 participants)
 * @param params - Limit parameters
 */
export const trackParticipantLimitReached = async (params: {
  tripId: string
  currentCount: number
  attemptedAction: 'invite' | 'accept_request'
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    current_count: params.currentCount,
    attempted_action: params.attemptedAction,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'participant_limit_reached', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('participant_limit_reached', eventData)
}

/**
 * Track photo limit reached (Free tier: 50 photos)
 * @param params - Limit parameters
 */
export const trackPhotoLimitReached = async (params: {
  tripId: string
  currentCount: number
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    current_count: params.currentCount,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'photo_limit_reached', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('photo_limit_reached', eventData)
}

// ============================================================================
// Media Events (Phase 3)
// ============================================================================

/**
 * Track photo upload
 * @param params - Photo upload parameters
 */
export const trackPhotoUploaded = async (params: {
  tripId: string
  fileSizeKb: number
  hasCaption: boolean
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    file_size_kb: params.fileSizeKb,
    has_caption: params.hasCaption,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'photo_uploaded', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('photo_uploaded', eventData)
}

/**
 * Track video upload
 * @param params - Video upload parameters
 */
export const trackVideoUploaded = async (params: {
  tripId: string
  fileSizeMb: number
  hasCaption: boolean
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    file_size_mb: params.fileSizeMb,
    has_caption: params.hasCaption,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'video_uploaded', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('video_uploaded', eventData)
}

/**
 * Track feed view
 * @param params - Feed view parameters
 */
export const trackFeedViewed = async (params: {
  tripId: string
  photoCount: number
  videoCount: number
  userId?: string
}) => {
  const eventData = {
    trip_id: params.tripId,
    photo_count: params.photoCount,
    video_count: params.videoCount,
  }

  // Server-side tracking
  if (typeof window === 'undefined') {
    if (params.userId && captureServerEvent) {
      await captureServerEvent(params.userId, 'feed_viewed', eventData)
    }
    return
  }

  // Client-side tracking
  posthog.capture('feed_viewed', eventData)
}

// ============================================================================
// Offline Sync Events (Phase 2+)
// ============================================================================

/**
 * Track offline mode activation
 * @param params - Offline parameters
 */
export const trackWentOffline = (params: { queuedActions: number }) => {
  posthog.capture('went_offline', {
    queued_actions: params.queuedActions,
  })
}

/**
 * Track successful sync completion
 * @param params - Sync parameters
 */
export const trackSyncCompleted = (params: { syncedActions: number; syncDuration: number }) => {
  posthog.capture('sync_completed', {
    synced_actions: params.syncedActions,
    sync_duration: params.syncDuration,
  })
}

/**
 * Track sync failure
 * @param params - Sync failure parameters
 */
export const trackSyncFailed = (params: { failedActions: number; errorCode: string }) => {
  posthog.capture('sync_failed', {
    failed_actions: params.failedActions,
    error_code: params.errorCode,
  })
}

// ============================================================================
// Monetization Events (Phase 3)
// ============================================================================

/**
 * Track upgrade page view
 * @param userId - User ID viewing upgrade
 */
export const trackUpgradeViewed = (userId: string) => {
  // TODO: Implement when upgrade modal is created (Phase 3.2)
  posthog.capture('upgrade_viewed', { user_id: userId })
}

/**
 * Track checkout initiation
 * @param params - Checkout parameters
 */
export const trackCheckoutStarted = (params: {
  userId: string
  plan: 'monthly' | 'annual' | 'one-off'
  currency: string
  source: string
}) => {
  // TODO: Implement with Stripe checkout (Phase 3.2)
  posthog.capture('checkout_started', {
    user_id: params.userId,
    plan: params.plan,
    currency: params.currency,
    source: params.source,
  })
}

/**
 * Track subscription completion
 * @param params - Subscription parameters
 */
export const trackSubscriptionCompleted = (params: {
  userId: string
  plan: 'monthly' | 'annual' | 'one-off'
  amountCents: number
  currency: string
  stripeSubscriptionId: string
}) => {
  // TODO: Implement in Stripe webhook handler (Phase 3.3)
  posthog.capture('subscription_completed', {
    user_id: params.userId,
    plan: params.plan,
    amount_cents: params.amountCents,
    currency: params.currency,
    stripe_subscription_id: params.stripeSubscriptionId,
  })
}

/**
 * Track subscription cancellation
 * @param params - Cancellation parameters
 */
export const trackSubscriptionCancelled = (params: {
  userId: string
  plan: 'monthly' | 'annual' | 'one-off'
  reason?: string
}) => {
  // TODO: Implement in cancellation flow (Phase 3.4)
  posthog.capture('subscription_cancelled', {
    user_id: params.userId,
    plan: params.plan,
    reason: params.reason,
  })
}
