/**
 * Stripe Utility Functions
 *
 * Helper functions for formatting prices, checking plan features,
 * and working with Stripe data.
 *
 * Phase: 3 (Stripe Integration)
 * Created: 2025-11-11
 */

import type { Currency, PlanInterval } from './config'
import { STRIPE_CURRENCIES, PLAN_FEATURES } from './config'

// ============================================================================
// Price Formatting
// ============================================================================

/**
 * Format a price amount with currency symbol
 *
 * @param amount - Amount in whole units (e.g., 7 for €7)
 * @param currency - ISO currency code (EUR, USD, GBP)
 * @returns Formatted price string (e.g., "€7", "$8", "£6")
 */
export function formatPrice(amount: number, currency: Currency): string {
  const symbol = STRIPE_CURRENCIES[currency].symbol
  return `${symbol}${amount}`
}

/**
 * Format a price amount for display with proper locale formatting
 *
 * @param amount - Amount in whole units
 * @param currency - ISO currency code
 * @param locale - Locale for formatting (defaults to 'en-US')
 * @returns Formatted price with proper number formatting
 *
 * @example
 * formatPriceLocale(70, 'EUR') // "€70.00"
 * formatPriceLocale(1234.56, 'USD') // "$1,234.56"
 */
export function formatPriceLocale(amount: number, currency: Currency, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Convert Stripe amount (cents) to whole units
 *
 * @param amountInCents - Amount in cents (e.g., 700 for €7.00)
 * @returns Amount in whole units (e.g., 7)
 */
export function centsToUnits(amountInCents: number): number {
  return amountInCents / 100
}

/**
 * Convert whole units to Stripe amount (cents)
 *
 * @param amount - Amount in whole units (e.g., 7 for €7)
 * @returns Amount in cents (e.g., 700)
 */
export function unitsToCents(amount: number): number {
  return Math.round(amount * 100)
}

// ============================================================================
// Plan Comparison & Features
// ============================================================================

/**
 * Check if a user can perform an action based on their plan
 *
 * @param userPlan - User's current plan ('free' | 'pro')
 * @param feature - Feature to check ('trips' | 'participants' | 'photos' | 'pdfRecap' | 'prioritySupport')
 * @param currentCount - Current usage count (for numeric limits)
 * @returns Whether the user can perform the action
 */
export function canUserAccessFeature(
  userPlan: 'free' | 'pro',
  feature: keyof typeof PLAN_FEATURES.free,
  currentCount = 0
): boolean {
  const limit = PLAN_FEATURES[userPlan][feature]

  // Boolean features (e.g., pdfRecap, prioritySupport)
  if (typeof limit === 'boolean') {
    return limit
  }

  // Numeric limits (e.g., trips, participants, photos)
  return currentCount < limit
}

/**
 * Get remaining quota for a feature
 *
 * @param userPlan - User's current plan
 * @param feature - Feature to check (only numeric features)
 * @param currentCount - Current usage count
 * @returns Remaining quota (Infinity for unlimited)
 */
export function getRemainingQuota(
  userPlan: 'free' | 'pro',
  feature: 'trips' | 'participants' | 'photos',
  currentCount: number
): number {
  const limit = PLAN_FEATURES[userPlan][feature]

  if (limit === Infinity) {
    return Infinity
  }

  return Math.max(0, limit - currentCount)
}

/**
 * Check if user has reached their plan limit for a feature
 *
 * @param userPlan - User's current plan
 * @param feature - Feature to check
 * @param currentCount - Current usage count
 * @returns Whether the user has reached their limit
 */
export function hasReachedLimit(
  userPlan: 'free' | 'pro',
  feature: 'trips' | 'participants' | 'photos',
  currentCount: number
): boolean {
  return getRemainingQuota(userPlan, feature, currentCount) === 0
}

// ============================================================================
// Currency Detection
// ============================================================================

/**
 * Detect user's preferred currency based on their location
 * This is a simple heuristic - Stripe will handle actual currency detection
 * via Adaptive Pricing during checkout.
 *
 * @param locale - User's browser locale (e.g., 'en-US', 'en-GB', 'fr-FR')
 * @returns Detected currency code
 */
export function detectCurrency(locale: string): Currency {
  const localeMap: Record<string, Currency> = {
    // US and territories
    en_US: 'USD',
    en: 'USD',
    // UK
    en_GB: 'GBP',
    // Eurozone countries
    fr: 'EUR',
    de: 'EUR',
    es: 'EUR',
    it: 'EUR',
    pt: 'EUR',
    nl: 'EUR',
    be: 'EUR',
    at: 'EUR',
    ie: 'EUR',
    fi: 'EUR',
    gr: 'EUR',
    // Default fallback
  }

  const localeKey = locale.replace('-', '_')
  return localeMap[localeKey] || 'EUR' // Default to EUR
}

// ============================================================================
// Plan Display Helpers
// ============================================================================

/**
 * Get display name for a plan interval
 *
 * @param interval - Plan interval
 * @returns Display name
 */
export function getPlanDisplayName(interval: PlanInterval): string {
  const names: Record<PlanInterval, string> = {
    monthly: 'Monthly',
    yearly: 'Yearly',
    oneoff: 'One-Time',
  }
  return names[interval]
}

/**
 * Get savings percentage for yearly plan vs monthly
 *
 * @param currency - Currency to calculate for
 * @returns Savings percentage (e.g., 17 for 17%)
 */
export function getYearlySavingsPercentage(currency: Currency): number {
  const monthlyPrice = STRIPE_CURRENCIES[currency].prices.monthly.amount
  const yearlyPrice = STRIPE_CURRENCIES[currency].prices.yearly.amount
  const monthlyEquivalent = yearlyPrice / 12
  const savings = ((monthlyPrice - monthlyEquivalent) / monthlyPrice) * 100
  return Math.round(savings)
}

/**
 * Get monthly equivalent price for yearly plan
 *
 * @param currency - Currency
 * @returns Monthly equivalent amount
 */
export function getYearlyMonthlyEquivalent(currency: Currency): number {
  const yearlyPrice = STRIPE_CURRENCIES[currency].prices.yearly.amount
  return Number((yearlyPrice / 12).toFixed(2))
}

// ============================================================================
// Subscription Status Helpers
// ============================================================================

/**
 * Check if a subscription is active (not expired)
 *
 * @param planExpiresAt - ISO 8601 date string
 * @returns Whether the subscription is active
 */
export function isSubscriptionActive(planExpiresAt: string | null): boolean {
  if (!planExpiresAt) return false
  return new Date(planExpiresAt) > new Date()
}

/**
 * Get days remaining in subscription
 *
 * @param planExpiresAt - ISO 8601 date string
 * @returns Number of days remaining (0 if expired)
 */
export function getDaysRemaining(planExpiresAt: string | null): number {
  if (!planExpiresAt) return 0

  const expiresAt = new Date(planExpiresAt)
  const now = new Date()
  const diffMs = expiresAt.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

/**
 * Format expiration date for display
 *
 * @param planExpiresAt - ISO 8601 date string
 * @param locale - Locale for formatting
 * @returns Formatted date string
 */
export function formatExpirationDate(planExpiresAt: string, locale = 'en-US'): string {
  const date = new Date(planExpiresAt)
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

// ============================================================================
// Webhook Idempotency
// ============================================================================

/**
 * Check if a webhook event has already been processed
 *
 * This function prevents duplicate webhook processing by checking if the event ID
 * has already been stored in the database. This is critical for payment processing
 * to prevent duplicate charges or incorrect plan state changes.
 *
 * @param supabase - Supabase client instance (must use service role for webhook processing)
 * @param eventId - Stripe event ID (e.g., evt_1234567890)
 * @param eventType - Stripe event type (e.g., checkout.session.completed)
 * @returns Object with { processed: boolean, error?: Error }
 *
 * @example
 * const result = await checkWebhookProcessed(supabase, event.id, event.type)
 * if (result.processed) {
 *   console.log('Event already processed, skipping')
 *   return NextResponse.json({ received: true })
 * }
 */
export async function checkWebhookProcessed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  eventId: string,
  _eventType: string
): Promise<{ processed: boolean; error?: Error }> {
  try {
    // Check if event ID already exists
    const { data, error } = await supabase
      .from('processed_webhook_events')
      .select('event_id')
      .eq('event_id', eventId)
      .maybeSingle()

    if (error) {
      console.error('[webhook-idempotency] Error checking event:', error)
      return { processed: false, error }
    }

    // If data exists, event has already been processed
    if (data) {
      console.log(`[webhook-idempotency] Event ${eventId} already processed, skipping`)
      return { processed: true }
    }

    return { processed: false }
  } catch (error) {
    console.error('[webhook-idempotency] Unexpected error:', error)
    return { processed: false, error: error as Error }
  }
}

/**
 * Mark a webhook event as processed
 *
 * Stores the event ID in the database to prevent duplicate processing.
 * Should be called AFTER successfully processing the webhook event.
 *
 * @param supabase - Supabase client instance (must use service role)
 * @param eventId - Stripe event ID
 * @param eventType - Stripe event type
 * @returns Object with { success: boolean, error?: Error }
 *
 * @example
 * await handleCheckoutCompleted(event)
 * await markWebhookProcessed(supabase, event.id, event.type)
 */
export async function markWebhookProcessed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  eventId: string,
  eventType: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    const { error } = await supabase.from('processed_webhook_events').insert({
      event_id: eventId,
      event_type: eventType,
    })

    if (error) {
      console.error('[webhook-idempotency] Error marking event as processed:', error)
      return { success: false, error }
    }

    console.log(`[webhook-idempotency] Event ${eventId} marked as processed`)
    return { success: true }
  } catch (error) {
    console.error('[webhook-idempotency] Unexpected error:', error)
    return { success: false, error: error as Error }
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  formatPrice,
  formatPriceLocale,
  centsToUnits,
  unitsToCents,
  canUserAccessFeature,
  getRemainingQuota,
  hasReachedLimit,
  detectCurrency,
  getPlanDisplayName,
  getYearlySavingsPercentage,
  getYearlyMonthlyEquivalent,
  isSubscriptionActive,
  getDaysRemaining,
  formatExpirationDate,
  checkWebhookProcessed,
  markWebhookProcessed,
}
