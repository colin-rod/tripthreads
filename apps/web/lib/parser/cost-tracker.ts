/**
 * Cost Tracking Utilities for OpenAI API Usage
 *
 * Tracks and calculates costs for OpenAI GPT-4o-mini API usage.
 * Pricing (as of January 2025):
 * - Input: $0.150 / 1M tokens
 * - Output: $0.600 / 1M tokens
 */

// OpenAI GPT-4o-mini pricing (January 2025)
export const PRICING = {
  INPUT_TOKENS_PER_MILLION: 0.15, // $0.150 / 1M tokens
  OUTPUT_TOKENS_PER_MILLION: 0.6, // $0.600 / 1M tokens
} as const

export interface ParseCost {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: number
}

export interface CostMetrics {
  totalParses: number
  totalTokens: number
  totalCostUsd: number
  averageTokensPerParse: number
  averageCostPerParse: number
}

export interface MonthlyProjection {
  parsesPerDay: number
  daysPerMonth: number
  totalParses: number
  totalCostUsd: number
  averageCostPerParse: number
}

/**
 * Calculates the cost of a single parse based on token usage
 *
 * @param promptTokens - Number of input tokens (prompt + user input)
 * @param completionTokens - Number of output tokens (LLM response)
 * @returns Cost breakdown including total cost in USD
 *
 * @example
 * ```typescript
 * const cost = calculateParseCost(240, 60)
 * console.log(cost.costUsd) // 0.000072 ($0.000072)
 * ```
 */
export function calculateParseCost(promptTokens: number, completionTokens: number): ParseCost {
  const inputCost = (promptTokens / 1_000_000) * PRICING.INPUT_TOKENS_PER_MILLION
  const outputCost = (completionTokens / 1_000_000) * PRICING.OUTPUT_TOKENS_PER_MILLION
  const costUsd = inputCost + outputCost

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsd,
  }
}

/**
 * Aggregates cost metrics across multiple parses
 *
 * @param parses - Array of individual parse costs
 * @returns Aggregated metrics including totals and averages
 *
 * @example
 * ```typescript
 * const parses = [
 *   calculateParseCost(240, 60),
 *   calculateParseCost(180, 40),
 * ]
 * const metrics = aggregateCostMetrics(parses)
 * console.log(metrics.totalCostUsd) // 0.000114
 * ```
 */
export function aggregateCostMetrics(parses: ParseCost[]): CostMetrics {
  const totalParses = parses.length
  const totalTokens = parses.reduce((sum, parse) => sum + parse.totalTokens, 0)
  const totalCostUsd = parses.reduce((sum, parse) => sum + parse.costUsd, 0)

  return {
    totalParses,
    totalTokens,
    totalCostUsd,
    averageTokensPerParse: totalParses > 0 ? totalTokens / totalParses : 0,
    averageCostPerParse: totalParses > 0 ? totalCostUsd / totalParses : 0,
  }
}

/**
 * Projects monthly cost based on daily parse volume
 *
 * @param parsesPerDay - Average number of parses per day
 * @param averageCost - Average cost per parse (from historical data)
 * @param daysPerMonth - Number of days in the month (default: 30)
 * @returns Monthly cost projection
 *
 * @example
 * ```typescript
 * const projection = projectedMonthlyCost(1000, 0.00018, 30)
 * console.log(projection.totalCostUsd) // 5.40
 * ```
 */
export function projectedMonthlyCost(
  parsesPerDay: number,
  averageCost: number,
  daysPerMonth: number = 30
): MonthlyProjection {
  const totalParses = parsesPerDay * daysPerMonth
  const totalCostUsd = totalParses * averageCost

  return {
    parsesPerDay,
    daysPerMonth,
    totalParses,
    totalCostUsd,
    averageCostPerParse: averageCost,
  }
}

/**
 * Formats cost in USD with appropriate precision
 *
 * @param costUsd - Cost in USD
 * @returns Formatted string (e.g., "$0.000072" or "$5.40")
 *
 * @example
 * ```typescript
 * formatCost(0.000072) // "$0.000072"
 * formatCost(5.40) // "$5.40"
 * ```
 */
export function formatCost(costUsd: number): string {
  if (costUsd < 0.01) {
    return `$${costUsd.toFixed(6)}`
  }
  return `$${costUsd.toFixed(2)}`
}
