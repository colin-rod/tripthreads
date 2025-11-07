import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@tripthreads/core'

let supabaseSingleton: SupabaseClient<Database> | null = null

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return { supabaseUrl, supabaseAnonKey }
}

function initializeSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv()

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })
}

export function createClient() {
  if (!supabaseSingleton) {
    supabaseSingleton = initializeSupabaseClient()
  }

  return supabaseSingleton
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, _receiver) {
    const client = createClient()
    const value = client[prop as keyof SupabaseClient<Database>]

    return typeof value === 'function' ? value.bind(client) : value
  },
  set(_target, prop, value) {
    const client = createClient()
    ;(client as any)[prop] = value
    return true
  },
})
