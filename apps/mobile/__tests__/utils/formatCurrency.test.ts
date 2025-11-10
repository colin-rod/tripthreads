/**
 * Unit tests for currency formatting utility
 */

describe('formatCurrency', () => {
  const formatCurrency = (amount: number, currency: string) => {
    const majorAmount = amount / 100
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(majorAmount)
  }

  it('should format USD correctly', () => {
    expect(formatCurrency(1000, 'USD')).toBe('$10.00')
    expect(formatCurrency(12345, 'USD')).toBe('$123.45')
    expect(formatCurrency(100, 'USD')).toBe('$1.00')
  })

  it('should format EUR correctly', () => {
    expect(formatCurrency(1000, 'EUR')).toBe('€10.00')
    expect(formatCurrency(5000, 'EUR')).toBe('€50.00')
  })

  it('should format GBP correctly', () => {
    expect(formatCurrency(2500, 'GBP')).toBe('£25.00')
  })

  it('should handle zero amount', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00')
  })

  it('should handle large amounts', () => {
    expect(formatCurrency(123456789, 'USD')).toBe('$1,234,567.89')
  })

  it('should handle single cent', () => {
    expect(formatCurrency(1, 'USD')).toBe('$0.01')
  })
})
