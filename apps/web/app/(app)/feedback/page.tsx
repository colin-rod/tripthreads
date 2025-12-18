import { MessageSquare } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@tripthreads/core/queries/users'
import { getMissingSupabaseEnvError, isSupabaseConfigured } from '@/lib/supabase/env'
import { FeedbackForm } from '@/components/features/feedback/FeedbackForm'

export const metadata = {
  title: 'Feedback | TripThreads',
  description: 'Share feedback with the TripThreads team',
}

export default async function FeedbackPage() {
  if (!isSupabaseConfigured()) {
    const missingEnvError = getMissingSupabaseEnvError()

    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <div className="rounded-full bg-muted p-6 mb-4">
          <MessageSquare className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Supabase configuration required</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {missingEnvError.message}. Add the required environment variables to enable feedback
          submission.
        </p>
      </div>
    )
  }

  const supabase = await createClient()

  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      redirect('/login')
    }

    const profile = await getCurrentUser(supabase)
    const defaultEmail = profile?.email || authUser.email || undefined

    return (
      <div className="container max-w-3xl py-10 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Share feedback</h1>
          <p className="text-muted-foreground">
            Tell us what&apos;s working well and where we can improve. Screenshots help us debug
            faster.
          </p>
        </div>

        <FeedbackForm defaultEmail={defaultEmail ?? ''} />
      </div>
    )
  } catch (error) {
    console.error('Error loading feedback page:', error)
    const errorMessage =
      error instanceof Error && error.message.startsWith('Missing Supabase environment variables')
        ? `${getMissingSupabaseEnvError().message}. Add the required environment variables to enable feedback submission.`
        : error instanceof Error
          ? error.message
          : 'An unexpected error occurred'

    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <div className="rounded-full bg-muted p-6 mb-4">
          <MessageSquare className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Unable to load feedback page</h2>
        <p className="text-muted-foreground mb-6 max-w-md">{errorMessage}</p>
      </div>
    )
  }
}
