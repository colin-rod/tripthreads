/**
 * Tokenizer Utility
 *
 * Utility functions for extracting tokens from natural language input:
 * - Currency symbols and codes
 * - Numeric amounts
 * - Keywords (split, share, paid, owes)
 * - Names (capitalized words)
 *
 * @module parser/tokenizer
 */

/**
 * Currency symbol to ISO 4217 code mapping
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  '€': 'EUR',
  $: 'USD',
  '£': 'GBP',
  '¥': 'JPY',
  '₹': 'INR',
  '₣': 'CHF',
  CHF: 'CHF',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  JPY: 'JPY',
  INR: 'INR',
}

/**
 * Category keywords for inference
 */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: [
    'dinner',
    'lunch',
    'breakfast',
    'meal',
    'restaurant',
    'cafe',
    'coffee',
    'drinks',
    'groceries',
    'food',
  ],
  transport: ['taxi', 'uber', 'lyft', 'bus', 'train', 'flight', 'gas', 'petrol', 'parking'],
  accommodation: ['hotel', 'hostel', 'airbnb', 'rent', 'accommodation', 'room'],
  activity: ['tickets', 'museum', 'tour', 'attraction', 'cinema', 'movie', 'concert', 'show'],
  other: [],
}

/**
 * Extract currency from input text
 * Returns currency code and the position where it was found
 */
export function extractCurrency(input: string): { currency: string; position: number } | null {
  // Check for currency symbols
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    const index = input.indexOf(symbol)
    if (index !== -1) {
      return { currency: code, position: index }
    }
  }

  return null
}

/**
 * Extract amount from input text
 * Handles various formats:
 * - 60, 60.50, 60,50
 * - 1,000.50 (US format)
 * - 1.000,50 (EU format)
 * - 2500
 */
export function extractAmount(
  input: string,
  decimalFormat: 'US' | 'EU' = 'US'
): {
  amount: number
  position: number
} | null {
  // Patterns for different number formats (ordered by specificity)
  const patterns =
    decimalFormat === 'US'
      ? [
          // US format patterns (most specific first)
          /(\d{1,3}(?:,\d{3})+\.\d{2})/g, // 1,000.50
          /(\d{1,3}(?:,\d{3})+)/g, // 1,000
          /(\d+\.\d{2})/g, // 60.50
          /(\d+)/g, // 2500, 60
        ]
      : [
          // EU format patterns (most specific first)
          /(\d{1,3}(?:\.\d{3})+,\d{2})/g, // 1.000,50
          /(\d{1,3}(?:\.\d{3})+)/g, // 1.000
          /(\d+,\d{2})/g, // 60,50
          /(\d+)/g, // 2500, 60
        ]

  // Try each pattern in order of specificity
  for (const pattern of patterns) {
    const matches = Array.from(input.matchAll(pattern))
    if (matches.length > 0) {
      // Use the first match from the most specific pattern
      const match = matches[0]
      let amountStr = match[1]

      // Parse based on format
      if (decimalFormat === 'US') {
        // Remove commas, keep period as decimal
        amountStr = amountStr.replace(/,/g, '')
      } else {
        // Remove periods, replace comma with period
        amountStr = amountStr.replace(/\./g, '').replace(/,/, '.')
      }

      const amount = parseFloat(amountStr)

      if (isNaN(amount)) {
        continue // Try next pattern
      }

      return {
        amount,
        position: match.index || 0,
      }
    }
  }

  return null
}

/**
 * Extract split count from input
 * Examples:
 * - "split 4 ways" → 4
 * - "divide 3 ways" → 3
 * - "5 people" → 5
 * - "split equally 6" → 6
 */
export function extractSplitCount(input: string): number | null {
  // Pattern: number followed by "ways", "people", "person"
  const patterns = [
    /(\d+)\s*(?:ways?|people|persons?)/i,
    /(?:split|divide|share|shared)\s+(?:equally|evenly)?\s*(\d+)/i,
    /(\d+)\s*(?:way|person|people)\s+(?:split|shared?)/i,
    /(?:between|among)\s+(\d+)/i,
  ]

  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match) {
      const count = parseInt(match[1], 10)
      if (!isNaN(count) && count > 0 && count < 100) {
        return count
      }
    }
  }

  return null
}

