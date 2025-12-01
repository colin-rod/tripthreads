/**
 * Tour Storage Tests
 *
 * Tests for localStorage-based tour progress tracking.
 */

import {
  getAllTourProgress,
  getTourProgress,
  saveTourProgress,
  startTour,
  updateTourStep,
  completeTour,
  dismissTour,
  isTourCompleted,
  isTourDismissed,
  shouldShowTour,
  resetTour,
  clearAllTourProgress,
} from '@/lib/tour/storage'
import type { TourProgress } from '@/lib/tour/types'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('Tour Storage', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('getAllTourProgress', () => {
    it('returns empty object when no progress stored', () => {
      const progress = getAllTourProgress()
      expect(progress).toEqual({})
    })

    it('returns all stored tour progress', () => {
      const mockProgress: TourProgress = {
        tourId: 'test-tour',
        currentStep: 2,
        completed: false,
        dismissed: false,
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }

      saveTourProgress(mockProgress)

      const allProgress = getAllTourProgress()
      expect(allProgress['test-tour']).toBeDefined()
      expect(allProgress['test-tour'].currentStep).toBe(2)
    })

    it('handles corrupted localStorage data gracefully', () => {
      localStorage.setItem('tripthreads_tour_progress', 'invalid json')
      const progress = getAllTourProgress()
      expect(progress).toEqual({})
    })
  })

  describe('getTourProgress', () => {
    it('returns null when tour progress does not exist', () => {
      const progress = getTourProgress('nonexistent-tour')
      expect(progress).toBeNull()
    })

    it('returns stored tour progress', () => {
      const mockProgress: TourProgress = {
        tourId: 'test-tour',
        currentStep: 1,
        completed: false,
        dismissed: false,
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }

      saveTourProgress(mockProgress)

      const progress = getTourProgress('test-tour')
      expect(progress).not.toBeNull()
      expect(progress?.currentStep).toBe(1)
    })
  })

  describe('startTour', () => {
    it('creates new tour progress with initial state', () => {
      const progress = startTour('first-trip-creation')

      expect(progress.tourId).toBe('first-trip-creation')
      expect(progress.currentStep).toBe(0)
      expect(progress.completed).toBe(false)
      expect(progress.dismissed).toBe(false)
      expect(progress.startedAt).toBeDefined()
      expect(progress.lastActiveAt).toBeDefined()
    })

    it('stores tour progress in localStorage', () => {
      startTour('test-tour')

      const stored = getTourProgress('test-tour')
      expect(stored).not.toBeNull()
      expect(stored?.tourId).toBe('test-tour')
    })
  })

  describe('updateTourStep', () => {
    it('updates current step', () => {
      startTour('test-tour')
      updateTourStep('test-tour', 2)

      const progress = getTourProgress('test-tour')
      expect(progress?.currentStep).toBe(2)
    })

    it('updates lastActiveAt timestamp', () => {
      const initialProgress = startTour('test-tour')
      const initialTimestamp = initialProgress.lastActiveAt

      // Wait a bit to ensure timestamp changes
      setTimeout(() => {
        updateTourStep('test-tour', 1)

        const updatedProgress = getTourProgress('test-tour')
        expect(updatedProgress?.lastActiveAt).not.toBe(initialTimestamp)
      }, 10)
    })

    it('does nothing if tour does not exist', () => {
      updateTourStep('nonexistent-tour', 5)
      const progress = getTourProgress('nonexistent-tour')
      expect(progress).toBeNull()
    })
  })

  describe('completeTour', () => {
    it('marks tour as completed', () => {
      startTour('test-tour')
      completeTour('test-tour')

      const progress = getTourProgress('test-tour')
      expect(progress?.completed).toBe(true)
      expect(progress?.completedAt).toBeDefined()
    })

    it('does nothing if tour does not exist', () => {
      completeTour('nonexistent-tour')
      const progress = getTourProgress('nonexistent-tour')
      expect(progress).toBeNull()
    })
  })

  describe('dismissTour', () => {
    it('marks tour as dismissed', () => {
      startTour('test-tour')
      dismissTour('test-tour')

      const progress = getTourProgress('test-tour')
      expect(progress?.dismissed).toBe(true)
    })

    it('allows resuming later', () => {
      startTour('test-tour')
      updateTourStep('test-tour', 2)
      dismissTour('test-tour')

      const progress = getTourProgress('test-tour')
      expect(progress?.currentStep).toBe(2) // Step is preserved
      expect(progress?.dismissed).toBe(true)
    })
  })

  describe('isTourCompleted', () => {
    it('returns false for non-existent tour', () => {
      expect(isTourCompleted('nonexistent-tour')).toBe(false)
    })

    it('returns false for incomplete tour', () => {
      startTour('test-tour')
      expect(isTourCompleted('test-tour')).toBe(false)
    })

    it('returns true for completed tour', () => {
      startTour('test-tour')
      completeTour('test-tour')
      expect(isTourCompleted('test-tour')).toBe(true)
    })
  })

  describe('isTourDismissed', () => {
    it('returns false for non-existent tour', () => {
      expect(isTourDismissed('nonexistent-tour')).toBe(false)
    })

    it('returns false for active tour', () => {
      startTour('test-tour')
      expect(isTourDismissed('test-tour')).toBe(false)
    })

    it('returns true for dismissed tour', () => {
      startTour('test-tour')
      dismissTour('test-tour')
      expect(isTourDismissed('test-tour')).toBe(true)
    })
  })

  describe('shouldShowTour', () => {
    it('returns true for new tour', () => {
      expect(shouldShowTour('new-tour', true)).toBe(true)
    })

    it('returns false for completed tour', () => {
      startTour('test-tour')
      completeTour('test-tour')
      expect(shouldShowTour('test-tour', true)).toBe(false)
    })

    it('returns false for dismissed show-once tour', () => {
      startTour('test-tour')
      dismissTour('test-tour')
      expect(shouldShowTour('test-tour', true)).toBe(false)
    })

    it('returns true for dismissed non-show-once tour', () => {
      startTour('test-tour')
      dismissTour('test-tour')
      expect(shouldShowTour('test-tour', false)).toBe(true)
    })

    it('returns true for active tour', () => {
      startTour('test-tour')
      updateTourStep('test-tour', 2)
      expect(shouldShowTour('test-tour', true)).toBe(true)
    })
  })

  describe('resetTour', () => {
    it('removes tour progress', () => {
      startTour('test-tour')
      updateTourStep('test-tour', 3)

      resetTour('test-tour')

      const progress = getTourProgress('test-tour')
      expect(progress).toBeNull()
    })

    it('does not affect other tours', () => {
      startTour('tour-1')
      startTour('tour-2')

      resetTour('tour-1')

      expect(getTourProgress('tour-1')).toBeNull()
      expect(getTourProgress('tour-2')).not.toBeNull()
    })
  })

  describe('clearAllTourProgress', () => {
    it('removes all tour progress', () => {
      startTour('tour-1')
      startTour('tour-2')
      startTour('tour-3')

      clearAllTourProgress()

      expect(getTourProgress('tour-1')).toBeNull()
      expect(getTourProgress('tour-2')).toBeNull()
      expect(getTourProgress('tour-3')).toBeNull()
    })

    it('resets to empty object', () => {
      startTour('test-tour')
      clearAllTourProgress()

      const allProgress = getAllTourProgress()
      expect(allProgress).toEqual({})
    })
  })
})
