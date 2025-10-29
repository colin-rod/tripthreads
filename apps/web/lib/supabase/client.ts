import { createClient } from '@supabase/supabase-js'
import type { Database } from '@tripthreads/shared'

// Allow environment variables to be set before import (for testing)
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tbwbaydyyjokrsjtgerh.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRid2JheWR5eWpva3JzanRnZXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NDU3NTIsImV4cCI6MjA3NzIyMTc1Mn0.leF3xI7QVNOTWvwNW-V8H0dsIKnlfDtrkiR_8XPhItQ'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
