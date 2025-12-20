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

// ============================================================================
// Authentication Events
// ============================================================================

/**
 * Track user signup
 * @param method - Authentication method used
 * @param userId - Supabase user ID
 */
export const trackSignup = (method: 'email' | 'google' | 'apple', userId: string) => {
  posthog.capture('signup', {
    method,
    user_id: userId,
  })
}

/**
 * Track user login
 * @param method - Authentication method used
 * @param userId - Supabase user ID
 */
export const trackLogin = (method: 'email' | 'google' | 'apple', userId: string) => {
  posthog.capture('login', {
    method,
    user_id: userId,
  })
}

/**
 * Track user logout
 */
export const trackLogout = () => {
  posthog.capture('logout', {})
}

// ============================================================================
// Onboarding Events (Already implemented - included for completeness)
// ============================================================================

/**
 * Track onboarding start
 */
export const trackOnboardingStarted = () => {
  posthog.capture('onboarding_started', {})
}

/**
 * Track onboarding step view
 * @param step - Step identifier
 */
export const trackOnboardingStepViewed = (
  step: 'welcome' | 'roles' | 'features' | 'first-trip'
) => {
  posthog.capture('onboarding_step_viewed', { step })
}

/**
 * Track onboarding completion
 */
export const trackOnboardingCompleted = () => {
  posthog.capture('onboarding_completed', {})
}

/**
 * Track onboarding skip
 * @param step - Step where user skipped
 */
export const trackOnboardingSkipped = (step: 'welcome' | 'roles' | 'features' | 'first-trip') => {
  posthog.capture('onboarding_skipped', { step })
}

/**
 * Track platform detection during onboarding
 * @param platform - Detected platform
 */
export const trackOnboardingPlatformDetected = (platform: 'web' | 'ios' | 'android') => {
  posthog.capture('onboarding_platform_detected', { platform })
}

// ============================================================================
// Tour Events (Already implemented - included for completeness)
// ============================================================================

/**
 * Track tour start
 * @param tourId - Tour identifier
 */
export const trackTourStarted = (tourId: string) => {
  posthog.capture('tour_started', { tour_id: tourId })
}

/**
 * Track tour step advancement
 * @param params - Tour step parameters
 */
export const trackTourStepAdvanced = (params: { tourId: string; step: number; stepId: string }) => {
  posthog.capture('tour_step_advanced', {
    tour_id: params.tourId,
    step: params.step,
    step_id: params.stepId,
  })
}

/**
 * Track tour completion
 * @param tourId - Tour identifier
 */
export const trackTourCompleted = (tourId: string) => {
  posthog.capture('tour_completed', { tour_id: tourId })
}

/**
 * Track tour skip
 * @param params - Tour skip parameters
 */
export const trackTourSkipped = (params: { tourId: string; step: number }) => {
  posthog.capture('tour_skipped', {
    tour_id: params.tourId,
    step: params.step,
  })
}

/**
 * Track tour dismissal (can be resumed later)
 * @param params - Tour dismiss parameters
 */
export const trackTourDismissed = (params: { tourId: string; step: number }) => {
  posthog.capture('tour_dismissed', {
    tour_id: params.tourId,
    step: params.step,
  })
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
}) => {
  posthog.capture('trip_created', {
    trip_id: params.tripId,
    has_dates: params.hasDates,
    has_description: params.hasDescription,
    source: params.source,
  })
}

/**
 * Track trip view
 * @param tripId - Trip ID being viewed
 */
export const trackTripViewed = (tripId: string) => {
  posthog.capture('trip_viewed', { trip_id: tripId })
}

/**
 * Track trip edit
 * @param params - Trip edit parameters
 *
 * TODO: Implement when trip edit server action is created
 * Currently trip editing functionality doesn't exist in apps/web/app/actions/trips.ts
 */
export const trackTripEdited = (params: { tripId: string; fieldsChanged: string[] }) => {
  posthog.capture('trip_edited', {
    trip_id: params.tripId,
    fields_changed: params.fieldsChanged,
  })
}