/**
 * Extract participant names from input
 * Looks for capitalized words and common name patterns
 * Examples:
 * - "split between Alice, Bob, Carol" → ['Alice', 'Bob', 'Carol']
 * - "Alice paid" → ['Alice']
 */
export function extractNames(input: string): string[] {
  const names: string[] = []

  // Pattern 1: "with name1,name2 and name3" (conversational list, case-insensitive)
  const withMatch = input.match(/\bwith\s+([\w\s,]+?)(?:\.\s+|$)/i)
  if (withMatch) {
    const namesStr = withMatch[1]
    const extracted = namesStr
      .split(/(?:,\s*|\s+and\s+)/) // Split by comma or "and"
      .map(n => n.trim())
      .filter(n => {
        // Filter out noise words and ensure it looks like a name (2-20 chars, letters only)
        const normalized = n.toLowerCase()
        const noiseWords = ['the', 'a', 'an', 'with', 'paid', 'split', 'owes']
        return (
          n.length >= 2 && n.length <= 20 && /^[a-z]+$/i.test(n) && !noiseWords.includes(normalized)
        )
      })
      .map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()) // Capitalize
    names.push(...extracted)
  }

  // Pattern 2: "between Name1, Name2, and Name3"
  const betweenMatch = input.match(/between\s+([\w\s,]+?)(?:\s+and\s+|$)/i)
  if (betweenMatch) {
    const namesStr = betweenMatch[1]
    const extracted = namesStr
      .split(/,\s*/)
      .map(n => n.trim())
      .filter(n => n.length > 0 && /^[a-z]+$/i.test(n)) // Accept any case
      .map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()) // Capitalize
    names.push(...extracted)
  }

  // Pattern 3: Capitalized words (potential names) - existing logic
  const capitalizedWords = input.match(/\b[A-Z][a-z]+\b/g)
  if (capitalizedWords) {
    // Filter out common non-name capitalized words (including common expense descriptions)
    const nonNames = [
      'I',
      'Me',
      'My',
      'The',
      'A',
      'An',
      'This',
      'That',
      'Split',
      'Paid',
      'Owes',
      // Common expense descriptions/categories
      'Dinner',
      'Lunch',
      'Breakfast',
      'Meal',
      'Restaurant',
      'Cafe',
      'Coffee',
      'Drinks',
      'Groceries',
      'Food',
      'Taxi',
      'Uber',
      'Lyft',
      'Bus',
      'Train',
      'Flight',
      'Gas',
      'Petrol',
      'Parking',
      'Hotel',
      'Hostel',
      'Airbnb',
      'Rent',
      'Accommodation',
      'Room',
      'Tickets',
      'Museum',
      'Tour',
      'Attraction',
      'Cinema',
      'Movie',
      'Concert',
      'Show',
    ]
    const filteredNames = capitalizedWords.filter(word => !nonNames.includes(word))
    names.push(...filteredNames)
  }

  // Remove duplicates
  return Array.from(new Set(names))
}

/**
 * Extract payer from input
 * Examples:
 * - "I paid" → "I"
 * - "Alice paid" → "Alice"
 * - "Bob owes" → extracted from context
 */
export function extractPayer(input: string): string | null {
  // Pattern 1: "I paid" or "I paid for"
  if (/\b(?:I|me)\s+paid\b/i.test(input)) {
    return 'I'
  }

  // Pattern 2: "Name paid" (case-insensitive, captures lowercase names too)
  const paidMatch = input.match(/\b([a-z]+)\s+paid\b/i)
  if (paidMatch) {
    // Capitalize first letter for consistency
    const name = paidMatch[1]
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  }

  // Pattern 3: "Name paid for" (case-insensitive)
  const paidForMatch = input.match(/\b([a-z]+)\s+paid\s+for\b/i)
  if (paidForMatch) {
    // Capitalize first letter for consistency
    const name = paidForMatch[1]
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  }

  return null
}

/**
 * Detect split type from input
 * - "split equally" → 'equal'
 * - "split X ways" → 'equal'
 * - "everyone pays their share" → 'custom'
 * - "owes half" → 'custom'
 */
