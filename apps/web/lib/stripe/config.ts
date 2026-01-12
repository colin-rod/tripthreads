/**
 * Stripe Configuration
 *
 * Multi-currency pricing configuration for TripThreads Pro subscriptions.
 * Uses Stripe's Adaptive Pricing to automatically show the correct currency
 * based on customer location.
 *
 * Phase: 3 (Stripe Integration)
 * Created: 2025-11-11
 */

// ============================================================================
// Types
// ============================================================================

export type Currency = 'EUR' | 'USD' | 'GBP'
export type PlanInterval = 'monthly' | 'yearly' | 'oneoff'

export interface PriceConfig {
  amount: number
  currency: Currency
  displayAmount: string // Formatted for display (e.g., "€7", "$8", "£6")
}

export interface CurrencyConfig {
  code: Currency
  symbol: string
  name: string
  prices: {
    monthly: PriceConfig
    yearly: PriceConfig
    oneoff: PriceConfig
  }
}

export interface ProductConfig {
  productId: string
  name: string
  description: string
  interval: 'month' | 'year' | null
  features: string[]
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Stripe Product IDs (same across all currencies)
 */
export const STRIPE_PRODUCTS: Record<PlanInterval, ProductConfig> = {
  monthly: {
    productId: process.env.STRIPE_PRODUCT_PRO_MONTHLY || '',
    name: 'TripThreads Pro (Monthly)',
    description: 'Unlimited trips, participants, and photos. 10GB video storage. Cancel anytime.',
    interval: 'month',
    features: [
      'Unlimited active trips',
      'Unlimited participants per trip',
      'Unlimited photos',
      '10GB video storage',
      'PDF trip recap',
      'Priority support',
    ],
  },
  yearly: {
    productId: process.env.STRIPE_PRODUCT_PRO_YEARLY || '',
    name: 'TripThreads Pro (Yearly)',
    description:
      'Unlimited trips, participants, and photos. 10GB video storage. Save 17% with annual billing.',
    interval: 'year',
    features: [
      'Unlimited active trips',
      'Unlimited participants per trip',
      'Unlimited photos',
      '10GB video storage',
      'PDF trip recap',
      'Priority support',
      '17% savings vs monthly',
    ],
  },
  oneoff: {
    productId: process.env.STRIPE_PRODUCT_PRO_ONEOFF || '',
    name: 'TripThreads Pro (Single Month)',
    description:
      'Unlock Pro features for one month with 10GB video storage. Perfect for a single trip.',
    interval: null,
    features: [
      'Unlimited trips for 1 month',
      'Unlimited participants',
      'Unlimited photos',
      '10GB video storage',
      'PDF trip recap',
    ],
  },
}

/**
 * Stripe Price IDs (Adaptive Pricing - single ID supports all currencies)
 * Stripe automatically shows the correct currency based on customer location
 */
export const STRIPE_PRICES: Record<PlanInterval, string> = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || '',
  yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY || '',
  oneoff: process.env.NEXT_PUBLIC_STRIPE_PRICE_ONEOFF || '',
}

/**
 * Currency-first pricing configuration
 * Uses FX-adjusted pricing for fairness across regions
 */
export const STRIPE_CURRENCIES: Record<Currency, CurrencyConfig> = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    prices: {
      monthly: {
        amount: 7,
        currency: 'EUR',
        displayAmount: '€7',
      },
      yearly: {
        amount: 70,
        currency: 'EUR',
        displayAmount: '€70',
      },
      oneoff: {
        amount: 9,
        currency: 'EUR',
        displayAmount: '€9',
      },
    },
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    prices: {
      monthly: {
        amount: 8,
        currency: 'USD',
        displayAmount: '$8',
      },
      yearly: {
        amount: 80,
        currency: 'USD',
        displayAmount: '$80',
      },
      oneoff: {
        amount: 10,
        currency: 'USD',
        displayAmount: '$10',
      },
    },
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    prices: {
      monthly: {
        amount: 6,
        currency: 'GBP',
        displayAmount: '£6',
      },
      yearly: {
        amount: 60,
        currency: 'GBP',
        displayAmount: '£60',
      },
      oneoff: {
        amount: 8,
        currency: 'GBP',
        displayAmount: '£8',
      },
    },
  },
}

/**
 * Feature limits by plan tier
 */
export const PLAN_FEATURES = {
  free: {
    trips: 1, // 1 active trip at a time
    participants: 5, // Max 5 participants per trip
    photos: 25, // Max 25 photos total
    videos: 0, // No video uploads (Pro feature only)
    videoStorageGB: 0, // No video storage
    pdfRecap: false,
    prioritySupport: false,
  },
  pro: {
    trips: Infinity, // Unlimited active trips
    participants: Infinity, // Unlimited participants per trip
    photos: Infinity, // Unlimited photos
    videos: Infinity, // Unlimited video count
    videoStorageGB: 10, // 10GB total video storage
    pdfRecap: true,
    prioritySupport: true,
  },
} as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all supported currencies
 */
export function getSupportedCurrencies(): Currency[] {
  return Object.keys(STRIPE_CURRENCIES) as Currency[]
}

/**
 * Get price ID for a specific plan (adaptive pricing - supports all currencies)
 */
export function getPriceId(plan: PlanInterval): string {
  return STRIPE_PRICES[plan]
}

/**
 * Get product ID for a specific plan
 */
export function getProductId(plan: PlanInterval): string {
  return STRIPE_PRODUCTS[plan].productId
}

/**
 * Get price amount for a specific plan and currency
 */
export function getPriceAmount(plan: PlanInterval, currency: Currency): number {
  return STRIPE_CURRENCIES[currency].prices[plan].amount
}

/**
 * Get formatted display amount for a specific plan and currency
 */
export function getDisplayAmount(plan: PlanInterval, currency: Currency): string {
  return STRIPE_CURRENCIES[currency].prices[plan].displayAmount
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  return STRIPE_CURRENCIES[currency].symbol
}

/**
 * Validate that all required environment variables are set
 * @throws Error if any required variables are missing
 */
export function validateStripeConfig(): void {
  const missing: string[] = []

  // Check products
  Object.entries(STRIPE_PRODUCTS).forEach(([plan, config]) => {
    if (!config.productId) {
      missing.push(`STRIPE_PRODUCT_PRO_${plan.toUpperCase()}`)
    }
  })

  // Check prices (adaptive pricing - one ID per plan)
  Object.entries(STRIPE_PRICES).forEach(([plan, priceId]) => {
    if (!priceId) {
      missing.push(`STRIPE_PRICE_${plan.toUpperCase()}`)
    }
  })

  if (missing.length > 0) {
    throw new Error(
      `Missing required Stripe environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\nSee .env.example for setup instructions.`
    )
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  products: STRIPE_PRODUCTS,
  prices: STRIPE_PRICES,
  currencies: STRIPE_CURRENCIES,
  features: PLAN_FEATURES,
  getSupportedCurrencies,
  getPriceId,
  getProductId,
  getPriceAmount,
  getDisplayAmount,
  getCurrencySymbol,
  validateStripeConfig,
}
