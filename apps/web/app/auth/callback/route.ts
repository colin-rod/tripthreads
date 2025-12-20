import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { posthog } from '@/lib/analytics/posthog'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Profile is automatically created via database trigger

      // Track signup or login based on user's created_at timestamp
      // If created within last 10 seconds, treat as signup; otherwise login
      const createdAt = new Date(data.user.created_at)
      const now = new Date()
      const isNewUser = now.getTime() - createdAt.getTime() < 10000 // 10 seconds

      if (isNewUser) {
        posthog.capture('signup', {
          method: 'google',
          user_id: data.user.id,
        })
      } else {
        posthog.capture('login', {
          method: 'google',
          user_id: data.user.id,
        })
      }

      // Redirect to trips page
      return NextResponse.redirect(new URL('/trips', requestUrl.origin))
    }
  }

  // If there's an error or no code, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
