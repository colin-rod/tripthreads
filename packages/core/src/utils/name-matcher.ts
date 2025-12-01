/**
 * Participant Name Matcher
 *
 * Fuzzy matching utility for resolving natural language participant names
 * (e.g., "Alice", "Bob") to actual trip participant user IDs.
 *
 * Features:
 * - Exact matching (case-insensitive)
 * - Partial matching (first name, last name)
 * - Fuzzy matching (typos, similarity)
 * - Initials matching
 * - Accent normalization
 * - Confidence scoring
 *
 * @example
 * ```typescript
 * const participants = [
 *   { user_id: 'uuid1', full_name: 'Alice Smith' },
 *   { user_id: 'uuid2', full_name: 'Bob Jones' }
 * ]
 *
 * const result = matchParticipantNames(['Alice', 'Bob'], participants)
 * // Result: Full resolution with confidence scores
 * ```
 */

import { compareTwoStrings } from 'string-similarity'
import type {
  NameMatch,
  ParticipantMatch,
  ParticipantResolutionResult,
  NameMatcherOptions,
  TripParticipant,
} from '../types/parser'

/**
 * Default configuration for name matching
 */
const DEFAULT_OPTIONS: Required<NameMatcherOptions> = {
  minConfidence: 0.6,
  autoResolveThreshold: 0.85,
  normalizeAccents: true,
  matchInitials: true,
}

/**
 * Normalize a string for comparison
 * - Converts to lowercase
 * - Optionally removes accents (é → e, ñ → n)
 * - Trims whitespace
 */
function normalizeString(str: string, removeAccents: boolean = true): string {
  let normalized = str.toLowerCase().trim()

  if (removeAccents) {
    // Normalize unicode to decomposed form (NFD), then remove combining diacritical marks
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  return normalized
}

/**
 * Extract initials from a full name
 * @example "Alice Smith" → "AS"
 * @example "José María García" → "JMG"
 */
function extractInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}

/**
 * Check if a full name contains the input as a word or partial word
 * Handles cases like: "Alice" in "Alice Smith", "Rob" in "Robert Williams"
 */
function isPartialMatch(input: string, fullName: string, normalizeAccents: boolean): boolean {
  const normalizedInput = normalizeString(input, normalizeAccents)
  const normalizedFull = normalizeString(fullName, normalizeAccents)

  // Check if full name contains the input as a complete word
  const words = normalizedFull.split(/\s+/)
  if (words.some(word => word === normalizedInput)) {
    return true
  }

  // Check if any word starts with the input (for partial names like "Rob" → "Robert")
  if (words.some(word => word.startsWith(normalizedInput))) {
    return true
  }

  return false
}

/**
 * Match a single parsed name against all trip participants
 * Returns all potential matches with confidence scores, sorted by confidence (descending)
 */
function matchSingleName(
  parsedName: string,
  tripParticipants: TripParticipant[],
  options: Required<NameMatcherOptions>
): NameMatch[] {
  const matches: NameMatch[] = []
  const normalizedInput = normalizeString(parsedName, options.normalizeAccents)

  for (const participant of tripParticipants) {
    const normalizedFullName = normalizeString(participant.full_name, options.normalizeAccents)

    // 1. Exact match (case-insensitive)
    if (normalizedInput === normalizedFullName) {
      matches.push({
        userId: participant.user_id,
        fullName: participant.full_name,
        confidence: 1.0,
        matchType: 'exact',
        metadata: {
          matchedPart: 'full',
        },
      })
      continue
    }

    // 2. Partial match (full name contains input)
    if (isPartialMatch(parsedName, participant.full_name, options.normalizeAccents)) {
      matches.push({
        userId: participant.user_id,
        fullName: participant.full_name,
        confidence: 0.9,
        matchType: 'partial',
        metadata: {
          matchedPart: 'first', // Could be refined to detect which part
        },
      })
      continue
    }

    // 3. Fuzzy match (typos, similarity)
    // Use Dice coefficient for similarity (string-similarity library)
    const similarityScore = compareTwoStrings(normalizedInput, normalizedFullName)

    // Also check similarity against individual name parts (first, last)
    const nameParts = normalizedFullName.split(/\s+/)
    const partSimilarities = nameParts.map(part => compareTwoStrings(normalizedInput, part))
    const maxPartSimilarity = Math.max(...partSimilarities, 0)

    // Use the higher similarity score
    const bestSimilarity = Math.max(similarityScore, maxPartSimilarity)

    // Fuzzy match threshold: 0.7 (maps to confidence 0.7-0.9)
    if (bestSimilarity >= 0.7) {
      const confidence = Math.min(0.7 + (bestSimilarity - 0.7) * 0.5, 0.9) // Scale to 0.7-0.9

      matches.push({
        userId: participant.user_id,
        fullName: participant.full_name,
        confidence,
        matchType: 'fuzzy',
        metadata: {
          similarityScore: bestSimilarity,
          matchedPart: maxPartSimilarity > similarityScore ? 'first' : 'full',
        },
      })
      continue
    }

    // 4. Initials match (if enabled)
    if (options.matchInitials) {
      const initials = extractInitials(participant.full_name)
      const normalizedInitials = initials.toLowerCase()

      if (normalizedInput === normalizedInitials) {
        matches.push({
          userId: participant.user_id,
          fullName: participant.full_name,
          confidence: 0.6,
          matchType: 'initials',
          metadata: {
            matchedPart: 'initials',
          },
        })
      }
    }
  }

  // Filter by minimum confidence and sort by confidence (descending)
  return matches
    .filter(match => match.confidence >= options.minConfidence)
    .sort((a, b) => b.confidence - a.confidence)
}

