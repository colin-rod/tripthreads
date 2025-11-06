/**
 * Tour Module Exports
 *
 * Centralizes all tour-related exports for easy importing.
 */

// Components
export { Tour, useTour } from './Tour'
export { TourSpotlight } from './TourSpotlight'
export { TourTooltip } from './TourTooltip'
export { FirstTripTourProvider } from './FirstTripTourProvider'

// Configuration
export { FIRST_TRIP_TOUR, TOURS, getTourConfig } from '@/lib/tour/configs'

// Storage utilities
export {
  startTour,
  updateTourStep,
  completeTour,
  dismissTour,
  getTourProgress,
  shouldShowTour,
  resetTour,
  clearAllTourProgress,
} from '@/lib/tour/storage'

// Types
export type { TourConfig, TourStep, TourProgress, TourState } from '@/lib/tour/types'
