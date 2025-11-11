/**
 * LLM Prompt Unit Tests
 *
 * Tests for the OpenAI prompt templates used in AI-based parsing.
 * Validates prompt structure, few-shot examples, and JSON schema correctness.
 */

import { getDateParserPrompt, getExpenseParserPrompt, SYSTEM_PROMPT } from '../llm-prompts'

describe('LLM Prompts', () => {
  describe('SYSTEM_PROMPT', () => {
    it('includes key instructions for structured data extraction', () => {
      expect(SYSTEM_PROMPT).toContain('structured data extraction')
      expect(SYSTEM_PROMPT).toContain('travel expense tracking')
      expect(SYSTEM_PROMPT).toContain('ONLY valid JSON')
    })

    it('specifies ISO standards for dates and currencies', () => {
      expect(SYSTEM_PROMPT).toContain('ISO 8601')
      expect(SYSTEM_PROMPT).toContain('ISO 4217')
    })

    it('mentions minor units for amounts', () => {
      expect(SYSTEM_PROMPT).toContain('minor units')
      expect(SYSTEM_PROMPT).toContain('cents')
      expect(SYSTEM_PROMPT).toContain('pence')
    })

    it('notes exceptions for JPY and KRW', () => {
      expect(SYSTEM_PROMPT).toContain('JPY')
      expect(SYSTEM_PROMPT).toContain('KRW')
      expect(SYSTEM_PROMPT).toContain('no minor units')
    })
  })

  describe('getDateParserPrompt', () => {
    const testInput = 'Monday 9am'
    const referenceDate = '2024-12-16T00:00:00Z'

    it('returns a non-empty string', () => {
      const prompt = getDateParserPrompt(testInput, referenceDate)
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(100)
    })

    it('includes the input text in the prompt', () => {
      const prompt = getDateParserPrompt(testInput, referenceDate)
      expect(prompt).toContain(testInput)
    })

    it('includes the reference date', () => {
      const prompt = getDateParserPrompt(testInput, referenceDate)
      expect(prompt).toContain(referenceDate)
    })

    it('specifies JSON schema with required fields', () => {
      const prompt = getDateParserPrompt(testInput, referenceDate)

      // Check for schema fields
      expect(prompt).toContain('"date"')
      expect(prompt).toContain('"hasTime"')
      expect(prompt).toContain('"isRange"')
      expect(prompt).toContain('"endDate"')
      expect(prompt).toContain('"confidence"')
      expect(prompt).toContain('"detectedFormat"')
      expect(prompt).toContain('"originalText"')
    })

    it('specifies correct types for schema fields', () => {
      const prompt = getDateParserPrompt(testInput, referenceDate)

      expect(prompt).toContain('ISO 8601')
      expect(prompt).toContain('boolean')
      expect(prompt).toContain('number between 0 and 1')
    })

    it('includes detectedFormat enum values', () => {
      const prompt = getDateParserPrompt(testInput, referenceDate)

      expect(prompt).toContain('absolute')
      expect(prompt).toContain('relative')
      expect(prompt).toContain('time')
      expect(prompt).toContain('range')
      expect(prompt).toContain('ambiguous')
    })

    it('includes few-shot examples', () => {
      const prompt = getDateParserPrompt(testInput, referenceDate)

      expect(prompt).toContain('Examples:')
      expect(prompt).toContain('Input:')
      expect(prompt).toContain('Output:')
    })

    it('includes example for relative date with time', () => {
      const prompt = getDateParserPrompt(testInput, referenceDate)

      expect(prompt).toContain('Monday 9am')
      expect(prompt).toContain('2024-12-16T09:00:00Z')
    })

    it('includes example for date range', () => {
      const prompt = getDateParserPrompt(testInput, referenceDate)

      expect(prompt).toContain('Dec 15-20')
      expect(prompt).toContain('"isRange": true')
    })

    it('includes example for "next" keyword', () => {
      const prompt = getDateParserPrompt(testInput, referenceDate)

      expect(prompt).toContain('next Friday')
    })

    it('ends with extraction instruction', () => {
      const prompt = getDateParserPrompt(testInput, referenceDate)

      expect(prompt).toContain('Now extract from')
      expect(prompt.trim().endsWith(testInput + '"')).toBe(true)
    })

    it('handles different reference dates', () => {
      const refDate1 = '2025-01-01T00:00:00Z'
      const refDate2 = '2025-06-15T12:00:00Z'

      const prompt1 = getDateParserPrompt('tomorrow', refDate1)
      const prompt2 = getDateParserPrompt('tomorrow', refDate2)

      expect(prompt1).toContain(refDate1)
      expect(prompt2).toContain(refDate2)
      expect(prompt1).not.toContain(refDate2)
      expect(prompt2).not.toContain(refDate1)
    })
  })

  describe('getExpenseParserPrompt', () => {
    const testInput = 'Dinner €60 split 4 ways'
    const defaultCurrency = 'USD'

    it('returns a non-empty string', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(200)
    })

    it('includes the input text in the prompt', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)
      expect(prompt).toContain(testInput)
    })

    it('includes the default currency', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)
      expect(prompt).toContain(`Default currency: ${defaultCurrency}`)
    })

    it('specifies JSON schema with all required fields', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      // Check for all schema fields
      expect(prompt).toContain('"amount"')
      expect(prompt).toContain('"currency"')
      expect(prompt).toContain('"description"')
      expect(prompt).toContain('"category"')
      expect(prompt).toContain('"payer"')
      expect(prompt).toContain('"splitType"')
      expect(prompt).toContain('"splitCount"')
      expect(prompt).toContain('"participants"')
      expect(prompt).toContain('"customSplits"')
      expect(prompt).toContain('"confidence"')
      expect(prompt).toContain('"originalText"')
    })

    it('specifies category enum values', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      expect(prompt).toContain('food')
      expect(prompt).toContain('transport')
      expect(prompt).toContain('accommodation')
      expect(prompt).toContain('activity')
      expect(prompt).toContain('other')
    })

    it('specifies splitType enum values', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      expect(prompt).toContain('equal')
      expect(prompt).toContain('custom')
      expect(prompt).toContain('percentage')
      expect(prompt).toContain('none')
    })

    it('includes minor units conversion rules', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      expect(prompt).toContain('minor units')
      expect(prompt).toContain('cents')
      expect(prompt).toContain('pence')
    })

    it('includes EUR/USD/GBP conversion examples', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      expect(prompt).toContain('EUR/USD/GBP')
      expect(prompt).toContain('€60 = 6000')
    })

    it('includes JPY/KRW exception rules', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      expect(prompt).toContain('JPY/KRW')
      expect(prompt).toContain('NO conversion')
    })

    it('includes description rules', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      expect(prompt).toContain('Description should NOT include participant names')
    })

    it('includes few-shot examples', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      expect(prompt).toContain('Examples:')
      expect(prompt).toContain('Input:')
      expect(prompt).toContain('Output:')
    })

    it('includes example for simple equal split', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      expect(prompt).toContain('Dinner €60 split 4 ways')
      expect(prompt).toContain('"amount": 6000')
      expect(prompt).toContain('"splitType": "equal"')
      expect(prompt).toContain('"splitCount": 4')
    })

    it('includes example with named participants', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      expect(prompt).toContain('Alice paid $120 for hotel')
      expect(prompt).toContain('split between Alice, Bob, Carol')
      expect(prompt).toContain('"payer": "Alice"')
      expect(prompt).toContain('["Alice", "Bob", "Carol"]')
    })

    it('includes example with JPY (no minor units)', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      expect(prompt).toContain('¥2500')
      expect(prompt).toContain('"amount": 2500')
      expect(prompt).toContain('"currency": "JPY"')
    })

    it('includes example with USD (with minor units)', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      expect(prompt).toContain('$75 lunch')
      expect(prompt).toContain('"amount": 7500')
      expect(prompt).toContain('"currency": "USD"')
    })

    it('includes example with custom splits', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      expect(prompt).toContain('customSplits')
      expect(prompt).toContain('"name":')
      expect(prompt).toContain('"amount":')
    })

    it('includes multiple custom split examples', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      // Should have at least 3 custom split examples
      const customSplitMatches = prompt.match(/"splitType": "custom"/g)
      expect(customSplitMatches).toBeTruthy()
      expect(customSplitMatches!.length).toBeGreaterThanOrEqual(3)
    })

    it('ends with extraction instruction', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      expect(prompt).toContain('Now extract from')
      expect(prompt.trim().endsWith(testInput + '"')).toBe(true)
    })

    it('handles different default currencies', () => {
      const promptUSD = getExpenseParserPrompt('dinner 50', 'USD')
      const promptEUR = getExpenseParserPrompt('dinner 50', 'EUR')
      const promptGBP = getExpenseParserPrompt('dinner 50', 'GBP')

      expect(promptUSD).toContain('Default currency: USD')
      expect(promptEUR).toContain('Default currency: EUR')
      expect(promptGBP).toContain('Default currency: GBP')
    })

    it('validates all few-shot examples are valid JSON', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      // Extract all Output: lines (including multiline JSON)
      const outputLines = prompt.match(/Output: ({[\s\S]*?})\n/g)

      expect(outputLines).toBeTruthy()
      expect(outputLines!.length).toBeGreaterThan(0)

      outputLines!.forEach((line, index) => {
        const jsonString = line.replace('Output: ', '').replace(/\n$/, '').trim()
        try {
          JSON.parse(jsonString)
        } catch (error) {
          // Log which example failed for debugging
          console.error(`Failed to parse example ${index + 1}:`, jsonString)
          throw error
        }
      })
    })

    it('validates few-shot examples have correct minor unit conversion', () => {
      const prompt = getExpenseParserPrompt(testInput, defaultCurrency)

      // €60 should be 6000 cents
      expect(prompt).toContain('€60')
      const match60 = prompt.match(/"amount": 6000.*?"currency": "EUR"/s)
      expect(match60).toBeTruthy()

      // $120 should be 12000 cents
      expect(prompt).toContain('$120')
      const match120 = prompt.match(/"amount": 12000.*?"currency": "USD"/s)
      expect(match120).toBeTruthy()

      // £45 should be 4500 pence
      expect(prompt).toContain('£45')
      const match45 = prompt.match(/"amount": 4500.*?"currency": "GBP"/s)
      expect(match45).toBeTruthy()

      // ¥2500 should be 2500 (no conversion)
      expect(prompt).toContain('¥2500')
      const matchJPY = prompt.match(/"amount": 2500.*?"currency": "JPY"/s)
      expect(matchJPY).toBeTruthy()
    })
  })

  describe('Prompt Consistency', () => {
    it('both prompts use consistent terminology', () => {
      const datePrompt = getDateParserPrompt('test', '2024-01-01T00:00:00Z')
      const expensePrompt = getExpenseParserPrompt('test', 'USD')

      // Both should mention JSON
      expect(datePrompt).toContain('JSON')
      expect(expensePrompt).toContain('JSON')

      // Both should have Examples section
      expect(datePrompt).toContain('Examples:')
      expect(expensePrompt).toContain('Examples:')

      // Both should use confidence field
      expect(datePrompt).toContain('confidence')
      expect(expensePrompt).toContain('confidence')

      // Both should use originalText field
      expect(datePrompt).toContain('originalText')
      expect(expensePrompt).toContain('originalText')
    })

    it('both prompts use "Extract" as the main verb', () => {
      const datePrompt = getDateParserPrompt('test', '2024-01-01T00:00:00Z')
      const expensePrompt = getExpenseParserPrompt('test', 'USD')

      expect(datePrompt).toContain('Extract')
      expect(expensePrompt).toContain('Extract')
    })

    it('both prompts end with "Now extract from"', () => {
      const datePrompt = getDateParserPrompt('test', '2024-01-01T00:00:00Z')
      const expensePrompt = getExpenseParserPrompt('test', 'USD')

      expect(datePrompt).toContain('Now extract from')
      expect(expensePrompt).toContain('Now extract from')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty input string', () => {
      expect(() => getDateParserPrompt('', '2024-01-01T00:00:00Z')).not.toThrow()
      expect(() => getExpenseParserPrompt('', 'USD')).not.toThrow()
    })

    it('handles very long input strings', () => {
      const longInput = 'a'.repeat(1000)

      expect(() => getDateParserPrompt(longInput, '2024-01-01T00:00:00Z')).not.toThrow()
      expect(() => getExpenseParserPrompt(longInput, 'USD')).not.toThrow()
    })

    it('handles special characters in input', () => {
      const specialInput = 'Dinner €60 "split" <4> ways & stuff'

      expect(() => getDateParserPrompt(specialInput, '2024-01-01T00:00:00Z')).not.toThrow()
      expect(() => getExpenseParserPrompt(specialInput, 'USD')).not.toThrow()
    })

    it('handles quotes in input (prevents injection)', () => {
      const quotesInput = 'Dinner "€60" split "4 ways"'

      const datePrompt = getDateParserPrompt(quotesInput, '2024-01-01T00:00:00Z')
      const expensePrompt = getExpenseParserPrompt(quotesInput, 'USD')

      // Input should be properly escaped/contained
      expect(datePrompt).toContain(quotesInput)
      expect(expensePrompt).toContain(quotesInput)
    })

    it('handles newlines in input', () => {
      const newlineInput = 'Dinner\n€60\nsplit 4 ways'

      expect(() => getDateParserPrompt(newlineInput, '2024-01-01T00:00:00Z')).not.toThrow()
      expect(() => getExpenseParserPrompt(newlineInput, 'USD')).not.toThrow()
    })
  })
})
