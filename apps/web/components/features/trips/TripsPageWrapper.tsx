'use client'

/**
 * TripsPageWrapper Component
 *
 * Client-side wrapper that manages search state for trips page.
 * Note: Global AppNavBar is rendered in app/(app)/layout.tsx,
 * so no navbar is needed here. Search is now in the content area.
 */

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { TripsListClient } from './TripsListClient'
import { CreateTripButton } from './CreateTripButton'
import { type Trip } from '@/lib/utils/trip-utils'

interface TripsPageWrapperProps {
  trips: Trip[]
}

export function TripsPageWrapper({ trips }: TripsPageWrapperProps) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Search Input - Moved from TopNavBar to content area */}
      <div className="relative mb-6 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search trips..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 bg-muted/50 border-border focus:bg-background"
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Trips</h1>
          <p className="text-muted-foreground mt-1">Plan, organize, and track your adventures</p>
        </div>
        <CreateTripButton />
      </div>

      {/* Trips List */}
      <TripsListClient trips={trips} searchQuery={searchQuery} />
    </div>
  )
}