export type RawSplitType = 'equal' | 'custom' | 'percentage' | 'shares' | 'none'

export function detectSplitType(input: string): RawSplitType {
  // Equal splits
  if (/(?:split|divide|shared?)\s+(?:equally|evenly)/i.test(input)) {
    return 'equal'
  }

  if (/(?:split|divide|share)\s+\d+\s*ways?/i.test(input)) {
    return 'equal'
  }

  if (/\d+\s*(?:people|persons?)\s*(?:split|shared?)/i.test(input)) {
    return 'equal'
  }

  if (/(?:we|let's)\s+split/i.test(input)) {
    return 'equal'
  }

  // Percentage or share-based splits
  if (/\d+%/i.test(input)) {
    return 'percentage'
  }

  if (/(?:their\s+share|each\s+person\s+pays|everyone\s+pays)/i.test(input)) {
    return 'shares'
  }

  // Custom splits
  if (/(?:owes?|owe)\s+(?:half|quarter)/i.test(input)) {
    return 'custom'
  }

  if (/(?:everyone|each\s+person)\s+pays(?:\s+their\s+share)?/i.test(input)) {
    return 'custom'
  }

  if (/split\s+(?:between|among)/i.test(input)) {
    return 'equal' // Assume equal unless specified
  }

  // Check if there's any split keyword
  if (/split|divide|share|between|among|shared/i.test(input)) {
    return 'equal'
  }

  return 'none'
}

export function normalizeSplitType(
  splitType: RawSplitType
): 'equal' | 'percentage' | 'custom' | 'none' {
  if (splitType === 'shares') {
    return 'percentage'
  }

  return splitType
}

/**
 * Infer category from description keywords
 * Returns category and confidence (0-1)
 */
export function inferCategory(
  description: string
): { category: string; confidence: number } | null {
  const lowerDesc = description.toLowerCase()

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        // Confidence based on keyword specificity
        const confidence = keyword.length > 5 ? 0.7 : 0.5
        return { category, confidence }
      }
    }
  }

  return null
}

/**
 * Extract description from input
 * Removes currency, amount, and split-related keywords
 */
export function extractDescription(input: string): string {
  let description = input

  // Special case: If there's a payer clause at the end (e.g., "dinner with names. jack paid 60USD")
  // Extract everything BEFORE the payer/amount clause
  const payerClauseMatch = input.match(/^(.+?)\.?\s+[a-z]+\s+paid\s+[\d€$£¥₹₣]+/i)
  if (payerClauseMatch) {
    // Return everything before the payer clause, with trailing period if present
    description = payerClauseMatch[1].trim()
    if (!description.endsWith('.')) {
      description += '.'
    }
    // Keep the conversational part intact (e.g., "dinner with liz,jack and tracy.")
    return description || 'Expense'
  }

  // Otherwise, use the original cleaning logic
  // Remove currency symbols
  description = description.replace(/[€$£¥₹₣]/g, '')

  // Remove currency codes
  description = description.replace(/\b(USD|EUR|GBP|JPY|CHF|INR)\b/gi, '')

  // Remove amounts (numbers with optional decimal)
  description = description.replace(/\d{1,3}(?:[,]\d{3})*(?:[,.]\d{2})?/g, '')

  // Remove split keywords and phrases
  description = description.replace(
    /\b(?:split|divide|share|equally|evenly|between|paid|owes?|owe)\b/gi,
    ''
  )
  description = description.replace(/\d+\s*(?:ways?|people|persons?)/gi, '')

  // Remove standalone "ways" that might remain (e.g., "lunch ways" → "lunch")
  description = description.replace(/\s+ways?\b/gi, '')

  // Remove payer indicators
  description = description.replace(/\b(?:I|me|my)\s+(?:paid|owe|owes?)\b/gi, '')

  // Remove extra whitespace
  description = description.replace(/\s+/g, ' ').trim()

  // Remove leading/trailing punctuation (but keep meaningful periods)
  description = description.replace(/^[,\s]+|[,\s]+$/g, '')

  return description || 'Expense'
}
