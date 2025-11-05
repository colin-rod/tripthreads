/**
 * Natural Language Date/Time Parser
 *
 * Parses natural language date and time expressions using chrono-node.
 * Supports absolute dates, relative dates, time expressions, and date ranges.
 *
 * @module parser/date
 */

import * as chrono from 'chrono-node'
import { isValid, parseISO } from 'date-fns'
import type { ParsedDateTime, DateParserOptions } from '../types/parser'

/**
 * Parse a natural language date/time expression
 *
 * @param input - Natural language input (e.g., "Monday 9am", "Dec 15-20", "tomorrow afternoon")
 * @param options - Parser configuration options
 * @returns Parsed date/time result, or null if parsing fails
 *
 * @example
 * ```typescript
 * // Parse relative date with time
 * const result = parseNaturalDate('Monday 9am');
 * // { date: Date(...), hasTime: true, isRange: false, confidence: 0.9, ... }
 *
 * // Parse date range
 * const range = parseNaturalDate('Dec 15-20');
 * // { date: Date(...), isRange: true, endDate: Date(...), ... }
 *
 * // Handle ambiguous dates
 * const ambiguous = parseNaturalDate('15/12', { dateFormat: 'EU' });
 * // { date: Date(...), detectedFormat: 'ambiguous', confidence: 0.6, ... }
 * ```
 */
export function parseNaturalDate(
  input: string,
  options: DateParserOptions = {}
): ParsedDateTime | null {
  const { referenceDate = new Date(), dateFormat = 'US' } = options

  // Trim whitespace
  const trimmedInput = input.trim()

  if (!trimmedInput) {
    return null
  }

  // Try ISO 8601 format first (highest confidence)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmedInput)) {
    const date = parseISO(trimmedInput)
    if (isValid(date)) {
      return {
        date,
        hasTime: trimmedInput.includes('T'),
        isRange: false,
        confidence: 1.0,
        originalText: input,
        detectedFormat: 'absolute',
      }
    }
  }

  // Configure chrono parser based on date format preference
  let results: chrono.ParsedResult[]

  if (dateFormat === 'EU') {
    // Use UK English parser for DD/MM/YYYY format
    results = chrono.en.GB.parse(trimmedInput, referenceDate, { forwardDate: true })
  } else if (dateFormat === 'US' || dateFormat === 'auto') {
    // Use casual parser for MM/DD/YYYY format (default)
    results = chrono.casual.parse(trimmedInput, referenceDate, { forwardDate: true })
  } else {
    // Default fallback
    results = chrono.parse(trimmedInput, referenceDate, { forwardDate: true })
  }

  if (results.length === 0) {
    return null
  }

  // Use the first result
  const result = results[0]
  const startDate = result.start.date()

  // Determine if time was specified
  const hasTime =
    result.start.isCertain('hour') ||
    result.start.get('hour') !== undefined ||
    /\d{1,2}:\d{2}/.test(trimmedInput) ||
    /(am|pm|morning|afternoon|evening|night)/i.test(trimmedInput)

  // Determine if this is a date range
  const isRange = !!result.end
  const endDate = result.end ? result.end.date() : undefined

  // Calculate confidence score
  const confidence = calculateConfidence(trimmedInput, result, dateFormat)

  // Detect format type
  const detectedFormat = detectFormat(trimmedInput, result, isRange)

  return {
    date: startDate,
    hasTime,
    isRange,
    endDate,
    confidence,
    originalText: input,
    detectedFormat,
  }
}

/**
 * Calculate confidence score for parsed result
 *
 * Confidence scoring rules:
 * - 1.0: ISO 8601 format (already handled above)
 * - 0.9-1.0: Absolute dates with year (e.g., "December 15, 2024")
 * - 0.8-0.9: Specific relative dates (e.g., "next Monday", "tomorrow")
 * - 0.7-0.8: Absolute dates without year (e.g., "Dec 15")
 * - 0.5-0.7: Ambiguous dates (e.g., "15/12" could be MM/DD or DD/MM)
 * - 0.3-0.5: Vague time expressions (e.g., "afternoon", "morning")
 *
 * @param input - Original input text
 * @param result - Chrono parse result
 * @param dateFormat - Date format preference (US or EU)
 * @returns Confidence score from 0-1
 */
function calculateConfidence(
  input: string,
  result: chrono.ParsedResult,
  _dateFormat: string
): number {
  // Vague time expressions (low confidence)
  if (/(morning|afternoon|evening|night|soon)/i.test(input)) {
    return 0.6
  }

  // Ambiguous date format (e.g., "15/12" without year)
  if (/^\d{1,2}\/\d{1,2}$/.test(input.trim())) {
    return 0.6 // Medium-low confidence, format is ambiguous
  }

  // Absolute date with year (high confidence)
  if (result.start.isCertain('year') && result.start.get('year') !== undefined) {
    return 0.95
  }

  // Specific relative dates with time (high confidence)
  if (
    /(today|tomorrow|yesterday|next|last|this|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(
      input
    ) &&
    /\d{1,2}(:\d{2})?\s*(am|pm)/i.test(input)
  ) {
    return 0.85
  }

  // Specific relative dates (good confidence)
  if (
    /(today|tomorrow|yesterday|next|last|this)/i.test(input) &&
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month)/i.test(input)
  ) {
    return 0.85
  }

  // Absolute date without year but with time (good confidence)
  if (
    result.start.isCertain('month') &&
    result.start.isCertain('day') &&
    result.start.isCertain('hour')
  ) {
    return 0.85
  }

  // Absolute date without year (good confidence)
  if (result.start.isCertain('month') && result.start.isCertain('day') && /^[a-z]/i.test(input)) {
    return 0.8
  }

  // Date with specific time (good confidence)
  if (result.start.isCertain('hour') && /\d{1,2}:\d{2}/.test(input)) {
    return 0.85
  }

  // "in X days/weeks" (good confidence)
  if (/in \d+ (day|week|month)/i.test(input)) {
    return 0.85
  }

  // Default: medium confidence
  return 0.7
}

/**
 * Detect the format type of the parsed input
 *
 * @param input - Original input text
 * @param result - Chrono parse result
 * @param isRange - Whether this is a date range
 * @returns Detected format type
 */
function detectFormat(
  input: string,
  result: chrono.ParsedResult,
  isRange: boolean
): ParsedDateTime['detectedFormat'] {
  if (isRange) {
    return 'range'
  }

  // Ambiguous numeric format
  if (/^\d{1,2}\/\d{1,2}$/.test(input.trim())) {
    return 'ambiguous'
  }

  // Absolute date (has month name or full date)
  if (
    /january|february|march|april|may|june|july|august|september|october|november|december/i.test(
      input
    ) ||
    /^\d{4}-\d{2}-\d{2}/.test(input)
  ) {
    return 'absolute'
  }

  // Relative date
  if (/(today|tomorrow|yesterday|next|last|this|in \d+)/i.test(input)) {
    return 'relative'
  }

  // Time expression
  if (/\d{1,2}:\d{2}|(am|pm)/i.test(input) && input.split(' ').length <= 2) {
    return 'time'
  }

  return undefined
}
