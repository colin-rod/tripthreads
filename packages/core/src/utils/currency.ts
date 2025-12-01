/**
 * Currency utility functions for TripThreads
 * All monetary amounts are stored in minor units (cents) in the database
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  JPY: '¥',
  CHF: 'Fr',
  CAD: 'C$',
  AUD: 'A$',
  NZD: 'NZ$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
}

/**
 * Format currency amount with symbol
 * @param amount - Amount in major units (e.g., 100.00 for $100)
 * @param currency - ISO 4217 currency code (e.g., 'USD', 'EUR')
 * @returns Formatted string with currency symbol
 *
 * @example
 * formatCurrency(100, 'USD') // '$100.00'
 * formatCurrency(-50, 'EUR') // '-€50.00'
 */
export function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency
  const absAmount = Math.abs(amount)
  const formattedAmount = absAmount.toFixed(2)

  if (amount < 0) {
    return `-${symbol}${formattedAmount}`
  }

  return `${symbol}${formattedAmount}`
}

/**
 * Convert major currency units to minor units (dollars to cents)
 * @param amount - Amount in major units (e.g., 100.50 for $100.50)
 * @returns Amount in minor units (cents), rounded to nearest integer
 *
 * @example
 * convertToMinorUnits(100.50) // 10050
 * convertToMinorUnits(100) // 10000
 */
export function convertToMinorUnits(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Convert minor currency units to major units (cents to dollars)
 * @param minorUnits - Amount in minor units (cents)
 * @returns Amount in major units (dollars)
 *
 * @example
 * convertFromMinorUnits(10050) // 100.50
 * convertFromMinorUnits(10000) // 100
 */
export function convertFromMinorUnits(minorUnits: number): number {
  return minorUnits / 100
}

type FormatMinorUnitOptions = Intl.NumberFormatOptions & {
  locale?: string
}

/**
 * Format currency amount stored in minor units using Intl.NumberFormat
 * @param minorUnits - Amount in minor units (e.g., cents)
 * @param currency - ISO 4217 currency code
 * @param options - Optional locale and Intl.NumberFormat configuration
 * @returns Locale-aware formatted currency string
 *
 * @example
 * formatCurrencyFromMinorUnits(12345, 'USD') // '$123.45'
 * formatCurrencyFromMinorUnits(12345, 'EUR', { locale: 'de-DE' }) // '123,45\u00a0€'
 */
export function formatCurrencyFromMinorUnits(
  minorUnits: number,
  currency: string,
  options: FormatMinorUnitOptions = {}
): string {
  const { locale = 'en-US', ...formatOptions } = options
  const majorUnits = convertFromMinorUnits(minorUnits)

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...formatOptions,
  }).format(majorUnits)
}
