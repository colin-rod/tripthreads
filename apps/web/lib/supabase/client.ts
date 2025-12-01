import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@tripthreads/core'

import { createMissingSupabaseClient, getSupabaseEnv } from './env'

let supabaseSingleton: SupabaseClient<Database> | null = null

function initializeSupabaseClient() {
  const env = getSupabaseEnv()

  if (!env) {
    return createMissingSupabaseClient()
  }

  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey)
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
