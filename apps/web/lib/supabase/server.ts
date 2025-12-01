import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@tripthreads/core'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { createMissingSupabaseClient, getSupabaseEnv } from './env'

export async function createClient() {
  const env = getSupabaseEnv()

  if (!env) {
    return createMissingSupabaseClient()
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

/**
 * Create a Supabase client with service role (bypasses RLS)
 * Use this ONLY for operations where you've already validated the user
 * in application code.
 */
export function createServiceClient() {
  const env = getSupabaseEnv()

  if (!env) {
    throw new Error('Supabase environment variables are not configured')
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createSupabaseClient<Database>(env.supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
