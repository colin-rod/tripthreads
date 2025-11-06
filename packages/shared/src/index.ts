/**
 * @tripthreads/shared
 * Shared utilities, types, and functions for TripThreads
 */

// Currency utilities
export { formatCurrency, convertToMinorUnits, convertFromMinorUnits } from './utils/currency'

// Database types
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from '../types/database'
export type { Trip, TripSummary } from '../types/trip'
export { toTripSummary } from '../types/trip'

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

// Re-export lib modules for backwards compatibility
export * from '../lib/supabase/queries/trips'
export * from '../lib/supabase/queries/users'
export * from '../lib/supabase/queries/invites'
export * from '../lib/validation/trip'
export * from '../lib/validation/profile'
export * from '../lib/validation/invite'
export * from '../lib/utils/avatar'

// Re-export types from lib/types
export type {
  TripInvite,
  InviteWithDetails,
  InviteLinkResult,
  AcceptInviteResult,
  InviteRole,
  InviteType,
  InviteStatus,
} from '../types/invite'
