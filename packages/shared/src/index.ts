/**
 * @tripthreads/shared
 * Shared utilities, types, and functions for TripThreads
 */

// Currency utilities
export { formatCurrency, convertToMinorUnits, convertFromMinorUnits } from './utils/currency'

// Database types (re-exported from @tripthreads/core)
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from '@tripthreads/core'
export type { Trip, TripSummary } from '../types/trip'
export { toTripSummary } from '../types/trip'

// Natural Language Parser (Production - OpenAI GPT-4o-mini)
export { SYSTEM_PROMPT, getDateParserPrompt, getExpenseParserPrompt } from './parser/llm-prompts'
export { parseNaturalDate, parseExpense, detectSplitType, normalizeSplitType } from './parser'
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
// Avatar utilities moved to platform-specific locations
// For web: import from apps/web/lib/utils/avatar
// For mobile: import from apps/mobile/lib/utils/avatar
// For platform-agnostic utilities: import { generateAvatarPath, getAvatarUrl } from '@tripthreads/core'

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
