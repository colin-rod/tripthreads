/**
 * Natural Language Expense Parser
 *
 * Parses natural language expense messages to extract structured data.
 * Supports currency detection, amount extraction, split calculation, and payer identification.
 *
 * @module parser/expense
 */

import type { ParsedExpense, ExpenseParserOptions } from '../types/parser'
import {
  extractCurrency,
  extractAmount,
  extractSplitCount,
  extractNames,
  extractPayer,
  detectSplitType,
  inferCategory,
  extractDescription,
} from './tokenizer'

/**
 * Parse a natural language expense message
 *
 * @param input - Natural language input (e.g., "Dinner €60 split 4 ways")
 * @param options - Parser configuration options
 * @returns Parsed expense result, or null if parsing fails
 *
 * @example
 * ```typescript
 * // Parse basic expense
 * const result = parseExpense('Dinner €60 split 4 ways');
 * // { amount: 6000, currency: 'EUR', description: 'Dinner', splitType: 'equal', splitCount: 4, ... }
 *
 * // Parse expense with payer
 * const result = parseExpense('Alice paid $120 for hotel');
 * // { amount: 12000, currency: 'USD', description: 'hotel', payer: 'Alice', ... }
 * ```
 */
export function parseExpense(
  input: string,
  options: ExpenseParserOptions = {}
): ParsedExpense | null {
  const { defaultCurrency = 'USD', decimalFormat = 'US' } = options

  // Trim whitespace
  const trimmedInput = input.trim()

  if (!trimmedInput) {
    return null
  }

  // Extract currency
  const currencyResult = extractCurrency(trimmedInput)
  const currency = currencyResult ? currencyResult.currency : defaultCurrency

  // Extract amount
  const amountResult = extractAmount(trimmedInput, decimalFormat)
  if (!amountResult) {
    return null // Amount is required
  }

  const amount = amountResult.amount

  // Convert to minor units (cents, pence, etc.)
  // JPY and similar currencies have no minor units
  const noMinorUnitCurrencies = ['JPY', 'KRW']
  const amountInMinorUnits = noMinorUnitCurrencies.includes(currency)
    ? Math.round(amount)
    : Math.round(amount * 100)

  // Extract payer
  const payer = extractPayer(trimmedInput)

  // Detect split type
  const splitType = detectSplitType(trimmedInput)

  // Extract split count
  const splitCount = extractSplitCount(trimmedInput)

  // Extract participants
  const participants = extractNames(trimmedInput)

  // If split count not explicitly given but participants are listed, use participant count
  const finalSplitCount = splitCount || (participants.length > 0 ? participants.length : undefined)

  // Extract description
  const description = extractDescription(trimmedInput)

  // Infer category
  const categoryResult = inferCategory(description)
  const category = categoryResult?.category

  // Calculate confidence score
  const confidence = calculateConfidence({
    hasCurrency: !!currencyResult,
    hasAmount: !!amountResult,
    hasDescription: description.length > 0 && description !== 'Expense',
    hasPayer: !!payer,
    hasSplitInfo: splitType !== 'none',
    hasSplitCount: !!finalSplitCount,
    hasParticipants: participants.length > 0,
    hasCategory: !!category,
    splitType,
  })

  return {
    amount: amountInMinorUnits,
    currency,
    description,
    category,
    payer: payer || undefined,
    splitType,
    splitCount: finalSplitCount,
    participants: participants.length > 0 ? participants : undefined,
    confidence,
    originalText: input,
  }
}

/**
 * Calculate confidence score for parsed expense
 *
 * Confidence scoring rules:
 * - 0.9-1.0: All key components present and clear
 * - 0.7-0.9: Most components present, some ambiguity
 * - 0.5-0.7: Key components present, significant ambiguity
 * - 0.3-0.5: Missing key information or high ambiguity
 * - <0.3: Very incomplete or ambiguous
 */
function calculateConfidence(factors: {
  hasCurrency: boolean
  hasAmount: boolean
  hasDescription: boolean
  hasPayer: boolean
  hasSplitInfo: boolean
  hasSplitCount: boolean
  hasParticipants: boolean
  hasCategory: boolean
  splitType: 'equal' | 'custom' | 'percentage' | 'none'
}): number {
  let score = 0

  // Amount is required (already checked), start with base
  score += 0.4

  // Currency detected (not using default)
  if (factors.hasCurrency) {
    score += 0.1
  }

  // Description extracted
  if (factors.hasDescription) {
    score += 0.1
  }

  // Payer identified
  if (factors.hasPayer) {
    score += 0.1
  }

  // Split information
  if (factors.hasSplitInfo) {
    score += 0.1

    // Split count or participants specified
    if (factors.hasSplitCount || factors.hasParticipants) {
      score += 0.1
    }

    // Equal split is clearest
    if (factors.splitType === 'equal') {
      score += 0.05
    }
  }

  // Category inferred
  if (factors.hasCategory) {
    score += 0.05
  }

  // Cap at 1.0
  return Math.min(score, 1.0)
}
