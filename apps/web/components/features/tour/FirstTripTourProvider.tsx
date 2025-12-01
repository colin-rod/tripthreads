'use client'

/**
 * FirstTripTourProvider Component
 *
 * Provides the first trip creation tour to new users.
 * Automatically shows the tour if:
 * - User has completed their profile
 * - User has no trips yet
 * - Tour hasn't been completed or dismissed
 */

import { useEffect, useState } from 'react'
import { Tour } from './Tour'
import { FIRST_TRIP_TOUR } from '@/lib/tour/configs'
import { shouldShowTour } from '@/lib/tour/storage'

interface FirstTripTourProviderProps {
  userHasTrips: boolean
  children: React.ReactNode
}

export function FirstTripTourProvider({ userHasTrips, children }: FirstTripTourProviderProps) {
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    // Only show tour for users with no trips
    if (userHasTrips) {
      setShowTour(false)
      return
    }

    // Check if tour should be shown
    const shouldShow = shouldShowTour(FIRST_TRIP_TOUR.id, FIRST_TRIP_TOUR.showOnce)
    setShowTour(shouldShow)
  }, [userHasTrips])

  const handleTourComplete = () => {
    setShowTour(false)
    console.log('[Tour] First trip tour completed')
  }

  const handleTourDismiss = () => {
    setShowTour(false)
    console.log('[Tour] First trip tour dismissed')
  }

  return (
    <>
      {children}
      {showTour && (
        <Tour
          config={FIRST_TRIP_TOUR}
          onComplete={handleTourComplete}
          onDismiss={handleTourDismiss}
          autoStart={true}
        />
      )}
    </>
  )
}