/**
 * Determine if a match result is ambiguous
 * (multiple matches with confidence > 0.7)
 */
function isAmbiguous(matches: NameMatch[]): boolean {
  const highConfidenceMatches = matches.filter(m => m.confidence > 0.7)
  return highConfidenceMatches.length > 1
}

/**
 * Determine if a match result is unmatched
 * (no matches with confidence >= 0.6)
 */
function isUnmatched(matches: NameMatch[]): boolean {
  return matches.length === 0
}

/**
 * Match multiple parsed names against trip participants
 *
 * @param parsedNames - Array of names extracted from natural language input
 * @param tripParticipants - Array of trip participants with user_id and full_name
 * @param options - Optional configuration for matching behavior
 * @returns Complete resolution result with match details for each name
 *
 * @example
 * ```typescript
 * const result = matchParticipantNames(
 *   ['Alice', 'Bob'],
 *   [
 *     { user_id: 'uuid1', full_name: 'Alice Smith' },
 *     { user_id: 'uuid2', full_name: 'Bob Jones' }
 *   ]
 * )
 *
 * if (result.isFullyResolved) {
 *   console.log('Resolved user IDs:', result.resolvedUserIds)
 * } else if (result.hasAmbiguous) {
 *   console.log('Need disambiguation for:', result.matches.filter(m => m.isAmbiguous))
 * } else if (result.hasUnmatched) {
 *   console.log('Unmatched names:', result.matches.filter(m => m.isUnmatched))
 * }
 * ```
 */
export function matchParticipantNames(
  parsedNames: string[],
  tripParticipants: TripParticipant[],
  options: NameMatcherOptions = {}
): ParticipantResolutionResult {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }

  // Match each parsed name
  const matches: ParticipantMatch[] = parsedNames.map(name => {
    const nameMatches = matchSingleName(name, tripParticipants, mergedOptions)

    return {
      input: name,
      matches: nameMatches,
      isAmbiguous: isAmbiguous(nameMatches),
      isUnmatched: isUnmatched(nameMatches),
      bestMatch: nameMatches[0], // First match is best (sorted by confidence)
    }
  })

  // Determine overall resolution status
  const hasAmbiguous = matches.some(m => m.isAmbiguous)
  const hasUnmatched = matches.some(m => m.isUnmatched)

  // Check if all names can be auto-resolved
  const isFullyResolved = matches.every(m => {
    // Must have exactly one high-confidence match
    if (m.matches.length === 0) return false
    if (m.isAmbiguous) return false

    const bestMatch = m.matches[0]
    return bestMatch.confidence >= mergedOptions.autoResolveThreshold
  })

  // Extract resolved user IDs if fully resolved
  const resolvedUserIds = isFullyResolved ? matches.map(m => m.bestMatch!.userId) : undefined

  return {
    matches,
    hasAmbiguous,
    hasUnmatched,
    isFullyResolved,
    resolvedUserIds,
  }
}

/**
 * Helper function to match a single parsed name (for simple cases)
 * Returns the best match or null if no good match found
 *
 * @example
 * ```typescript
 * const match = matchSingleParticipantName('Alice', participants)
 * if (match && match.confidence >= 0.85) {
 *   console.log('Resolved to:', match.fullName)
 * }
 * ```
 */
export function matchSingleParticipantName(
  parsedName: string,
  tripParticipants: TripParticipant[],
  options: NameMatcherOptions = {}
): NameMatch | null {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }
  const matches = matchSingleName(parsedName, tripParticipants, mergedOptions)

  return matches[0] || null
}
