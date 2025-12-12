'use client'

/**
 * TripsPageWrapper Component
 *
 * Client-side wrapper for trips page.
 * Note: Global AppNavBar is rendered in app/(app)/layout.tsx,
 * so no navbar is needed here.
 */

import { TripsListClient } from './TripsListClient'
import { CreateTripButton } from './CreateTripButton'
import { type Trip } from '@/lib/utils/trip-utils'

interface TripsPageWrapperProps {
  trips: Trip[]
}

export function TripsPageWrapper({ trips }: TripsPageWrapperProps) {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Trips</h1>
          <p className="text-muted-foreground mt-1">Plan, organize, and track your adventures</p>
        </div>
        <CreateTripButton />
      </div>

      {/* Trips List */}
      <TripsListClient trips={trips} />
    </div>
  )
}
