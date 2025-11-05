/**
 * @tripthreads/shared
 * Shared utilities, types, and functions for TripThreads
 */

// Currency utilities
export { formatCurrency, convertToMinorUnits, convertFromMinorUnits } from './utils/currency'

// Database types
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from './types/database'

// Natural Language Parser (Production - OpenAI GPT-4o-mini)
export { SYSTEM_PROMPT, getDateParserPrompt, getExpenseParserPrompt } from './parser/llm-prompts'
export type {
  ParsedDateTime,
  DateParserOptions,
  ParsedExpense,
  ExpenseParserOptions,
  LLMParseRequest,
  LLMParserResult,
} from './types/parser'
