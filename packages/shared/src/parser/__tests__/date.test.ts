/**
 * Date/Time Parser Unit Tests
 *
 * TDD approach: Write failing tests first, then implement to make them pass.
 * Target: >80% accuracy on natural language date/time parsing
 */

import { describe, it, expect } from '@jest/globals'
import { parseNaturalDate } from '../date'

describe('parseNaturalDate', () => {
  // Fixed reference date for consistent testing
  const referenceDate = new Date('2024-12-10T12:00:00.000Z') // Tuesday, Dec 10, 2024 at noon UTC

  describe('Linear Test Cases (from CRO-846)', () => {
    it('parses "Monday 9am" → next Monday at 9:00', () => {
      const result = parseNaturalDate('Monday 9am', { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.date.getDay()).toBe(1) // Monday
      expect(result?.date.getHours()).toBe(9)
      expect(result?.date.getMinutes()).toBe(0)
      expect(result?.hasTime).toBe(true)
      expect(result?.isRange).toBe(false)
      expect(result?.confidence).toBeGreaterThan(0.8)
    })

    it('parses "Dec 15 3pm" → December 15 at 15:00', () => {
      const result = parseNaturalDate('Dec 15 3pm', { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.date.getMonth()).toBe(11) // December (0-indexed)
      expect(result?.date.getDate()).toBe(15)
      expect(result?.date.getHours()).toBe(15)
      expect(result?.hasTime).toBe(true)
      expect(result?.confidence).toBeGreaterThan(0.8)
    })

    it('parses "tomorrow afternoon" → next day, approximate time', () => {
      const result = parseNaturalDate('tomorrow afternoon', { referenceDate })

      expect(result).not.toBeNull()

      // Should be Dec 11, 2024 (day after reference)
      const expectedDate = new Date(referenceDate)
      expectedDate.setDate(expectedDate.getDate() + 1)

      expect(result?.date.getDate()).toBe(expectedDate.getDate())
      expect(result?.date.getMonth()).toBe(expectedDate.getMonth())

      // "afternoon" is approximate, typically 14:00-17:00
      expect(result?.date.getHours()).toBeGreaterThanOrEqual(12)
      expect(result?.date.getHours()).toBeLessThanOrEqual(18)

      expect(result?.hasTime).toBe(true)
      expect(result?.confidence).toBeGreaterThan(0.5) // Medium confidence for vague time
    })

    it('handles ambiguous dates "15/12" vs "12/15" gracefully', () => {
      // EU format: 15/12 = Dec 15
      const resultEU = parseNaturalDate('15/12/2024', {
        referenceDate,
        dateFormat: 'EU',
      })
      expect(resultEU).not.toBeNull()
      expect(resultEU?.date.getMonth()).toBe(11) // December
      expect(resultEU?.date.getDate()).toBe(15)

      // US format: 12/15 = Dec 15
      const resultUS = parseNaturalDate('12/15/2024', {
        referenceDate,
        dateFormat: 'US',
      })
      expect(resultUS).not.toBeNull()
      expect(resultUS?.date.getMonth()).toBe(11) // December
      expect(resultUS?.date.getDate()).toBe(15)

      // Ambiguous format without year or context
      const resultAmbiguous = parseNaturalDate('15/12', { referenceDate })
      expect(resultAmbiguous).not.toBeNull()
      expect(resultAmbiguous?.detectedFormat).toBe('ambiguous')
      expect(resultAmbiguous?.confidence).toBeLessThan(0.7) // Lower confidence
    })
  })

  describe('Absolute Dates', () => {
    it('parses ISO 8601 date "2024-12-15"', () => {
      const result = parseNaturalDate('2024-12-15', { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.date.getFullYear()).toBe(2024)
      expect(result?.date.getMonth()).toBe(11) // December
      expect(result?.date.getDate()).toBe(15)
      expect(result?.hasTime).toBe(false)
      expect(result?.confidence).toBe(1.0) // Highest confidence
      expect(result?.detectedFormat).toBe('absolute')
    })

    it('parses "December 15, 2024"', () => {
      const result = parseNaturalDate('December 15, 2024', { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.date.getFullYear()).toBe(2024)
      expect(result?.date.getMonth()).toBe(11)
      expect(result?.date.getDate()).toBe(15)
      expect(result?.confidence).toBeGreaterThan(0.9)
    })

    it('parses "Dec 15" (current or next year)', () => {
      const result = parseNaturalDate('Dec 15', { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.date.getMonth()).toBe(11)
      expect(result?.date.getDate()).toBe(15)
      // Should be 2024 since reference is Dec 10, 2024
      expect(result?.date.getFullYear()).toBe(2024)
    })

    it('parses "15/12/2024" with EU format', () => {
      const result = parseNaturalDate('15/12/2024', {
        referenceDate,
        dateFormat: 'EU',
      })

      expect(result).not.toBeNull()
      expect(result?.date.getDate()).toBe(15)
      expect(result?.date.getMonth()).toBe(11)
      expect(result?.date.getFullYear()).toBe(2024)
    })

    it('parses "12/15/2024" with US format', () => {
      const result = parseNaturalDate('12/15/2024', {
        referenceDate,
        dateFormat: 'US',
      })

      expect(result).not.toBeNull()
      expect(result?.date.getMonth()).toBe(11)
      expect(result?.date.getDate()).toBe(15)
      expect(result?.date.getFullYear()).toBe(2024)
    })
  })

  describe('Relative Dates', () => {
    it('parses "today"', () => {
      const result = parseNaturalDate('today', { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.date.getDate()).toBe(referenceDate.getDate())
      expect(result?.date.getMonth()).toBe(referenceDate.getMonth())
      expect(result?.confidence).toBeGreaterThan(0.9)
      expect(result?.detectedFormat).toBe('relative')
    })

    it('parses "tomorrow"', () => {
      const result = parseNaturalDate('tomorrow', { referenceDate })

      expect(result).not.toBeNull()

      const expectedDate = new Date(referenceDate)
      expectedDate.setDate(expectedDate.getDate() + 1)

      expect(result?.date.getDate()).toBe(expectedDate.getDate())
      expect(result?.confidence).toBeGreaterThan(0.9)
    })

    it('parses "next Friday"', () => {
      const result = parseNaturalDate('next Friday', { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.date.getDay()).toBe(5) // Friday
      expect(result!.date.getTime() > referenceDate.getTime()).toBe(true)
      expect(result?.confidence).toBeGreaterThan(0.8)
    })

    it('parses "next week"', () => {
      const result = parseNaturalDate('next week', { referenceDate })

      expect(result).not.toBeNull()

      const daysDifference = Math.floor(
        (result!.date.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      expect(daysDifference).toBeGreaterThanOrEqual(7)
      expect(daysDifference).toBeLessThanOrEqual(14)
    })

    it('parses "in 3 days"', () => {
      const result = parseNaturalDate('in 3 days', { referenceDate })

      expect(result).not.toBeNull()

      const expectedDate = new Date(referenceDate)
      expectedDate.setDate(expectedDate.getDate() + 3)

      expect(result?.date.getDate()).toBe(expectedDate.getDate())
      expect(result?.confidence).toBeGreaterThan(0.8)
    })
  })

  describe('Time Expressions', () => {
    it('parses "9am"', () => {
      const result = parseNaturalDate('9am', { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.date.getHours()).toBe(9)
      expect(result?.date.getMinutes()).toBe(0)
      expect(result?.hasTime).toBe(true)
    })

    it('parses "3:30pm"', () => {
      const result = parseNaturalDate('3:30pm', { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.date.getHours()).toBe(15)
      expect(result?.date.getMinutes()).toBe(30)
      expect(result?.hasTime).toBe(true)
    })

    it('parses "15:00" (24-hour format)', () => {
      const result = parseNaturalDate('15:00', { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.date.getHours()).toBe(15)
      expect(result?.date.getMinutes()).toBe(0)
      expect(result?.hasTime).toBe(true)
    })

    it('parses "morning" as approximate time', () => {
      const result = parseNaturalDate('morning', { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.date.getHours()).toBeGreaterThanOrEqual(6)
      expect(result?.date.getHours()).toBeLessThanOrEqual(12)
      expect(result?.hasTime).toBe(true)
      expect(result?.confidence).toBeLessThan(0.7) // Approximate
    })
  })

  describe('Date Ranges', () => {
    it('parses "Dec 15-20"', () => {
      const result = parseNaturalDate('Dec 15-20', { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.isRange).toBe(true)
      expect(result?.date.getMonth()).toBe(11)
      expect(result?.date.getDate()).toBe(15)
      expect(result?.endDate).toBeDefined()
      expect(result?.endDate?.getDate()).toBe(20)
      expect(result?.detectedFormat).toBe('range')
    })

    it('parses "Friday to Sunday"', () => {
      const result = parseNaturalDate('Friday to Sunday', { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.isRange).toBe(true)
      expect(result?.date.getDay()).toBe(5) // Friday
      expect(result?.endDate?.getDay()).toBe(0) // Sunday
    })

    it('parses "15-17 Dec 2024"', () => {
      const result = parseNaturalDate('15-17 Dec 2024', { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.isRange).toBe(true)
      expect(result?.date.getDate()).toBe(15)
      expect(result?.endDate?.getDate()).toBe(17)
    })
  })

  describe('Edge Cases & Error Handling', () => {
    it('returns null for invalid input', () => {
      const result = parseNaturalDate('xyz invalid text', { referenceDate })
      expect(result).toBeNull()
    })

    it('returns null for empty string', () => {
      const result = parseNaturalDate('', { referenceDate })
      expect(result).toBeNull()
    })

    it('handles past dates gracefully', () => {
      const result = parseNaturalDate('yesterday', { referenceDate })

      expect(result).not.toBeNull()

      const expectedDate = new Date(referenceDate)
      expectedDate.setDate(expectedDate.getDate() - 1)

      expect(result?.date.getDate()).toBe(expectedDate.getDate())
    })

    it('handles dates with extra whitespace', () => {
      const result = parseNaturalDate('  Monday 9am  ', { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.date.getDay()).toBe(1)
      expect(result?.date.getHours()).toBe(9)
    })

    it('preserves original text in result', () => {
      const input = 'Dec 15 3pm'
      const result = parseNaturalDate(input, { referenceDate })

      expect(result).not.toBeNull()
      expect(result?.originalText).toBe(input)
    })
  })

  describe('Confidence Scoring', () => {
    it('returns high confidence (>0.9) for absolute dates', () => {
      const result = parseNaturalDate('2024-12-15', { referenceDate })
      expect(result?.confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('returns good confidence (0.8-0.9) for specific relative dates', () => {
      const result = parseNaturalDate('next Monday', { referenceDate })
      expect(result?.confidence).toBeGreaterThanOrEqual(0.8)
      expect(result?.confidence).toBeLessThan(1.0)
    })

    it('returns medium confidence (0.5-0.7) for ambiguous dates', () => {
      const result = parseNaturalDate('15/12', { referenceDate })
      expect(result?.confidence).toBeGreaterThanOrEqual(0.5)
      expect(result?.confidence).toBeLessThan(0.8)
    })

    it('returns lower confidence (<0.7) for vague times', () => {
      const result = parseNaturalDate('afternoon', { referenceDate })
      expect(result?.confidence).toBeLessThan(0.7)
    })
  })
})
