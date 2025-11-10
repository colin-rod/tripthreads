/**
 * Natural Language Parser Types
 *
 * Type definitions for parsing natural language input for expenses,
 * itinerary items, and date/time expressions.
 */

/**
 * Parsed date/time result from natural language input
 */
export interface ParsedDateTime {
  /**
   * The parsed date object
   */
  date: Date

  /**
   * Whether the input included a specific time (e.g., "9am", "3:30pm")
   * If false, time defaults to start of day or an approximate time
   */
  hasTime: boolean

  /**
   * Whether the input represents a date range (e.g., "Dec 15-20", "Friday to Sunday")
   */
  isRange: boolean

  /**
   * End date if this is a range, undefined otherwise
   */
  endDate?: Date

  /**
   * Confidence score from 0-1 indicating parser certainty
   * - 1.0: High confidence (absolute date like "2024-12-15")
   * - 0.8-0.9: Good confidence (specific relative like "next Monday")
   * - 0.5-0.7: Medium confidence (ambiguous like "15/12" could be MM/DD or DD/MM)
   * - 0.3-0.4: Low confidence (vague like "afternoon", "soon")
   */
  confidence: number

  /**
   * Original input text that was parsed
   */
  originalText: string

  /**
   * Format detected (helps with debugging and user feedback)
   */
  detectedFormat?: 'absolute' | 'relative' | 'time' | 'range' | 'ambiguous'
}

/**
 * Options for configuring the date parser behavior
 */
export interface DateParserOptions {
  /**
   * Reference date for relative date calculations (defaults to now)
   */
  referenceDate?: Date

  /**
   * Preferred date format interpretation
   * - 'US': MM/DD/YYYY (default)
   * - 'EU': DD/MM/YYYY
   * - 'auto': Attempt to detect from context
   */
  dateFormat?: 'US' | 'EU' | 'auto'

  /**
   * Timezone for date parsing (defaults to system timezone)
   */
  timezone?: string
}

/**
 * Result type for parser functions that may fail
 */
export type ParserResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Parsed expense result from natural language input
 */
export interface ParsedExpense {
  /**
   * The amount in minor units (cents, pence, etc.)
   * Example: 60.50 EUR → 6050
   */
  amount: number

  /**
   * ISO 4217 currency code
   * Examples: 'EUR', 'USD', 'GBP', 'JPY', 'CHF'
   */
  currency: string

  /**
   * Description of the expense (extracted from input)
   * Example: "Dinner €60 split 4 ways" → "Dinner"
   */
  description: string

  /**
   * Inferred category (optional, low confidence)
   * Examples: 'food', 'transport', 'accommodation', 'activity', 'other'
   */
  category?: string

  /**
   * Identified payer (name or "I"/"me")
   * Example: "Alice paid $120" → "Alice"
   * Example: "I paid €30" → "I"
   */
  payer?: string

  /**
   * Type of split
   * - 'equal': Split equally among participants
   * - 'percentage': Split by percentage (e.g., 60/40)
   * - 'custom': Custom amounts per person
   * - 'none': No split (one person pays all)
   */
  splitType: 'equal' | 'percentage' | 'custom' | 'none'

  /**
   * Number of people to split among (for equal splits)
   * Example: "split 4 ways" → 4
   */
  splitCount?: number

  /**
   * Extracted participant names (for equal splits)
   * Example: "split between Alice, Bob, Carol" → ['Alice', 'Bob', 'Carol']
   */
  participants?: string[]

  /**
   * Custom split amounts per participant (in minor units)
   * Used when splitType is 'custom'
   * Example: "Trevor owes 40, Bill owes 20" → [{name: 'Trevor', amount: 4000}, {name: 'Bill', amount: 2000}]
   */
  customSplits?: Array<{
    name: string
    amount: number
  }>

  /**
   * Percentage split per participant
   * Used when splitType is 'percentage'
   * Example: "Alice 60%, Bob 40%" → [{name: 'Alice', percentage: 60}, {name: 'Bob', percentage: 40}]
   */
  percentageSplits?: Array<{
    name: string
    percentage: number
  }>

  /**
   * Confidence score from 0-1
   * - 1.0: All components clearly identified
   * - 0.8-0.9: Most components identified
   * - 0.5-0.7: Some ambiguity (e.g., unclear split)
   * - <0.5: High ambiguity or missing key data
   */
  confidence: number

  /**
   * Original input text that was parsed
   */
  originalText: string
}

/**
 * Options for configuring the expense parser behavior
 */
export interface ExpenseParserOptions {
  /**
   * Default currency if none detected
   * Default: 'USD'
   */
  defaultCurrency?: string

  /**
   * Decimal separator ('.' or ',')
   * - 'US': period (1,000.50)
   * - 'EU': comma (1.000,50)
   * Default: 'US'
   */
  decimalFormat?: 'US' | 'EU'
}