/**
 * Track trip archival
 * @param tripId - Trip ID being archived
 *
 * TODO: Implement when trip archive server action is created
 * Currently trip archiving functionality doesn't exist in apps/web/app/actions/trips.ts
 */
export const trackTripArchived = (tripId: string) => {
  posthog.capture('trip_archived', { trip_id: tripId })
}

/**
 * Track trip deletion
 * @param params - Trip deletion parameters
 */
export const trackTripDeleted = (params: {
  tripId: string
  participantCount: number
  itemCount: number
  expenseCount: number
}) => {
  posthog.capture('trip_deleted', {
    trip_id: params.tripId,
    participant_count: params.participantCount,
    item_count: params.itemCount,
    expense_count: params.expenseCount,
  })
}

// ============================================================================
// Invite Events
// ============================================================================

/**
 * Track invite sent
 * @param params - Invite parameters
 */
export const trackInviteSent = (params: {
  tripId: string
  inviteMethod: 'email' | 'link' | 'qr'
  role: 'participant' | 'viewer'
}) => {
  posthog.capture('invite_sent', {
    trip_id: params.tripId,
    invite_method: params.inviteMethod,
    role: params.role,
  })
}

/**
 * Track invite acceptance
 * @param params - Invite acceptance parameters
 */
export const trackInviteAccepted = (params: {
  tripId: string
  role: 'participant' | 'viewer'
  inviteMethod: 'email' | 'link' | 'qr'
  isPartialJoiner: boolean
}) => {
  posthog.capture('invite_accepted', {
    trip_id: params.tripId,
    role: params.role,
    invite_method: params.inviteMethod,
    is_partial_joiner: params.isPartialJoiner,
  })
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
}) => {
  posthog.capture('item_added_nl', {
    trip_id: params.tripId,
    item_type: params.itemType,
    parse_success: params.parseSuccess,
    has_time: params.hasTime,
    has_location: params.hasLocation,
  })
}

/**
 * Track itinerary item added via manual form
 * @param params - Item parameters
 */
export const trackItemAddedManual = (params: { tripId: string; itemType: ItemType }) => {
  posthog.capture('item_added_manual', {
    trip_id: params.tripId,
    item_type: params.itemType,
  })
}

/**
 * Track itinerary item edit
 * @param params - Item edit parameters
 */
export const trackItemEdited = (params: { tripId: string; itemId: string; itemType: ItemType }) => {
  posthog.capture('item_edited', {
    trip_id: params.tripId,
    item_id: params.itemId,
    item_type: params.itemType,
  })
}

/**
 * Track itinerary item deletion
 * @param params - Item deletion parameters
 */
export const trackItemDeleted = (params: {
  tripId: string
  itemId: string
  itemType: ItemType
}) => {
  posthog.capture('item_deleted', {
    trip_id: params.tripId,
    item_id: params.itemId,
    item_type: params.itemType,
  })
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
}) => {
  // Map 'custom' to 'amount' for analytics (they mean the same thing)
  const splitType = params.splitType === 'custom' ? 'amount' : params.splitType

  posthog.capture('expense_added_nl', {
    trip_id: params.tripId,
    amount_cents: params.amountCents,
    currency: params.currency,
    split_type: splitType,
    participant_count: params.participantCount,
    parse_success: params.parseSuccess,
    has_receipt: params.hasReceipt,
  })
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
}) => {
  // Map 'custom' to 'amount' for analytics (they mean the same thing)
  const splitType = params.splitType === 'custom' ? 'amount' : params.splitType

  posthog.capture('expense_added_manual', {
    trip_id: params.tripId,
    amount_cents: params.amountCents,
    currency: params.currency,
    split_type: splitType,
    participant_count: params.participantCount,
    has_receipt: params.hasReceipt,
  })
}

/**
 * Track expense edit
 * @param params - Expense edit parameters
 *
 * TODO: Implement when expense edit server action is created
 * Currently expense editing functionality doesn't exist in apps/web/app/actions/expenses.ts
 */
