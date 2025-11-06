'use client'

/**
 * TripsPageWrapper Component
 *
 * Client-side wrapper that manages search state for trips page
 */

import { useState } from 'react'
import { TopNavBar } from '@/components/layouts/TopNavBar'
import { TripsListClient } from './TripsListClient'
import { CreateTripButton } from './CreateTripButton'
import { type Trip } from '@/lib/utils/trip-utils'

interface TripsPageWrapperProps {
  trips: Trip[]
}

export function TripsPageWrapper({ trips }: TripsPageWrapperProps) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <>
      <TopNavBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Main content with proper spacing for fixed nav */}
      <div className="pt-20 md:pt-16">
        <div className="container mx-auto py-8 px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Your Trips</h1>
              <p className="text-muted-foreground mt-1">
                Plan, organize, and track your adventures
              </p>
            </div>
            <CreateTripButton />
          </div>

          {/* Trips List */}
          <TripsListClient trips={trips} searchQuery={searchQuery} />
        </div>
      </div>
    </>
  )
}
