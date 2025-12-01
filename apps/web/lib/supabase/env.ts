import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@tripthreads/core'

const REQUIRED_ENV_VARS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const

let missingEnvError: Error | null = null
let missingClient: SupabaseClient<Database> | null = null

export interface SupabaseEnv {
  supabaseUrl: string
  supabaseAnonKey: string
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return { supabaseUrl, supabaseAnonKey }
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null
}

export function getMissingSupabaseEnvError(): Error {
  if (!missingEnvError) {
    const missingVars = REQUIRED_ENV_VARS.filter(name => !process.env[name])
    const details = missingVars.length > 0 ? `: ${missingVars.join(', ')}` : ''
    missingEnvError = new Error(`Missing Supabase environment variables${details}`)
  }

  return missingEnvError
}

export function createMissingSupabaseClient(): SupabaseClient<Database> {
  if (!missingClient) {
    const error = getMissingSupabaseEnvError()

    missingClient = new Proxy(
      {},
      {
        get() {
          throw error
        },
        set() {
          throw error
        },
        apply() {
          throw error
        },
      }
    ) as SupabaseClient<Database>
  }

  return missingClient
}
