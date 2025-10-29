'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function TripsPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--background]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[--primary] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[--muted-foreground]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[--background]">
      <nav className="bg-white border-b border-[--border]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-[--foreground]">TripThreads</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[--muted-foreground]">{user.email}</span>
              <button onClick={handleSignOut} className="text-sm text-[--primary] hover:underline">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-[--foreground] mb-2">Your Trips</h2>
          <p className="text-[--muted-foreground]">
            Create a new trip or browse your existing ones
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8 border border-[--border] text-center">
          <div className="w-16 h-16 bg-[--muted] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-[--muted-foreground]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[--foreground] mb-2">No trips yet</h3>
          <p className="text-[--muted-foreground] mb-6">
            Start planning your first adventure by creating a trip
          </p>
          <button className="bg-[--primary] text-[--primary-foreground] px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity">
            Create your first trip
          </button>
        </div>
      </main>
    </div>
  )
}
