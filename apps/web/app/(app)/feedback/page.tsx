import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@tripthreads/core/queries/users'
import { FeedbackForm } from '@/components/features/feedback/FeedbackForm'

export const metadata = {
  title: 'Feedback | TripThreads',
  description: 'Share feedback with the TripThreads team',
}

export default async function FeedbackPage() {
  const supabase = await createClient()

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
}
