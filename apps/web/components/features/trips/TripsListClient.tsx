'use client'

/**
 * TripsListClient Component
 *
 * Client-side component for displaying categorized trips with search functionality
 */

import { useState } from 'react'
import { TripCard } from './TripCard'
import { EditTripDialog } from './EditTripDialog'
import { DeleteTripDialog } from './DeleteTripDialog'
import { filterAndCategorizeTrips, type Trip } from '@/lib/utils/trip-utils'

interface TripsListClientProps {
  trips: Trip[]
  searchQuery: string
}

export function TripsListClient({ trips, searchQuery }: TripsListClientProps) {
  const [editingTripId, setEditingTripId] = useState<string | null>(null)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)

  const categorized = filterAndCategorizeTrips(trips, searchQuery)
  const { upcoming, ongoing, past } = categorized

  const hasTrips = upcoming.length > 0 || ongoing.length > 0 || past.length > 0
  const isSearching = searchQuery.trim().length > 0

  // If searching and no results
  if (isSearching && !hasTrips) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <div className="rounded-full bg-muted p-6 mb-4">
          <svg
            className="h-12 w-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold mb-2">No trips found</h2>
        <p className="text-muted-foreground max-w-md">
          No trips match your search &quot;{searchQuery}&quot;. Try a different search term.
        </p>
      </div>
    )
  }

  const editingTrip = trips.find(t => t.id === editingTripId)
  const deletingTrip = trips.find(t => t.id === deletingTripId)

  return (
    <>
      <div className="space-y-12">
        {/* Ongoing Trips Section */}
        {ongoing.length > 0 && (
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
                Ongoing Trips
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Currently in progress</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ongoing.map(trip => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onEdit={setEditingTripId}
                  onDelete={setDeletingTripId}
                />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Trips Section */}
        {upcoming.length > 0 && (
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Upcoming Trips</h2>
              <p className="text-sm text-muted-foreground mt-1">Coming up soon</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcoming.map(trip => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onEdit={setEditingTripId}
                  onDelete={setDeletingTripId}
                />
              ))}
            </div>
          </section>
        )}

        {/* Past Trips Section */}
        {past.length > 0 && (
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-muted-foreground">Past Trips</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Memories from previous adventures
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {past.map(trip => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onEdit={setEditingTripId}
                  onDelete={setDeletingTripId}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Edit Trip Dialog */}
      {editingTrip && (
        <EditTripDialog
          trip={editingTrip}
          open={!!editingTripId}
          onOpenChange={open => !open && setEditingTripId(null)}
        />
      )}

      {/* Delete Trip Dialog */}
      {deletingTrip && (
        <DeleteTripDialog
          tripId={deletingTrip.id}
          tripName={deletingTrip.name}
          open={!!deletingTripId}
          onOpenChange={open => !open && setDeletingTripId(null)}
        />
      )}
    </>
  )
}