/**
 * Request to parse input using an LLM
 */
export interface LLMParseRequest {
  /**
   * Natural language input to parse
   */
  input: string

  /**
   * Type of parser to use
   */
  parserType: 'date' | 'expense'

  /**
   * Options for the parser
   */
  options?: DateParserOptions | ExpenseParserOptions

  /**
   * LLM model to use (default: "phi3:mini")
   */
  model?: string
}

/**
 * Result from LLM parsing
 */
export interface LLMParserResult {
  /**
   * Whether the parse was successful
   */
  success: boolean

  /**
   * Parsed date result (if parserType was 'date')
   */
  dateResult?: ParsedDateTime

  /**
   * Parsed expense result (if parserType was 'expense')
   */
  expenseResult?: ParsedExpense

  /**
   * Model used for parsing
   */
  model: string

  /**
   * Time taken to parse (milliseconds)
   */
  latencyMs: number

  /**
   * Number of tokens used (if available)
   */
  tokensUsed?: number

  /**
   * Raw LLM output (for debugging)
   */
  rawOutput: string

  /**
   * Error message if parsing failed
   */
  error?: string

  /**
   * More specific error type
   */
  errorType?:
    | 'ollama_not_running'
    | 'model_not_found'
    | 'timeout'
    | 'parse_error'
    | 'internal_error'

  /**
   * Additional error details (e.g., installation instructions)
   */
  errorDetails?: string
}

/**
 * Result from spaCy parsing (via Python FastAPI microservice)
 */
export interface SpacyParserResult extends ParsedExpense {
  /**
   * Source identifier
   */
  source: 'spacy'

  /**
   * Time taken to parse (milliseconds)
   */
  latencyMs?: number

  /**
   * Debug information from spaCy
   */
  debug?: {
    /**
     * Named entities detected by spaCy NER
     * Examples: {"text": "Jack", "label": "PERSON"}
     */
    entities: Array<{
      text: string
      label: string
    }>

    /**
     * POS (Part-of-Speech) tags for tokens
     * Examples: [["dinner", "NOUN"], ["paid", "VERB"]]
     */
    pos_tags: Array<[string, string]>
  }

  /**
   * Error message if parsing failed
   */
  error?: string
}

// ============================================================
// Reinforcement Learning Types (CRO-864)
// ============================================================

/**
 * User action taken on a parsed result
 */
export type UserAction = 'instant_confirm' | 'minor_edit' | 'major_edit' | 'reject'

/**
 * Pattern weight information for RL parser
 */
export interface PatternWeight {
  id: string
  pattern_regex: string
  pattern_type: 'currency' | 'amount' | 'split' | 'payer' | 'description' | 'date'
  weight: number
  success_count: number
  failure_count: number
  avg_reward: number
  total_uses: number
  last_used_at?: string
  parser_version: string
  created_at: string
  updated_at: string
}

/**
 * Matched pattern information returned by RL parser
 */
export interface MatchedPattern {
  pattern_regex: string
  pattern_type: string
  weight: number
  match: string // The actual matched text
}

/**
 * Result from RL-enhanced parser
 */
export interface RLParserResult extends ParsedExpense {
  /**
   * Source identifier
   */
  source: 'rl'

  /**
   * Patterns that matched during parsing
   */
  matchedPatterns?: MatchedPattern[]

  /**
   * Time taken to parse (milliseconds)
   */
  latencyMs?: number

  /**
   * Parser version used
   */
  parserVersion: string

  /**
   * Whether pattern weights were loaded successfully
   */
  weightsLoaded: boolean
}

/**
 * Feedback signal for reinforcement learning
 */
export interface FeedbackSignal {
  id?: string
  user_id: string
  trip_id?: string
  message: string
  context?: Record<string, unknown>
  parsed_output: ParsedExpense | ParsedDateTime
  parser_version: string
  user_action: UserAction
  edited_fields?: string[]
  time_to_confirm?: number // Milliseconds
  reward: number
  matched_patterns?: string[]
  created_at?: string
}

/**
 * Input for reward calculation
 */
export interface RewardCalculationInput {
  user_action: UserAction
  time_to_confirm?: number // Milliseconds
  parser_confidence: number // 0-1
  edited_fields?: string[]
}

/**
 * Result of reward calculation
 */
export interface RewardCalculationResult {
  reward: number
  breakdown: {
    base_reward: number
    speed_bonus: number
    confidence_penalty: number
  }
}

/**
 * Daily metrics for RL system performance
 */
