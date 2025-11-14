import type { PostgrestError } from '@supabase/supabase-js'

export type SupabaseErrorContext = {
  operation?: string
  select?: string
  tripId?: string
  ownerId?: string
  [key: string]: unknown
}

const normalizeSelectFragment = (fragment?: string) =>
  fragment?.replace(/\s+/g, ' ').trim()

export function logSupabaseError(error: PostgrestError, context: SupabaseErrorContext = {}) {
  const { select, ...rest } = context

  const payload = {
    ...rest,
    ...(select ? { select: normalizeSelectFragment(select) } : {}),
    supabase: {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
    },
  }

  console.error('Supabase query failed', payload)
}
