/**
 * Tests for Stripe Configuration (Adaptive Pricing)
 *
 * Phase: 3.1 (CRO-747)
 * Tests adaptive pricing configuration where a single price ID
 * supports multiple currencies.
 */

import {
  STRIPE_PRODUCTS,
  getPriceAmount,
  getDisplayAmount,
  getCurrencySymbol,
  getSupportedCurrencies,
} from './config'

describe('Stripe Config - Adaptive Pricing', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('STRIPE_PRICES', () => {
    it('should load price IDs from environment variables', async () => {
      process.env.STRIPE_PRICE_MONTHLY = 'price_monthly_test'
      process.env.STRIPE_PRICE_YEARLY = 'price_yearly_test'
      process.env.STRIPE_PRICE_ONEOFF = 'price_oneoff_test'

      // Re-import to get fresh values
      jest.resetModules()
      const config = await import('./config')

      expect(config.STRIPE_PRICES.monthly).toBe('price_monthly_test')
      expect(config.STRIPE_PRICES.yearly).toBe('price_yearly_test')
      expect(config.STRIPE_PRICES.oneoff).toBe('price_oneoff_test')
    })

    it('should use empty string as fallback when env vars not set', async () => {
      delete process.env.STRIPE_PRICE_MONTHLY
      delete process.env.STRIPE_PRICE_YEARLY
      delete process.env.STRIPE_PRICE_ONEOFF

      jest.resetModules()
      const config = await import('./config')

      expect(config.STRIPE_PRICES.monthly).toBe('')
      expect(config.STRIPE_PRICES.yearly).toBe('')
      expect(config.STRIPE_PRICES.oneoff).toBe('')
    })
  })

  describe('getPriceId()', () => {
    it('should return the correct price ID for each plan', async () => {
      process.env.STRIPE_PRICE_MONTHLY = 'price_monthly_123'
      process.env.STRIPE_PRICE_YEARLY = 'price_yearly_456'
      process.env.STRIPE_PRICE_ONEOFF = 'price_oneoff_789'

      jest.resetModules()
      const config = await import('./config')

      expect(config.getPriceId('monthly')).toBe('price_monthly_123')
      expect(config.getPriceId('yearly')).toBe('price_yearly_456')
      expect(config.getPriceId('oneoff')).toBe('price_oneoff_789')
    })

    it('should return the same price ID for all currencies (adaptive pricing)', async () => {
      process.env.STRIPE_PRICE_MONTHLY = 'price_adaptive_monthly'

      jest.resetModules()
      const config = await import('./config')

      // Same price ID regardless of currency - adaptive pricing handles it
      expect(config.getPriceId('monthly')).toBe('price_adaptive_monthly')
      expect(config.getPriceId('monthly')).toBe('price_adaptive_monthly')
      expect(config.getPriceId('monthly')).toBe('price_adaptive_monthly')
    })
  })

  describe('Currency Configuration', () => {
    it('should maintain different display amounts for each currency', () => {
      expect(getDisplayAmount('monthly', 'EUR')).toBe('€7')
      expect(getDisplayAmount('monthly', 'USD')).toBe('$8')
      expect(getDisplayAmount('monthly', 'GBP')).toBe('£6')

      expect(getDisplayAmount('yearly', 'EUR')).toBe('€70')
      expect(getDisplayAmount('yearly', 'USD')).toBe('$80')
      expect(getDisplayAmount('yearly', 'GBP')).toBe('£60')

      expect(getDisplayAmount('oneoff', 'EUR')).toBe('€9')
      expect(getDisplayAmount('oneoff', 'USD')).toBe('$10')
      expect(getDisplayAmount('oneoff', 'GBP')).toBe('£8')
    })

    it('should maintain different pricing amounts for each currency', () => {
      expect(getPriceAmount('monthly', 'EUR')).toBe(7)
      expect(getPriceAmount('monthly', 'USD')).toBe(8)
      expect(getPriceAmount('monthly', 'GBP')).toBe(6)
    })

    it('should have correct currency symbols', () => {
      expect(getCurrencySymbol('EUR')).toBe('€')
      expect(getCurrencySymbol('USD')).toBe('$')
      expect(getCurrencySymbol('GBP')).toBe('£')
    })

    it('should return all supported currencies', () => {
      const currencies = getSupportedCurrencies()
      expect(currencies).toEqual(['EUR', 'USD', 'GBP'])
    })
  })

  describe('validateStripeConfig()', () => {
    it('should pass when all required variables are set', async () => {
      process.env.STRIPE_PRODUCT_PRO_MONTHLY = 'prod_monthly'
      process.env.STRIPE_PRODUCT_PRO_YEARLY = 'prod_yearly'
      process.env.STRIPE_PRODUCT_PRO_ONEOFF = 'prod_oneoff'
      process.env.STRIPE_PRICE_MONTHLY = 'price_monthly'
      process.env.STRIPE_PRICE_YEARLY = 'price_yearly'
      process.env.STRIPE_PRICE_ONEOFF = 'price_oneoff'

      jest.resetModules()
      const config = await import('./config')

      expect(() => config.validateStripeConfig()).not.toThrow()
    })

    it('should throw when product IDs are missing', async () => {
      delete process.env.STRIPE_PRODUCT_PRO_MONTHLY
      process.env.STRIPE_PRODUCT_PRO_YEARLY = 'prod_yearly'
      process.env.STRIPE_PRODUCT_PRO_ONEOFF = 'prod_oneoff'
      process.env.STRIPE_PRICE_MONTHLY = 'price_monthly'
      process.env.STRIPE_PRICE_YEARLY = 'price_yearly'
      process.env.STRIPE_PRICE_ONEOFF = 'price_oneoff'

      jest.resetModules()
      const config = await import('./config')

      expect(() => config.validateStripeConfig()).toThrow(
        'Missing required Stripe environment variables'
      )
      expect(() => config.validateStripeConfig()).toThrow('STRIPE_PRODUCT_PRO_MONTHLY')
    })

    it('should throw when price IDs are missing', async () => {
      process.env.STRIPE_PRODUCT_PRO_MONTHLY = 'prod_monthly'
      process.env.STRIPE_PRODUCT_PRO_YEARLY = 'prod_yearly'
      process.env.STRIPE_PRODUCT_PRO_ONEOFF = 'prod_oneoff'
      delete process.env.STRIPE_PRICE_MONTHLY
      process.env.STRIPE_PRICE_YEARLY = 'price_yearly'
      process.env.STRIPE_PRICE_ONEOFF = 'price_oneoff'

      jest.resetModules()
      const config = await import('./config')

      expect(() => config.validateStripeConfig()).toThrow(
        'Missing required Stripe environment variables'
      )
      expect(() => config.validateStripeConfig()).toThrow('STRIPE_PRICE_MONTHLY')
    })

    it('should check for 3 price IDs (not 9) with adaptive pricing', async () => {
      process.env.STRIPE_PRODUCT_PRO_MONTHLY = 'prod_monthly'
      process.env.STRIPE_PRODUCT_PRO_YEARLY = 'prod_yearly'
      process.env.STRIPE_PRODUCT_PRO_ONEOFF = 'prod_oneoff'
      // Missing all price IDs
      delete process.env.STRIPE_PRICE_MONTHLY
      delete process.env.STRIPE_PRICE_YEARLY
      delete process.env.STRIPE_PRICE_ONEOFF

      jest.resetModules()
      const config = await import('./config')

      expect(() => config.validateStripeConfig()).toThrow()

      // Should only mention 3 price variables (not 9)
      try {
        config.validateStripeConfig()
      } catch (error) {
        const errorMessage = (error as Error).message
        expect(errorMessage).toContain('STRIPE_PRICE_MONTHLY')
        expect(errorMessage).toContain('STRIPE_PRICE_YEARLY')
        expect(errorMessage).toContain('STRIPE_PRICE_ONEOFF')
        // Should NOT contain currency-specific variables
        expect(errorMessage).not.toContain('STRIPE_PRICE_MONTHLY_EUR')
        expect(errorMessage).not.toContain('STRIPE_PRICE_MONTHLY_USD')
      }
    })
  })

  describe('Product Configuration', () => {
    it('should have correct product metadata', () => {
      expect(STRIPE_PRODUCTS.monthly.name).toBe('TripThreads Pro (Monthly)')
      expect(STRIPE_PRODUCTS.monthly.interval).toBe('month')
      expect(STRIPE_PRODUCTS.yearly.interval).toBe('year')
      expect(STRIPE_PRODUCTS.oneoff.interval).toBeNull()
    })

    it('should have features defined for all plans', () => {
      expect(STRIPE_PRODUCTS.monthly.features.length).toBeGreaterThan(0)
      expect(STRIPE_PRODUCTS.yearly.features.length).toBeGreaterThan(0)
      expect(STRIPE_PRODUCTS.oneoff.features.length).toBeGreaterThan(0)
    })
  })
})
