/**
 * Shared Analytics Types
 *
 * Type definitions used across web and mobile analytics implementations.
 * These types ensure consistency in event tracking across platforms.
 *
 * Note: SplitType is defined in types/expense.ts
 * Note: TripRole is defined in permissions/role-checks.ts
 */

/**
 * Authentication methods supported by TripThreads
 */
export type AuthMethod = 'email' | 'google' | 'apple'

/**
 * Itinerary item types
 * Matches the full ItineraryItemType from the database schema
 * Re-exported for analytics convenience
 */
export type ItemType =
  | 'transport'
  | 'accommodation'
  | 'dining'
  | 'activity'
  | 'sightseeing'
  | 'general'

/**
 * Invitation methods
 */
export type InviteMethod = 'email' | 'link' | 'qr'

/**
 * Trip creation sources
 */
export type TripSource = 'manual' | 'template' | 'import'

/**
 * Subscription plans
 */
export type SubscriptionPlan = 'monthly' | 'annual' | 'one-off'

/**
 * Onboarding steps
 */
export type OnboardingStep = 'welcome' | 'roles' | 'features' | 'first-trip'

/**
 * Platform types
 */
export type Platform = 'web' | 'ios' | 'android'

/**
 * Actions that can trigger participant limit
 */
export type ParticipantLimitAction = 'invite' | 'accept_request'
