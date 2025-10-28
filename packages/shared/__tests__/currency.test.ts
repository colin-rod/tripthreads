import { formatCurrency, convertToMinorUnits, convertFromMinorUnits } from '../src/utils/currency'

describe('Currency Utils', () => {
  describe('formatCurrency', () => {
    it('should format EUR correctly', () => {
      expect(formatCurrency(100, 'EUR')).toBe('€100.00')
    })

    it('should format USD correctly', () => {
      expect(formatCurrency(100, 'USD')).toBe('$100.00')
    })

    it('should format GBP correctly', () => {
      expect(formatCurrency(100, 'GBP')).toBe('£100.00')
    })

    it('should handle zero', () => {
      expect(formatCurrency(0, 'EUR')).toBe('€0.00')
    })

    it('should handle negative amounts (refunds)', () => {
      expect(formatCurrency(-50, 'USD')).toBe('-$50.00')
    })

    it('should handle decimal amounts', () => {
      expect(formatCurrency(123.45, 'EUR')).toBe('€123.45')
    })
  })

  describe('convertToMinorUnits', () => {
    it('should convert dollars to cents', () => {
      expect(convertToMinorUnits(100.50)).toBe(10050)
    })

    it('should handle whole numbers', () => {
      expect(convertToMinorUnits(100)).toBe(10000)
    })

    it('should round to nearest cent', () => {
      expect(convertToMinorUnits(100.999)).toBe(10100)
    })

    it('should handle zero', () => {
      expect(convertToMinorUnits(0)).toBe(0)
    })

    it('should handle negative amounts', () => {
      expect(convertToMinorUnits(-25.50)).toBe(-2550)
    })
  })

  describe('convertFromMinorUnits', () => {
    it('should convert cents to dollars', () => {
      expect(convertFromMinorUnits(10050)).toBe(100.50)
    })

    it('should handle whole dollar amounts', () => {
      expect(convertFromMinorUnits(10000)).toBe(100)
    })

    it('should handle zero', () => {
      expect(convertFromMinorUnits(0)).toBe(0)
    })

    it('should handle negative amounts', () => {
      expect(convertFromMinorUnits(-2550)).toBe(-25.50)
    })
  })
})
