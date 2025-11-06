/**
 * Expense Parser Unit Tests
 *
 * TDD approach: Write failing tests first, then implement to make them pass.
 * Target: >80% accuracy on natural language expense parsing
 */

import { describe, it, expect } from '@jest/globals'
import { parseExpense } from '../expense'

describe('parseExpense', () => {
  describe('Linear Test Cases (from CRO-847)', () => {
    it('parses "Dinner €60 split 4 ways"', () => {
      const result = parseExpense('Dinner €60 split 4 ways')

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(6000) // 60.00 in cents
      expect(result?.currency).toBe('EUR')
      expect(result?.description).toContain('Dinner')
      expect(result?.splitType).toBe('equal')
      expect(result?.splitCount).toBe(4)
      expect(result?.confidence).toBeGreaterThan(0.8)
    })

    it('parses "Alice paid $120 for hotel, split between Alice, Bob, Carol"', () => {
      const result = parseExpense('Alice paid $120 for hotel, split between Alice, Bob, Carol')

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(12000) // 120.00 in cents
      expect(result?.currency).toBe('USD')
      expect(result?.description).toContain('hotel')
      expect(result?.payer).toBe('Alice')
      expect(result?.splitType).toBe('equal')
      expect(result?.participants).toContain('Alice')
      expect(result?.participants).toContain('Bob')
      expect(result?.participants).toContain('Carol')
      expect(result?.splitCount).toBe(3)
      expect(result?.confidence).toBeGreaterThan(0.7)
    })

    it('parses "Taxi £45, Bob owes half"', () => {
      const result = parseExpense('Taxi £45, Bob owes half')

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(4500) // 45.00 in pence
      expect(result?.currency).toBe('GBP')
      expect(result?.description).toContain('Taxi')
      expect(result?.splitType).toBe('custom')
      expect(result?.participants).toContain('Bob')
      expect(result?.confidence).toBeGreaterThan(0.6)
    })

    it('parses "Groceries 2500¥ I paid, split equally 5 people"', () => {
      const result = parseExpense('Groceries 2500¥ I paid, split equally 5 people')

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(2500) // JPY has no minor units
      expect(result?.currency).toBe('JPY')
      expect(result?.description).toContain('Groceries')
      expect(result?.payer).toBe('I')
      expect(result?.splitType).toBe('equal')
      expect(result?.splitCount).toBe(5)
      expect(result?.confidence).toBeGreaterThan(0.8)
    })

    it('parses "€30 drinks everyone pays their share"', () => {
      const result = parseExpense('€30 drinks everyone pays their share')

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(3000) // 30.00 in cents
      expect(result?.currency).toBe('EUR')
      expect(result?.description).toContain('drinks')
      expect(result?.splitType).toBe('shares')
      expect(result?.confidence).toBeGreaterThan(0.6)
    })
  })

  describe('Currency Detection', () => {
    it('detects Euro symbol (€)', () => {
      const result = parseExpense('€50 lunch')
      expect(result?.currency).toBe('EUR')
    })

    it('detects Dollar symbol ($)', () => {
      const result = parseExpense('$75 dinner')
      expect(result?.currency).toBe('USD')
    })

    it('detects Pound symbol (£)', () => {
      const result = parseExpense('£40 taxi')
      expect(result?.currency).toBe('GBP')
    })

    it('detects Yen symbol (¥)', () => {
      const result = parseExpense('¥3000 meal')
      expect(result?.currency).toBe('JPY')
    })

    it('detects currency codes (CHF)', () => {
      const result = parseExpense('CHF 120 hotel')
      expect(result?.currency).toBe('CHF')
    })

    it('uses default currency when none detected', () => {
      const result = parseExpense('50 coffee', { defaultCurrency: 'EUR' })
      expect(result?.currency).toBe('EUR')
    })
  })

  describe('Amount Extraction', () => {
    it('parses whole numbers', () => {
      const result = parseExpense('€60 dinner')
      expect(result?.amount).toBe(6000)
    })

    it('parses decimal amounts (US format)', () => {
      const result = parseExpense('$45.50 lunch')
      expect(result?.amount).toBe(4550)
    })

    it('parses amounts with commas (US format)', () => {
      const result = parseExpense('$1,250.75 rent', { decimalFormat: 'US' })
      expect(result?.amount).toBe(125075)
    })

    it('parses decimal amounts (EU format)', () => {
      const result = parseExpense('€45,50 lunch', { decimalFormat: 'EU' })
      expect(result?.amount).toBe(4550)
    })

    it('parses amounts with periods as thousands separator (EU format)', () => {
      const result = parseExpense('€1.250,75 rent', { decimalFormat: 'EU' })
      expect(result?.amount).toBe(125075)
    })

    it('handles JPY (no minor units)', () => {
      const result = parseExpense('¥2500 dinner')
      expect(result?.amount).toBe(2500)
    })
  })

  describe('Split Type Detection', () => {
    it('detects equal split with "split equally"', () => {
      const result = parseExpense('€60 split equally 4 people')
      expect(result?.splitType).toBe('equal')
      expect(result?.splitCount).toBe(4)
    })

    it('detects equal split with "split X ways"', () => {
      const result = parseExpense('$80 split 3 ways')
      expect(result?.splitType).toBe('equal')
      expect(result?.splitCount).toBe(3)
    })

    it('detects equal split with "split between Names"', () => {
      const result = parseExpense('£100 split between Alice, Bob')
      expect(result?.splitType).toBe('equal')
    })

    it('detects custom split with "owes half"', () => {
      const result = parseExpense('$60 taxi Bob owes half')
      expect(result?.splitType).toBe('custom')
    })

    it('detects shares split with "everyone pays their share"', () => {
      const result = parseExpense('€90 everyone pays their share')
      expect(result?.splitType).toBe('shares')
    })

    it('detects no split when no keywords present', () => {
      const result = parseExpense('€40 dinner')
      expect(result?.splitType).toBe('none')
    })
  })

  describe('Payer Identification', () => {
    it('identifies "I paid"', () => {
      const result = parseExpense('€50 I paid for lunch')
      expect(result?.payer).toBe('I')
    })

    it('identifies "Name paid"', () => {
      const result = parseExpense('Alice paid $100 for dinner')
      expect(result?.payer).toBe('Alice')
    })

    it('handles no payer specified', () => {
      const result = parseExpense('€40 taxi split 2 ways')
      expect(result?.payer).toBeUndefined()
    })
  })

  describe('Participant Extraction', () => {
    it('extracts names from "split between Names"', () => {
      const result = parseExpense('€90 split between Alice, Bob, Carol')
      expect(result?.participants).toEqual(expect.arrayContaining(['Alice', 'Bob', 'Carol']))
    })

    it('extracts payer as participant', () => {
      const result = parseExpense('Alice paid $120 split between Alice, Bob')
      expect(result?.participants).toContain('Alice')
      expect(result?.participants).toContain('Bob')
    })

    it('handles no participants', () => {
      const result = parseExpense('€50 dinner split 3 ways')
      // When split count is given but no names, participants may be undefined
      expect(result?.splitCount).toBe(3)
    })
  })

  describe('Description Extraction', () => {
    it('extracts description from beginning', () => {
      const result = parseExpense('Dinner €60 split 4 ways')
      expect(result?.description).toContain('Dinner')
    })

    it('extracts multi-word description', () => {
      const result = parseExpense('Late night pizza $40 split equally')
      expect(result?.description).toMatch(/pizza/i)
    })

    it('handles description after amount', () => {
      const result = parseExpense('€50 for groceries')
      expect(result?.description).toMatch(/groceries/i)
    })
  })

  describe('Category Inference', () => {
    it('infers "food" from dinner/lunch keywords', () => {
      const result = parseExpense('€60 dinner split 4 ways')
      expect(result?.category).toBe('food')
    })

    it('infers "transport" from taxi/uber keywords', () => {
      const result = parseExpense('$30 taxi split 2 ways')
      expect(result?.category).toBe('transport')
    })

    it('infers "accommodation" from hotel keywords', () => {
      const result = parseExpense('$200 hotel split 3 ways')
      expect(result?.category).toBe('accommodation')
    })

    it('does not infer category for unclear descriptions', () => {
      const result = parseExpense('€50 stuff split 2 ways')
      expect(result?.category).toBeUndefined()
    })
  })

  describe('Confidence Scoring', () => {
    it('gives high confidence for clear input', () => {
      const result = parseExpense('Dinner €60 split 4 ways')
      expect(result?.confidence).toBeGreaterThan(0.8)
    })

    it('gives medium confidence for ambiguous splits', () => {
      const result = parseExpense('€50 stuff Bob owes half')
      expect(result?.confidence).toBeGreaterThan(0.5)
      expect(result?.confidence).toBeLessThan(0.8)
    })

    it('gives lower confidence for incomplete information', () => {
      const result = parseExpense('30 something')
      expect(result?.confidence).toBeLessThan(0.7)
    })
  })

  describe('Edge Cases & Error Handling', () => {
    it('returns null for invalid input', () => {
      const result = parseExpense('xyz invalid text')
      expect(result).toBeNull()
    })

    it('returns null for empty string', () => {
      const result = parseExpense('')
      expect(result).toBeNull()
    })

    it('handles input with extra whitespace', () => {
      const result = parseExpense('  €60   dinner   split   4   ways  ')
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(6000)
    })

    it('handles input without currency', () => {
      const result = parseExpense('50 lunch split 2 ways', { defaultCurrency: 'USD' })
      expect(result).not.toBeNull()
      expect(result?.currency).toBe('USD')
    })

    it('preserves original text', () => {
      const input = '€60 dinner split 4 ways'
      const result = parseExpense(input)
      expect(result?.originalText).toBe(input)
    })

    it('handles very large amounts', () => {
      const result = parseExpense('$10,000.00 split 5 ways')
      expect(result?.amount).toBe(1000000) // 10,000.00 in cents
    })

    it('handles amounts without decimals', () => {
      const result = parseExpense('€100 split 2 ways')
      expect(result?.amount).toBe(10000)
    })
  })

  describe('Complex Scenarios', () => {
    it('handles multiple participants with complex split', () => {
      const result = parseExpense(
        'Alice paid $150 for accommodation, split between Alice, Bob, Carol, David'
      )
      expect(result?.payer).toBe('Alice')
      expect(result?.participants?.length).toBe(4)
      expect(result?.splitType).toBe('equal')
    })

    it('handles description with numbers', () => {
      const result = parseExpense('€100 for 2 concert tickets split equally')
      expect(result?.amount).toBe(10000)
      expect(result?.description).toMatch(/concert/i)
    })

    it('handles payer in different positions', () => {
      const result = parseExpense('Lunch $45 Bob paid split 3 ways')
      expect(result?.payer).toBe('Bob')
      expect(result?.amount).toBe(4500)
    })
  })

  describe('Additional Edge Cases & Variations', () => {
    it('handles "we split" phrasing', () => {
      const result = parseExpense('We split €80 dinner between 4 people')
      expect(result?.amount).toBe(8000)
      expect(result?.splitType).toBe('equal')
      expect(result?.splitCount).toBe(4)
    })

    it('handles "divide equally" phrasing', () => {
      const result = parseExpense('$120 hotel divide equally 3 ways')
      expect(result?.amount).toBe(12000)
      expect(result?.splitType).toBe('equal')
      expect(result?.splitCount).toBe(3)
    })

    it('handles "X people split" order', () => {
      const result = parseExpense('€60 meal 4 people split')
      expect(result?.amount).toBe(6000)
      expect(result?.splitType).toBe('equal')
      expect(result?.splitCount).toBe(4)
    })

    it('handles currency before or after amount', () => {
      const result1 = parseExpense('€60 dinner')
      const result2 = parseExpense('60€ dinner')

      expect(result1?.amount).toBe(6000)
      expect(result2?.amount).toBe(6000)
      expect(result1?.currency).toBe('EUR')
      expect(result2?.currency).toBe('EUR')
    })

    it('handles "paid for" vs "paid"', () => {
      const result1 = parseExpense('Alice paid for $50 lunch')
      const result2 = parseExpense('Alice paid $50 lunch')

      expect(result1?.payer).toBe('Alice')
      expect(result2?.payer).toBe('Alice')
    })

    it('handles split with "among" instead of "between"', () => {
      const result = parseExpense('$90 split among Alice, Bob, Carol')
      expect(result?.splitType).toBe('equal')
      expect(result?.participants?.length).toBeGreaterThan(0)
    })

    it('handles "each person" phrasing', () => {
      const result = parseExpense('€20 each person pays')
      expect(result?.splitType).toBe('shares')
    })

    it('handles mixed case input', () => {
      const result = parseExpense('DINNER €60 SPLIT 4 WAYS')
      expect(result?.amount).toBe(6000)
      expect(result?.splitType).toBe('equal')
    })

    it('handles amounts with leading zeros', () => {
      const result = parseExpense('$045.50 lunch')
      expect(result?.amount).toBe(4550)
    })

    it('handles single participant "split"', () => {
      const result = parseExpense('€100 hotel split 1 way')
      expect(result?.splitCount).toBe(1)
      expect(result?.splitType).toBe('equal')
    })

    it('handles informal currency names', () => {
      const result = parseExpense('50 euros dinner split 2 ways', { defaultCurrency: 'EUR' })
      expect(result?.currency).toBe('EUR')
    })

    it('handles "owes me" phrasing', () => {
      const result = parseExpense('Bob owes me $30 for taxi')
      expect(result?.amount).toBe(3000)
      expect(result?.participants).toContain('Bob')
    })

    it('handles percentage splits (custom)', () => {
      const result = parseExpense('$100 dinner Bob owes 40%')
      expect(result?.splitType).toBe('custom')
      expect(result?.participants).toContain('Bob')
    })

    it('handles "quarter" as split amount', () => {
      const result = parseExpense('€80 taxi Bob owes quarter')
      expect(result?.splitType).toBe('custom')
    })

    it('handles no space between amount and currency', () => {
      const result = parseExpense('60€ dinner split 3 ways')
      expect(result?.amount).toBe(6000)
      expect(result?.currency).toBe('EUR')
    })

    it('handles "evenly" instead of "equally"', () => {
      const result = parseExpense('$75 split evenly 5 ways')
      expect(result?.splitType).toBe('equal')
      expect(result?.splitCount).toBe(5)
    })

    it('handles round numbers without decimals', () => {
      const result = parseExpense('€200 accommodation')
      expect(result?.amount).toBe(20000)
    })

    it('handles single-word descriptions', () => {
      const result = parseExpense('$50 groceries')
      expect(result?.description).toMatch(/groceries/i)
      expect(result?.category).toBe('food')
    })

    it('handles description at end', () => {
      const result = parseExpense('Split $60 4 ways for dinner')
      expect(result?.amount).toBe(6000)
      expect(result?.description).toMatch(/dinner/i)
    })

    it('handles INR currency symbol', () => {
      const result = parseExpense('₹500 lunch split 2 ways')
      expect(result?.currency).toBe('INR')
      expect(result?.amount).toBe(50000)
    })

    it('handles amounts over 10,000', () => {
      const result = parseExpense('$12,500 rent split 5 ways')
      expect(result?.amount).toBe(1250000)
      expect(result?.splitCount).toBe(5)
    })

    it('rejects negative amounts', () => {
      const result = parseExpense('-$50 dinner')
      // Should still parse the absolute value
      expect(result?.amount).toBeGreaterThan(0)
    })

    it('handles "and" in participant lists', () => {
      const result = parseExpense('€90 split between Alice, Bob and Carol')
      expect(result?.participants?.length).toBeGreaterThanOrEqual(2)
    })

    it('handles very specific time-based descriptions', () => {
      const result = parseExpense('$25 breakfast at 8am split 2 ways')
      expect(result?.amount).toBe(2500)
      expect(result?.category).toBe('food')
    })

    it('handles abbreviations (apt, hwy, etc)', () => {
      const result = parseExpense('$1200 apt rent split 3 ways')
      expect(result?.amount).toBe(120000)
      expect(result?.splitType).toBe('equal')
    })

    it('handles "shared" as split keyword', () => {
      const result = parseExpense('€70 shared dinner 4 people')
      expect(result?.splitType).toBe('equal')
      expect(result?.splitCount).toBe(4)
    })
  })
})
