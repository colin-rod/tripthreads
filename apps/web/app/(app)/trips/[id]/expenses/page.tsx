/**
 * Expenses Page - Redirects to Hash Navigation
 *
 * This page redirects to the main trip page with #expenses hash.
 * Maintains backward compatibility with old URLs.
 */

'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function TripExpensesPage() {
  const params = useParams()
  const router = useRouter()
  const tripId = params.id as string

  useEffect(() => {
    // Redirect to hash-based navigation
    router.replace(`/trips/${tripId}#expenses`)
  }, [tripId, router])

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">Redirecting to expenses...</p>
    </div>
  )
}
