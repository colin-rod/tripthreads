import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if user profile exists in public.users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single()

      // Create profile if it doesn't exist (for OAuth users)
      if (!existingUser) {
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata.full_name || data.user.email!.split('@')[0],
          avatar_url: data.user.user_metadata.avatar_url,
          plan: 'free',
        })
      }

      // Redirect to trips page
      return NextResponse.redirect(new URL('/trips', requestUrl.origin))
    }
  }

  // If there's an error or no code, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