export interface DailyMetrics {
  id: string
  date: string // YYYY-MM-DD
  total_signals: number
  instant_confirms: number
  minor_edits: number
  major_edits: number
  rejects: number
  avg_reward: number
  avg_confidence: number
  patterns_discovered: number
  patterns_updated: number
  avg_time_to_confirm?: number
  speed_bonus_rate?: number
  parser_version: string
  created_at: string
  updated_at: string
}

/**
 * Correction detail for a single field
 */
export interface FieldCorrection {
  field: string // 'amount' | 'currency' | 'description' | 'split' | 'payer' | 'participants'
  parsed_value: unknown // Original value from parser
  corrected_value: unknown // User-corrected value
  pattern_regex?: string // Pattern that extracted this field (if tracked)
  failure_type?: 'extraction_error' | 'recognition_error' | 'ambiguity' // Why it was wrong
}

/**
 * Corrected values provided by user (for minor_edit, major_edit)
 */
export interface CorrectedExpense {
  amount?: number // Corrected amount in minor units (cents)
  currency?: string // Corrected currency code
  description?: string // Corrected description
  split?: {
    type: 'equal' | 'percentage' | 'amount' | 'custom'
    value?: number
    participants?: string[]
    customSplits?: Array<{ name: string; amount: number }>
  }
  payer?: string // Corrected payer name
  participants?: string[] // Corrected participants list
}

/**
 * Enhanced feedback signal with correction data
 */
export interface FeedbackSignalWithCorrections extends FeedbackSignal {
  corrected_values?: CorrectedExpense
  correction_details?: FieldCorrection[]
  failure_classification?: 'extraction_error' | 'recognition_error' | 'ambiguity'
}

// ============================================================
// Participant Name Matching Types (Fuzzy Matching)
// ============================================================

/**
 * Type of match found when resolving participant names
 */
export type NameMatchType = 'exact' | 'partial' | 'fuzzy' | 'initials'

/**
 * A single name match result with confidence score
 */
export interface NameMatch {
  /**
   * User ID of the matched trip participant
   */
  userId: string

  /**
   * Full name of the matched participant
   */
  fullName: string

  /**
   * Confidence score from 0-1
   * - 1.0: Exact match (case-insensitive)
   * - 0.9: Partial match (full name contains input)
   * - 0.7-0.9: Fuzzy match (typo or similarity)
   * - 0.6: Initials match
   * - <0.6: Not a match
   */
  confidence: number

  /**
   * Type of match found
   */
  matchType: NameMatchType

  /**
   * Additional metadata for debugging
   */
  metadata?: {
    /**
     * Raw similarity score (if fuzzy matching)
     */
    similarityScore?: number

    /**
     * Which part of the name matched (for partial matches)
     */
    matchedPart?: 'full' | 'first' | 'last' | 'initials'
  }
}

/**
 * Result of matching a single parsed name to trip participants
 */
export interface ParticipantMatch {
  /**
   * Original parsed name from natural language input
   */
  input: string

  /**
   * All potential matches, sorted by confidence (descending)
   */
  matches: NameMatch[]

  /**
   * Whether this name has ambiguous matches
   * (multiple matches with confidence > 0.7)
   */
  isAmbiguous: boolean

  /**
   * Whether this name has no good matches
   * (no matches with confidence >= 0.6)
   */
  isUnmatched: boolean

  /**
   * The best match (if available)
   * Same as matches[0] but for convenience
   */
  bestMatch?: NameMatch
}

/**
 * Complete result of resolving all participant names
 */
export interface ParticipantResolutionResult {
  /**
   * Individual match results for each parsed name
   */
  matches: ParticipantMatch[]

  /**
   * Whether any names are ambiguous and need user disambiguation
   */
  hasAmbiguous: boolean

  /**
   * Whether any names are unmatched and need user selection
   */
  hasUnmatched: boolean

  /**
   * Whether all names were successfully auto-resolved
   * (all matches have confidence >= 0.85 and are unique)
   */
  isFullyResolved: boolean

  /**
   * Resolved user IDs (only present if fully resolved)
   * Maps to the best match for each input name
   */
  resolvedUserIds?: string[]
}

/**
 * Options for name matching behavior
 */
export interface NameMatcherOptions {
  /**
   * Minimum confidence threshold to consider a match
   * Default: 0.6
   */
  minConfidence?: number

  /**
   * Confidence threshold for auto-resolution
   * (match must be >= this AND be the only match above minConfidence)
   * Default: 0.85
   */
  autoResolveThreshold?: number

  /**
   * Whether to normalize accents (é → e, ñ → n)
   * Default: true
   */
  normalizeAccents?: boolean

  /**
   * Whether to match on initials
   * Default: true
   */
  matchInitials?: boolean
}

/**
 * Trip participant data for name matching
 */
export interface TripParticipant {
  /**
   * User ID (UUID)
   */
  user_id: string

  /**
   * Full name of the participant
   */
  full_name: string
}