export const trackExpenseEdited = (params: {
  tripId: string
  expenseId: string
  fieldsChanged: string[]
}) => {
  posthog.capture('expense_edited', {
    trip_id: params.tripId,
    expense_id: params.expenseId,
    fields_changed: params.fieldsChanged,
  })
}

/**
 * Track expense deletion
 * @param params - Expense deletion parameters
 *
 * TODO: Implement when expense delete server action is created
 * Currently expense deletion functionality doesn't exist in apps/web/app/actions/expenses.ts
 */
export const trackExpenseDeleted = (params: { tripId: string; expenseId: string }) => {
  posthog.capture('expense_deleted', {
    trip_id: params.tripId,
    expense_id: params.expenseId,
  })
}

// ============================================================================
// Settlement Events
// ============================================================================

/**
 * Track settlement creation
 * @param params - Settlement calculation parameters
 */
export const trackSettlementCreated = (params: {
  tripId: string
  settlementCount: number
  totalDebts: number
  currency: string
}) => {
  posthog.capture('settlement_created', {
    trip_id: params.tripId,
    settlement_count: params.settlementCount,
    total_debts: params.totalDebts,
    currency: params.currency,
  })
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
}) => {
  posthog.capture('settlement_marked_paid', {
    trip_id: params.tripId,
    settlement_id: params.settlementId,
    amount_cents: params.amountCents,
    currency: params.currency,
  })
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
}) => {
  posthog.capture('chat_message_sent', {
    trip_id: params.tripId,
    is_ai_response: params.isAiResponse,
    has_mentions: params.hasMentions,
  })
}

/**
 * Track message reaction added
 * @param params - Reaction parameters
 */
export const trackMessageReactionAdded = (params: { tripId: string; emoji: string }) => {
  posthog.capture('message_reaction_added', {
    trip_id: params.tripId,
    emoji: params.emoji,
  })
}

/**
 * Track AI response generated
 * @param params - AI response parameters
 */
export const trackAiResponseGenerated = (params: {
  tripId: string
  tokenCount: number
  responseTime: number
}) => {
  posthog.capture('ai_response_generated', {
    trip_id: params.tripId,
    token_count: params.tokenCount,
    response_time: params.responseTime,
  })
}

// ============================================================================
// Limit Events
// ============================================================================

/**
 * Track participant limit reached (Free tier: 10 participants)
 * @param params - Limit parameters
 */
export const trackParticipantLimitReached = (params: {
  tripId: string
  currentCount: number
  attemptedAction: 'invite' | 'accept_request'
}) => {
  posthog.capture('participant_limit_reached', {
    trip_id: params.tripId,
    current_count: params.currentCount,
    attempted_action: params.attemptedAction,
  })
}

/**
 * Track photo limit reached (Free tier: 50 photos)
 * @param params - Limit parameters
 */
export const trackPhotoLimitReached = (params: { tripId: string; currentCount: number }) => {
  posthog.capture('photo_limit_reached', {
    trip_id: params.tripId,
    current_count: params.currentCount,
  })
}

// ============================================================================
// Media Events (Phase 3)
// ============================================================================

/**
 * Track photo upload
 * @param params - Photo upload parameters
 */
export const trackPhotoUploaded = (params: {
  tripId: string
  fileSizeKb: number
  hasCaption: boolean
}) => {
  posthog.capture('photo_uploaded', {
    trip_id: params.tripId,
    file_size_kb: params.fileSizeKb,
    has_caption: params.hasCaption,
  })
}

/**
 * Track video upload
 * @param params - Video upload parameters
 */
export const trackVideoUploaded = (params: {
  tripId: string
  fileSizeMb: number
  hasCaption: boolean
}) => {
  posthog.capture('video_uploaded', {
    trip_id: params.tripId,
    file_size_mb: params.fileSizeMb,
    has_caption: params.hasCaption,
  })
}

/**
 * Track feed view
 * @param params - Feed view parameters
 */
export const trackFeedViewed = (params: {
  tripId: string
  photoCount: number
  videoCount: number
}) => {
  posthog.capture('feed_viewed', {
    trip_id: params.tripId,
    photo_count: params.photoCount,
    video_count: params.videoCount,
  })
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
