/**
 * Cost Tracking Utility Tests
 *
 * Acceptance Criteria Coverage:
 * - AC#9: Cost Optimization & Performance - 50%
 *
 * Test Coverage:
 * - Single parse cost calculation
 * - Aggregated metrics across multiple parses
 * - Monthly cost projections
 * - Cost formatting
 * - Edge cases (zero tokens, large volumes)
 *
 * Test Count: 20 tests
 *
 * How to run:
 * npm test -- apps/web/lib/parser/__tests__/cost-tracker.test.ts
 */

import {
  calculateParseCost,
  aggregateCostMetrics,
  projectedMonthlyCost,
  formatCost,
  PRICING,
  type ParseCost,
} from '../cost-tracker'

describe('Cost Tracking Utilities', () => {
  describe('calculateParseCost', () => {
    it('calculates cost for simple expense parse', () => {
      // Typical simple expense: 120 prompt + 30 completion = 150 total tokens
      const cost = calculateParseCost(120, 30)

      expect(cost.promptTokens).toBe(120)
      expect(cost.completionTokens).toBe(30)
      expect(cost.totalTokens).toBe(150)

      // Expected: (120/1M * 0.15) + (30/1M * 0.6) = 0.000018 + 0.000018 = 0.000036
      expect(cost.costUsd).toBeCloseTo(0.000036, 6)
    })

    it('calculates cost for complex split parse', () => {
      // Complex expense with splits: 360 prompt + 90 completion = 450 total tokens
      const cost = calculateParseCost(360, 90)

      expect(cost.totalTokens).toBe(450)

      // Expected: (360/1M * 0.15) + (90/1M * 0.6) = 0.000054 + 0.000054 = 0.000108
      expect(cost.costUsd).toBeCloseTo(0.000108, 6)
    })

    it('calculates cost for itinerary parse', () => {
      // Itinerary parse: 180 prompt + 40 completion = 220 total tokens
      const cost = calculateParseCost(180, 40)

      expect(cost.totalTokens).toBe(220)

      // Expected: (180/1M * 0.15) + (40/1M * 0.6) = 0.000027 + 0.000024 = 0.000051
      expect(cost.costUsd).toBeCloseTo(0.000051, 6)
    })

    it('handles zero tokens', () => {
      const cost = calculateParseCost(0, 0)

      expect(cost.totalTokens).toBe(0)
      expect(cost.costUsd).toBe(0)
    })

    it('handles large token counts', () => {
      // Very complex parse: 10,000 prompt + 2,000 completion
      const cost = calculateParseCost(10_000, 2_000)

      expect(cost.totalTokens).toBe(12_000)

      // Expected: (10000/1M * 0.15) + (2000/1M * 0.6) = 0.0015 + 0.0012 = 0.0027
      expect(cost.costUsd).toBeCloseTo(0.0027, 6)
    })

    it('applies correct pricing rates', () => {
      // Verify pricing constants
      expect(PRICING.INPUT_TOKENS_PER_MILLION).toBe(0.15)
      expect(PRICING.OUTPUT_TOKENS_PER_MILLION).toBe(0.6)

      // Output tokens should be 4x more expensive than input tokens
      const ratio = PRICING.OUTPUT_TOKENS_PER_MILLION / PRICING.INPUT_TOKENS_PER_MILLION
      expect(ratio).toBe(4)
    })
  })

  describe('aggregateCostMetrics', () => {
    it('aggregates metrics for multiple parses', () => {
      const parses: ParseCost[] = [
        calculateParseCost(120, 30), // 150 tokens, ~$0.000036
        calculateParseCost(180, 40), // 220 tokens, ~$0.000051
        calculateParseCost(360, 90), // 450 tokens, ~$0.000108
      ]

      const metrics = aggregateCostMetrics(parses)

      expect(metrics.totalParses).toBe(3)
      expect(metrics.totalTokens).toBe(820) // 150 + 220 + 450
      expect(metrics.averageTokensPerParse).toBeCloseTo(273.33, 2)

      // Total cost: 0.000036 + 0.000051 + 0.000108 = 0.000195
      expect(metrics.totalCostUsd).toBeCloseTo(0.000195, 6)
      expect(metrics.averageCostPerParse).toBeCloseTo(0.000065, 6)
    })

    it('handles empty array', () => {
      const metrics = aggregateCostMetrics([])

      expect(metrics.totalParses).toBe(0)
      expect(metrics.totalTokens).toBe(0)
      expect(metrics.totalCostUsd).toBe(0)
      expect(metrics.averageTokensPerParse).toBe(0)
      expect(metrics.averageCostPerParse).toBe(0)
    })

    it('handles single parse', () => {
      const parses: ParseCost[] = [calculateParseCost(120, 30)]

      const metrics = aggregateCostMetrics(parses)

      expect(metrics.totalParses).toBe(1)
      expect(metrics.totalTokens).toBe(150)
      expect(metrics.averageTokensPerParse).toBe(150)
      expect(metrics.averageCostPerParse).toBeCloseTo(0.000036, 6)
    })

    it('calculates averages correctly for large dataset', () => {
      // Simulate 100 parses
      const parses: ParseCost[] = Array.from({ length: 100 }, () => calculateParseCost(240, 60))

      const metrics = aggregateCostMetrics(parses)

      expect(metrics.totalParses).toBe(100)
      expect(metrics.totalTokens).toBe(30_000) // 300 tokens * 100
      expect(metrics.averageTokensPerParse).toBe(300)

      // Each parse: (240/1M * 0.15) + (60/1M * 0.6) = 0.000036 + 0.000036 = 0.000072
      expect(metrics.averageCostPerParse).toBeCloseTo(0.000072, 6)
      expect(metrics.totalCostUsd).toBeCloseTo(0.0072, 6)
    })
  })

  describe('projectedMonthlyCost', () => {
    it('projects cost for 1k parses/day (baseline)', () => {
      // Average cost per parse: $0.000072 (300 tokens: 240 prompt + 60 completion)
      const averageCost = 0.000072
      const projection = projectedMonthlyCost(1000, averageCost, 30)

      expect(projection.parsesPerDay).toBe(1000)
      expect(projection.daysPerMonth).toBe(30)
      expect(projection.totalParses).toBe(30_000)
      expect(projection.averageCostPerParse).toBe(0.000072)

      // Monthly cost: 1000 * 30 * 0.000072 = $2.16
      expect(projection.totalCostUsd).toBeCloseTo(2.16, 2)
    })

    it('projects cost for 10k parses/day (high volume)', () => {
      const averageCost = 0.000072
      const projection = projectedMonthlyCost(10_000, averageCost, 30)

      expect(projection.totalParses).toBe(300_000)

      // Monthly cost: 10000 * 30 * 0.000072 = $21.60
      expect(projection.totalCostUsd).toBeCloseTo(21.6, 2)
    })

    it('projects cost for 100 parses/day (low volume)', () => {
      const averageCost = 0.000072
      const projection = projectedMonthlyCost(100, averageCost, 30)

      expect(projection.totalParses).toBe(3_000)

      // Monthly cost: 100 * 30 * 0.000072 = $0.216
      expect(projection.totalCostUsd).toBeCloseTo(0.216, 3)
    })

    it('uses default 30 days if not specified', () => {
      const projection = projectedMonthlyCost(1000, 0.000072)

      expect(projection.daysPerMonth).toBe(30)
      expect(projection.totalParses).toBe(30_000)
    })

    it('handles custom month length (31 days)', () => {
      const projection = projectedMonthlyCost(1000, 0.000072, 31)

      expect(projection.daysPerMonth).toBe(31)
      expect(projection.totalParses).toBe(31_000)
      expect(projection.totalCostUsd).toBeCloseTo(2.232, 3)
    })

    it('handles zero volume', () => {
      const projection = projectedMonthlyCost(0, 0.000072, 30)

      expect(projection.totalParses).toBe(0)
      expect(projection.totalCostUsd).toBe(0)
    })

    it('compares simple vs complex expense costs', () => {
      const simpleCost = calculateParseCost(120, 30).costUsd // ~$0.000036
      const complexCost = calculateParseCost(360, 90).costUsd // ~$0.000108

      const simpleProjection = projectedMonthlyCost(1000, simpleCost, 30)
      const complexProjection = projectedMonthlyCost(1000, complexCost, 30)

      // Complex should be ~3x more expensive
      const costRatio = complexProjection.totalCostUsd / simpleProjection.totalCostUsd
      expect(costRatio).toBeCloseTo(3, 1)

      expect(simpleProjection.totalCostUsd).toBeCloseTo(1.08, 2)
      expect(complexProjection.totalCostUsd).toBeCloseTo(3.24, 2)
    })
  })

  describe('formatCost', () => {
    it('formats very small costs with 6 decimals', () => {
      expect(formatCost(0.000036)).toBe('$0.000036')
      expect(formatCost(0.000072)).toBe('$0.000072')
      expect(formatCost(0.000108)).toBe('$0.000108')
    })

    it('formats small costs (< $0.01) with 6 decimals', () => {
      expect(formatCost(0.0027)).toBe('$0.002700')
      expect(formatCost(0.009999)).toBe('$0.009999')
    })

    it('formats normal costs with 2 decimals', () => {
      expect(formatCost(2.16)).toBe('$2.16')
      expect(formatCost(21.6)).toBe('$21.60')
      expect(formatCost(100)).toBe('$100.00')
    })

    it('formats zero cost', () => {
      expect(formatCost(0)).toBe('$0.000000')
    })

    it('formats boundary cost (exactly $0.01)', () => {
      expect(formatCost(0.01)).toBe('$0.01')
    })

    it('formats large costs', () => {
      expect(formatCost(1000)).toBe('$1000.00')
      expect(formatCost(9999.99)).toBe('$9999.99')
    })
  })

  describe('Real-World Scenarios', () => {
    it('calculates cost for typical daily usage (100 parses)', () => {
      // Mix of parse types
      const parses: ParseCost[] = [
        ...Array.from({ length: 60 }, () => calculateParseCost(120, 30)), // 60 simple
        ...Array.from({ length: 30 }, () => calculateParseCost(240, 60)), // 30 medium
        ...Array.from({ length: 10 }, () => calculateParseCost(360, 90)), // 10 complex
      ]

      const metrics = aggregateCostMetrics(parses)

      expect(metrics.totalParses).toBe(100)

      // Simple: 60 * 0.000036 = 0.00216
      // Medium: 30 * 0.000072 = 0.00216
      // Complex: 10 * 0.000108 = 0.00108
      // Total: 0.0054
      expect(metrics.totalCostUsd).toBeCloseTo(0.0054, 4)

      // Project to monthly
      const monthlyProjection = projectedMonthlyCost(100, metrics.averageCostPerParse, 30)

      // Monthly: 100 parses/day × 30 days × avg cost
      // = 3000 parses × 0.000054 = 0.162
      expect(monthlyProjection.totalCostUsd).toBeCloseTo(0.162, 3)
    })

    it('validates cost stays under $10/month for 1k parses/day', () => {
      // Worst case: all complex parses
      const worstCaseCost = calculateParseCost(360, 90).costUsd

      const projection = projectedMonthlyCost(1000, worstCaseCost, 30)

      // Should be well under $10/month even in worst case
      expect(projection.totalCostUsd).toBeLessThan(10)
      expect(projection.totalCostUsd).toBeCloseTo(3.24, 2)
    })
  })
})
