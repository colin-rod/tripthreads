'use client'

/**
 * TripContext
 *
 * Global context for managing trip-specific state across the application.
 * Used to display trip information in the AppNavBar without prop drilling.
 *
 * Usage:
 * - TripPageClient sets trip context on mount
 * - AppNavBar reads context to conditionally render Row 2
 * - Context is cleared when navigating away from trip
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { TripSection } from '@/hooks/useHashNavigation'

/**
 * Trip context data structure
 */
export interface TripContextData {
  trip: {
    id: string
    name: string
    description: string | null
    start_date: string
    end_date: string
    cover_image_url?: string | null
    trip_participants: Array<{
      id: string
      role: 'owner' | 'participant' | 'viewer'
      join_start_date?: string | null
      join_end_date?: string | null
      user: {
        id: string
        full_name: string | null
        avatar_url: string | null
      }
    }>
  }
  isOwner: boolean
  userRole: 'owner' | 'participant' | 'viewer'
  activeSection: TripSection
}

/**
 * Context type with state management functions
 */
interface TripContextType {
  tripContext: TripContextData | null
  setTripContext: (data: TripContextData) => void
  clearTripContext: () => void
  updateActiveSection: (section: TripSection) => void
}

const TripContext = createContext<TripContextType | undefined>(undefined)

/**
 * TripContextProvider Component
 *
 * Wraps the application (or specific routes) to provide trip state management.
 * Should be placed in app layout to be available globally.
 */
export function TripContextProvider({ children }: { children: ReactNode }) {
  const [tripContext, setTripContextState] = useState<TripContextData | null>(null)

  /**
   * Set trip context - called by TripPageClient on mount
   */
  const setTripContext = useCallback((data: TripContextData) => {
    setTripContextState(data)
  }, [])

  /**
   * Clear trip context - called by TripPageClient on unmount
   */
  const clearTripContext = useCallback(() => {
    setTripContextState(null)
  }, [])

  /**
   * Update active section - called when hash changes
   */
  const updateActiveSection = useCallback((section: TripSection) => {
    setTripContextState(prev => (prev ? { ...prev, activeSection: section } : null))
  }, [])

  const value = {
    tripContext,
    setTripContext,
    clearTripContext,
    updateActiveSection,
  }

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>
}

/**
 * useTripContext Hook
 *
 * Access trip context from any component within TripContextProvider.
 * Throws error if used outside provider.
 *
 * @returns Trip context state and management functions
 */
export function useTripContext() {
  const context = useContext(TripContext)

  if (context === undefined) {
    throw new Error('useTripContext must be used within a TripContextProvider')
  }

  return context
}
