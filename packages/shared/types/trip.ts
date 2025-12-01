import type { Database } from '@tripthreads/core'

/**
 * Trip record from the database.
 *
 * Mirrors the `trips` table schema in Supabase.
 */
export type Trip = Database['public']['Tables']['trips']['Row']

/**
 * Lightweight trip summary used in list views where we only
 * need the core trip details without nested relations.
 */
export interface TripSummary {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
}

/**
 * Convert a full trip row into a summary object that is convenient
 * for mobile list rendering while keeping type safety tied to the
 * generated database schema.
 */
export function toTripSummary(trip: Trip): TripSummary {
  return {
    id: trip.id,
    name: trip.name,
    description: trip.description,
    start_date: trip.start_date,
    end_date: trip.end_date,
  }
}
