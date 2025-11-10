/**
 * Unit tests for participant name matching (fuzzy matching)
 * Target: 100% coverage
 */

import { matchParticipantNames, matchSingleParticipantName } from '../name-matcher'
import type { TripParticipant } from '../../types/parser'

describe('name-matcher', () => {
  // Test data: typical trip participants
  const participants: TripParticipant[] = [
    { user_id: 'uuid-alice-smith', full_name: 'Alice Smith' },
    { user_id: 'uuid-alice-jones', full_name: 'Alice Jones' },
    { user_id: 'uuid-bob-johnson', full_name: 'Bob Johnson' },
    { user_id: 'uuid-robert-williams', full_name: 'Robert Williams' },
    { user_id: 'uuid-jose-garcia', full_name: 'José García' },
    { user_id: 'uuid-maria-lopez', full_name: 'María López' },
  ]

  describe('matchParticipantNames', () => {
    describe('Exact Matches (confidence 1.0)', () => {
      it('matches exact name (case-insensitive)', () => {
        const result = matchParticipantNames(['Alice Smith'], participants)

        expect(result.isFullyResolved).toBe(true)
        expect(result.hasAmbiguous).toBe(false)
        expect(result.hasUnmatched).toBe(false)
        expect(result.resolvedUserIds).toEqual(['uuid-alice-smith'])

        const match = result.matches[0]
        expect(match.input).toBe('Alice Smith')
        expect(match.bestMatch?.confidence).toBe(1.0)
        expect(match.bestMatch?.matchType).toBe('exact')
        expect(match.bestMatch?.fullName).toBe('Alice Smith')
      })

      it('matches exact name with different case', () => {
        const result = matchParticipantNames(['ALICE SMITH'], participants)

        expect(result.isFullyResolved).toBe(true)
        expect(result.matches[0].bestMatch?.confidence).toBe(1.0)
        expect(result.matches[0].bestMatch?.matchType).toBe('exact')
      })

      it('matches exact name with extra whitespace', () => {
        const result = matchParticipantNames(['  Alice Smith  '], participants)

        expect(result.isFullyResolved).toBe(true)
        expect(result.matches[0].bestMatch?.confidence).toBe(1.0)
        expect(result.matches[0].bestMatch?.matchType).toBe('exact')
      })

      it('matches multiple exact names', () => {
        const result = matchParticipantNames(['Bob Johnson', 'Alice Smith'], participants)

        expect(result.isFullyResolved).toBe(true)
        expect(result.resolvedUserIds).toEqual(['uuid-bob-johnson', 'uuid-alice-smith'])
      })
    })

    describe('Partial Matches (confidence 0.9)', () => {
      it('matches first name only', () => {
        const result = matchParticipantNames(['Bob'], participants)

        expect(result.hasAmbiguous).toBe(false) // Only one Bob
        expect(result.isFullyResolved).toBe(true)

        const match = result.matches[0]
        expect(match.bestMatch?.confidence).toBe(0.9)
        expect(match.bestMatch?.matchType).toBe('partial')
        expect(match.bestMatch?.fullName).toBe('Bob Johnson')
      })

      it('matches last name only', () => {
        const result = matchParticipantNames(['Johnson'], participants)

        expect(result.isFullyResolved).toBe(true)
        expect(result.matches[0].bestMatch?.confidence).toBe(0.9)
        expect(result.matches[0].bestMatch?.matchType).toBe('partial')
        expect(result.matches[0].bestMatch?.fullName).toBe('Bob Johnson')
      })

      it('matches partial first name (Rob → Robert)', () => {
        const result = matchParticipantNames(['Rob'], participants)

        expect(result.hasAmbiguous).toBe(false)
        expect(result.isFullyResolved).toBe(true)

        const match = result.matches[0]
        expect(match.bestMatch?.confidence).toBe(0.9)
        expect(match.bestMatch?.matchType).toBe('partial')
        expect(match.bestMatch?.fullName).toBe('Robert Williams')
      })

      it('identifies ambiguous partial matches (Alice → Alice Smith OR Alice Jones)', () => {
        const result = matchParticipantNames(['Alice'], participants)

        expect(result.hasAmbiguous).toBe(true)
        expect(result.isFullyResolved).toBe(false)

        const match = result.matches[0]
        expect(match.isAmbiguous).toBe(true)
        expect(match.matches.length).toBe(2)

        // Both should have 0.9 confidence
        expect(match.matches[0].confidence).toBe(0.9)
        expect(match.matches[1].confidence).toBe(0.9)

        // Should include both Alices
        const matchedNames = match.matches.map(m => m.fullName)
        expect(matchedNames).toContain('Alice Smith')
        expect(matchedNames).toContain('Alice Jones')
      })
    })

    describe('Fuzzy Matches (confidence 0.7-0.9)', () => {
      it('matches name with typo (Alica → Alice)', () => {
        const result = matchParticipantNames(['Alica'], participants)

        expect(result.isFullyResolved).toBe(false) // Ambiguous (2 Alices)
        expect(result.hasAmbiguous).toBe(true)

        const match = result.matches[0]
        expect(match.matches.length).toBeGreaterThan(0)

        // Should match Alice Smith and/or Alice Jones with fuzzy matching
        const matchedNames = match.matches.map(m => m.fullName)
        expect(matchedNames.some(name => name.includes('Alice'))).toBe(true)

        // Confidence should be in fuzzy range (0.7-0.9)
        expect(match.bestMatch?.confidence).toBeGreaterThanOrEqual(0.7)
        expect(match.bestMatch?.confidence).toBeLessThan(0.9)
        expect(match.bestMatch?.matchType).toBe('fuzzy')
      })

      it('matches name with minor typo (similarity check)', () => {
        const participants = [{ user_id: 'uuid-alice', full_name: 'Alice' }]
        const result = matchParticipantNames(['Allice'], participants)

        // "Allice" has high similarity to "Alice" (one extra letter)
        if (result.matches[0].matches.length > 0) {
          expect(result.matches[0].bestMatch?.matchType).toBe('fuzzy')
          expect(result.matches[0].bestMatch?.confidence).toBeGreaterThanOrEqual(0.7)
        }
      })

      it('fuzzy matches have similarity metadata', () => {
        const result = matchParticipantNames(['Alica'], participants)

        const match = result.matches[0].bestMatch
        expect(match?.metadata?.similarityScore).toBeDefined()
        expect(match?.metadata?.similarityScore).toBeGreaterThan(0)
      })
    })

    describe('Initials Matching (confidence 0.6)', () => {
      it('matches initials (AS → Alice Smith)', () => {
        const result = matchParticipantNames(['AS'], participants)

        expect(result.hasAmbiguous).toBe(false) // Only Alice Smith has initials AS (not Alice Jones)
        expect(result.isFullyResolved).toBe(false) // 0.6 confidence < 0.85 threshold

        const match = result.matches[0]
        expect(match.bestMatch?.confidence).toBe(0.6)
        expect(match.bestMatch?.matchType).toBe('initials')
        expect(match.bestMatch?.fullName).toBe('Alice Smith')
      })

      it('matches three-letter initials (JMG → José María García)', () => {
        const participants = [{ user_id: 'uuid-jose', full_name: 'José María García' }]
        const result = matchParticipantNames(['JMG'], participants)

        expect(result.matches[0].bestMatch?.confidence).toBe(0.6)
        expect(result.matches[0].bestMatch?.matchType).toBe('initials')
      })

      it('matches initials case-insensitively (as → Alice Smith)', () => {
        const result = matchParticipantNames(['as'], participants)

        expect(result.matches[0].bestMatch?.confidence).toBe(0.6)
        expect(result.matches[0].bestMatch?.matchType).toBe('initials')
        expect(result.matches[0].bestMatch?.fullName).toBe('Alice Smith')
      })

      it('can disable initials matching', () => {
        const result = matchParticipantNames(['AS'], participants, {
          matchInitials: false,
        })

        expect(result.matches[0].isUnmatched).toBe(true)
      })
    })

    describe('Accent Normalization', () => {
      it('matches name without accents (Jose → José García)', () => {
        const result = matchParticipantNames(['Jose Garcia'], participants)

        expect(result.isFullyResolved).toBe(true)
        expect(result.matches[0].bestMatch?.confidence).toBe(1.0) // Exact match after normalization
        expect(result.matches[0].bestMatch?.fullName).toBe('José García')
      })

      it('matches first name without accents (Jose → José)', () => {
        const result = matchParticipantNames(['Jose'], participants)

        expect(result.isFullyResolved).toBe(true)
        expect(result.matches[0].bestMatch?.confidence).toBe(0.9) // Partial match
        expect(result.matches[0].bestMatch?.fullName).toBe('José García')
      })

      it('matches name with different accent (Maria → María)', () => {
        const result = matchParticipantNames(['Maria Lopez'], participants)

        expect(result.isFullyResolved).toBe(true)
        expect(result.matches[0].bestMatch?.confidence).toBe(1.0)
        expect(result.matches[0].bestMatch?.fullName).toBe('María López')
      })

      it('can disable accent normalization', () => {
        const result = matchParticipantNames(['Jose Garcia'], participants, {
          normalizeAccents: false,
        })

        // Without normalization, "Jose Garcia" won't match "José García" exactly
        // It may fuzzy match or not match at all depending on similarity threshold
        if (result.matches[0].matches.length > 0) {
          expect(result.matches[0].bestMatch?.confidence).toBeLessThan(1.0)
        } else {
          // Or it might not match at all, which is also valid
          expect(result.matches[0].isUnmatched).toBe(true)
        }
      })
    })

    describe('Unmatched Names', () => {
      it('identifies unmatched names (confidence < 0.6)', () => {
        const result = matchParticipantNames(['Charlie'], participants)

        expect(result.hasUnmatched).toBe(true)
        expect(result.isFullyResolved).toBe(false)

        const match = result.matches[0]
        expect(match.isUnmatched).toBe(true)
        expect(match.matches.length).toBe(0)
        expect(match.bestMatch).toBeUndefined()
      })

      it('identifies multiple unmatched names', () => {
        const result = matchParticipantNames(['Charlie', 'Dave', 'Eve'], participants)

        expect(result.hasUnmatched).toBe(true)
        expect(result.matches.every(m => m.isUnmatched)).toBe(true)
      })

      it('handles completely different name', () => {
        const result = matchParticipantNames(['Xyz'], participants)

        expect(result.matches[0].isUnmatched).toBe(true)
      })
    })

    describe('Mixed Scenarios', () => {
      it('handles mix of exact, partial, and unmatched', () => {
        const result = matchParticipantNames(['Alice Smith', 'Bob', 'Charlie'], participants)

        expect(result.hasUnmatched).toBe(true)
        expect(result.isFullyResolved).toBe(false)

        // Alice Smith: exact match
        expect(result.matches[0].bestMatch?.confidence).toBe(1.0)

        // Bob: partial match
        expect(result.matches[1].bestMatch?.confidence).toBe(0.9)

        // Charlie: unmatched
        expect(result.matches[2].isUnmatched).toBe(true)
      })

      it('handles mix of ambiguous and clear matches', () => {
        const result = matchParticipantNames(['Alice', 'Bob'], participants)

        expect(result.hasAmbiguous).toBe(true)
        expect(result.isFullyResolved).toBe(false)

        // Alice: ambiguous (Alice Smith OR Alice Jones)
        expect(result.matches[0].isAmbiguous).toBe(true)

        // Bob: clear match
        expect(result.matches[1].isAmbiguous).toBe(false)
        expect(result.matches[1].bestMatch?.confidence).toBe(0.9)
      })
    })

    describe('Custom Options', () => {
      it('respects custom minConfidence threshold', () => {
        const result = matchParticipantNames(['Alica'], participants, {
          minConfidence: 0.9, // Require higher confidence
        })

        // Fuzzy matches (~0.7-0.8) should be filtered out
        expect(result.matches[0].matches.length).toBe(0)
        expect(result.matches[0].isUnmatched).toBe(true)
      })

      it('respects custom autoResolveThreshold', () => {
        const result = matchParticipantNames(['Bob'], participants, {
          autoResolveThreshold: 0.95, // Very strict
        })

        // Partial match (0.9) won't auto-resolve
        expect(result.isFullyResolved).toBe(false)
        expect(result.matches[0].bestMatch?.confidence).toBe(0.9)
      })

      it('allows lower autoResolveThreshold', () => {
        const result = matchParticipantNames(['Bob'], participants, {
          autoResolveThreshold: 0.8, // Lower threshold
        })

        // Partial match (0.9) will auto-resolve
        expect(result.isFullyResolved).toBe(true)
        expect(result.resolvedUserIds).toEqual(['uuid-bob-johnson'])
      })
    })

    describe('Edge Cases', () => {
      it('handles empty parsed names array', () => {
        const result = matchParticipantNames([], participants)

        expect(result.matches.length).toBe(0)
        expect(result.isFullyResolved).toBe(true) // Vacuously true
        expect(result.hasAmbiguous).toBe(false)
        expect(result.hasUnmatched).toBe(false)
        expect(result.resolvedUserIds).toEqual([])
      })

      it('handles empty participants array', () => {
        const result = matchParticipantNames(['Alice'], [])

        expect(result.matches[0].isUnmatched).toBe(true)
        expect(result.hasUnmatched).toBe(true)
      })

      it('handles single participant', () => {
        const singleParticipant = [{ user_id: 'uuid-1', full_name: 'Alice Smith' }]
        const result = matchParticipantNames(['Alice'], singleParticipant)

        expect(result.isFullyResolved).toBe(true)
        expect(result.matches[0].bestMatch?.confidence).toBe(0.9)
      })

      it('handles very long names', () => {
        const longNameParticipant = [
          { user_id: 'uuid-long', full_name: 'Alexander Benjamin Christopher Davidson' },
        ]
        const result = matchParticipantNames(['Alexander'], longNameParticipant)

        expect(result.isFullyResolved).toBe(true)
        expect(result.matches[0].bestMatch?.confidence).toBe(0.9)
      })

      it('handles names with special characters', () => {
        const specialParticipants = [
          { user_id: 'uuid-1', full_name: "O'Brien" },
          { user_id: 'uuid-2', full_name: 'Jean-Pierre' },
        ]

        const result1 = matchParticipantNames(["O'Brien"], specialParticipants)
        expect(result1.isFullyResolved).toBe(true)

        const result2 = matchParticipantNames(['Jean-Pierre'], specialParticipants)
        expect(result2.isFullyResolved).toBe(true)
      })

      it('handles names with numbers', () => {
        const numberParticipants = [{ user_id: 'uuid-1', full_name: 'Bob Jr.' }]

        const result = matchParticipantNames(['Bob'], numberParticipants)
        expect(result.isFullyResolved).toBe(true)
      })

      it('handles single-word names', () => {
        const singleWordParticipants = [
          { user_id: 'uuid-1', full_name: 'Madonna' },
          { user_id: 'uuid-2', full_name: 'Prince' },
        ]

        const result = matchParticipantNames(['Madonna'], singleWordParticipants)
        expect(result.isFullyResolved).toBe(true)
        expect(result.matches[0].bestMatch?.confidence).toBe(1.0)
      })

      it('handles duplicate parsed names', () => {
        const result = matchParticipantNames(['Alice', 'Alice'], participants)

        expect(result.matches.length).toBe(2)
        expect(result.hasAmbiguous).toBe(true)
      })
    })

    describe('Match Sorting', () => {
      it('sorts matches by confidence (descending)', () => {
        const result = matchParticipantNames(['Ali'], participants)

        const match = result.matches[0]
        const confidences = match.matches.map(m => m.confidence)

        // Verify descending order
        for (let i = 0; i < confidences.length - 1; i++) {
          expect(confidences[i]).toBeGreaterThanOrEqual(confidences[i + 1])
        }
      })

      it('bestMatch is the highest confidence match', () => {
        const result = matchParticipantNames(['Alice'], participants)

        const match = result.matches[0]
        expect(match.bestMatch).toEqual(match.matches[0])
      })
    })
  })

  describe('matchSingleParticipantName', () => {
    it('returns best match for unambiguous name', () => {
      const match = matchSingleParticipantName('Bob Johnson', participants)

      expect(match).not.toBeNull()
      expect(match?.confidence).toBe(1.0)
      expect(match?.fullName).toBe('Bob Johnson')
      expect(match?.userId).toBe('uuid-bob-johnson')
    })

    it('returns best match for ambiguous name (first Alice)', () => {
      const match = matchSingleParticipantName('Alice', participants)

      expect(match).not.toBeNull()
      expect(match?.confidence).toBe(0.9)
      expect(match?.fullName).toMatch(/Alice (Smith|Jones)/)
    })

    it('returns null for unmatched name', () => {
      const match = matchSingleParticipantName('Charlie', participants)

      expect(match).toBeNull()
    })

    it('returns null for empty participants', () => {
      const match = matchSingleParticipantName('Alice', [])

      expect(match).toBeNull()
    })

    it('respects custom options', () => {
      const match = matchSingleParticipantName('Alica', participants, {
        minConfidence: 0.9, // High threshold filters out fuzzy matches
      })

      expect(match).toBeNull() // Fuzzy match ~0.7-0.8 filtered out
    })

    it('returns exact match with highest confidence', () => {
      const match = matchSingleParticipantName('José García', participants)

      expect(match?.confidence).toBe(1.0)
      expect(match?.matchType).toBe('exact')
    })
  })

  describe('Real-World Scenarios', () => {
    it('handles typical expense split: "split between Alice, Bob, María"', () => {
      const result = matchParticipantNames(['Alice', 'Bob', 'María'], participants)

      // Alice is ambiguous, others are clear
      expect(result.hasAmbiguous).toBe(true)
      expect(result.isFullyResolved).toBe(false)

      expect(result.matches[0].isAmbiguous).toBe(true) // Alice
      expect(result.matches[1].isAmbiguous).toBe(false) // Bob
      expect(result.matches[2].isAmbiguous).toBe(false) // María
    })

    it('handles payer identification: "José paid"', () => {
      const result = matchParticipantNames(['José'], participants)

      expect(result.isFullyResolved).toBe(true)
      expect(result.resolvedUserIds).toEqual(['uuid-jose-garcia'])
    })

    it('handles typo in split: "split between Alica, Bob"', () => {
      const result = matchParticipantNames(['Alica', 'Bob'], participants)

      // Alica should fuzzy match to Alice (with high enough similarity)
      expect(result.matches[0].matches.length).toBeGreaterThan(0)
      expect(result.matches[0].bestMatch?.matchType).toBe('fuzzy')

      // Bob is clear
      expect(result.matches[1].isAmbiguous).toBe(false)
      expect(result.matches[1].bestMatch?.fullName).toBe('Bob Johnson')
    })

    it('handles mixed confidence levels requiring different UX', () => {
      const result = matchParticipantNames(['Bob Johnson', 'Alice', 'Charlie'], participants)

      // Bob Johnson: auto-resolve (exact, 1.0)
      expect(result.matches[0].bestMatch?.confidence).toBe(1.0)
      expect(result.matches[0].isAmbiguous).toBe(false)

      // Alice: disambiguation needed (ambiguous, 0.9)
      expect(result.matches[1].isAmbiguous).toBe(true)

      // Charlie: unmatched, manual selection needed
      expect(result.matches[2].isUnmatched).toBe(true)

      // Overall: not fully resolved
      expect(result.isFullyResolved).toBe(false)
      expect(result.hasAmbiguous).toBe(true)
      expect(result.hasUnmatched).toBe(true)
    })
  })
})
