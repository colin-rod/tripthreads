'use client'

/**
 * TripsListClient Component
 *
 * Client-side component for displaying categorized trips
 */

import { useState } from 'react'
import { TripCard } from './TripCard'
import { EditTripDialog } from './EditTripDialog'
import { DeleteTripDialog } from './DeleteTripDialog'
import { filterAndCategorizeTrips, type Trip } from '@/lib/utils/trip-utils'

interface TripsListClientProps {
  trips: Trip[]
}

export function TripsListClient({ trips }: TripsListClientProps) {
  const [editingTripId, setEditingTripId] = useState<string | null>(null)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)

  const categorized = filterAndCategorizeTrips(trips, '')
  const { upcoming, ongoing, past } = categorized

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
