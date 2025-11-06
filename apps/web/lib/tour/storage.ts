/**
 * Tour Storage
 *
 * Manages tour progress persistence in localStorage.
 * Tracks which tours have been started, completed, or dismissed.
 */

import { TourProgress } from './types'

const STORAGE_KEY = 'tripthreads_tour_progress'

/**
 * Get all tour progress from localStorage
 */
export function getAllTourProgress(): Record<string, TourProgress> {
  if (typeof window === 'undefined') return {}

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('Failed to load tour progress:', error)
    return {}
  }
}

/**
 * Get progress for a specific tour
 */
export function getTourProgress(tourId: string): TourProgress | null {
  const allProgress = getAllTourProgress()
  return allProgress[tourId] || null
}

/**
 * Save tour progress
 */
export function saveTourProgress(progress: TourProgress): void {
  if (typeof window === 'undefined') return

  try {
    const allProgress = getAllTourProgress()
    allProgress[progress.tourId] = {
      ...progress,
      lastActiveAt: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress))
  } catch (error) {
    console.error('Failed to save tour progress:', error)
  }
}

/**
 * Start a new tour
 */
export function startTour(tourId: string): TourProgress {
  const progress: TourProgress = {
    tourId,
    currentStep: 0,
    completed: false,
    dismissed: false,
    startedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  }

  saveTourProgress(progress)
  return progress
}

/**
 * Update current step
 */
export function updateTourStep(tourId: string, step: number): void {
  const progress = getTourProgress(tourId)
  if (!progress) return

  saveTourProgress({
    ...progress,
    currentStep: step,
  })
}

/**
 * Mark tour as completed
 */
export function completeTour(tourId: string): void {
  const progress = getTourProgress(tourId)
  if (!progress) return

  saveTourProgress({
    ...progress,
    completed: true,
    completedAt: new Date().toISOString(),
  })
}

/**
 * Mark tour as dismissed
 */
export function dismissTour(tourId: string): void {
  const progress = getTourProgress(tourId)
  if (!progress) return

  saveTourProgress({
    ...progress,
    dismissed: true,
  })
}

/**
 * Check if tour has been completed
 */
export function isTourCompleted(tourId: string): boolean {
  const progress = getTourProgress(tourId)
  return progress?.completed || false
}

/**
 * Check if tour has been dismissed
 */
export function isTourDismissed(tourId: string): boolean {
  const progress = getTourProgress(tourId)
  return progress?.dismissed || false
}

/**
 * Check if tour should be shown
 * (not completed and not dismissed if it's a show-once tour)
 */
export function shouldShowTour(tourId: string, showOnce: boolean): boolean {
  const progress = getTourProgress(tourId)

  if (!progress) return true // Never started

  if (progress.completed) return false // Already completed

  if (showOnce && progress.dismissed) return false // Dismissed and should only show once

  return true // Can resume
}

/**
 * Reset tour progress (for testing or user-initiated reset)
 */
export function resetTour(tourId: string): void {
  if (typeof window === 'undefined') return

  try {
    const allProgress = getAllTourProgress()
    delete allProgress[tourId]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress))
  } catch (error) {
    console.error('Failed to reset tour:', error)
  }
}

/**
 * Clear all tour progress
 */
export function clearAllTourProgress(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear tour progress:', error)
  }
}
