/**
 * Onboarding Storage Tests
 *
 * Tests for localStorage-based onboarding state management.
 */

import {
  getOnboardingState,
  saveOnboardingState,
  startOnboarding,
  updateOnboardingStep,
  completeOnboarding,
  skipOnboarding,
  isOnboardingCompleted,
  shouldShowOnboarding,
  resetOnboarding,
} from '@/lib/onboarding/storage'
import type { OnboardingState } from '@/lib/onboarding/types'

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

describe('Onboarding Storage', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('getOnboardingState', () => {
    it('returns null when no state stored', () => {
      const state = getOnboardingState()
      expect(state).toBeNull()
    })

    it('returns stored onboarding state', () => {
      const mockState: OnboardingState = {
        currentStep: 'roles',
        completed: false,
        skipped: false,
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }

      saveOnboardingState(mockState)

      const state = getOnboardingState()
      expect(state).not.toBeNull()
      expect(state?.currentStep).toBe('roles')
    })

    it('handles corrupted localStorage data gracefully', () => {
      localStorage.setItem('tripthreads_onboarding_state', 'invalid json')
      const state = getOnboardingState()
      expect(state).toBeNull()
    })
  })

  describe('startOnboarding', () => {
    it('creates new onboarding state with welcome step', () => {
      const state = startOnboarding()

      expect(state.currentStep).toBe('welcome')
      expect(state.completed).toBe(false)
      expect(state.skipped).toBe(false)
      expect(state.startedAt).toBeDefined()
      expect(state.lastActiveAt).toBeDefined()
    })

    it('stores onboarding state in localStorage', () => {
      startOnboarding()

      const stored = getOnboardingState()
      expect(stored).not.toBeNull()
      expect(stored?.currentStep).toBe('welcome')
    })
  })

  describe('updateOnboardingStep', () => {
    it('updates current step', () => {
      startOnboarding()
      updateOnboardingStep('roles')

      const state = getOnboardingState()
      expect(state?.currentStep).toBe('roles')
    })

    it('updates lastActiveAt timestamp', () => {
      const initialState = startOnboarding()
      const initialTimestamp = initialState.lastActiveAt

      setTimeout(() => {
        updateOnboardingStep('features')

        const updatedState = getOnboardingState()
        expect(updatedState?.lastActiveAt).not.toBe(initialTimestamp)
      }, 10)
    })

    it('does nothing if onboarding has not started', () => {
      updateOnboardingStep('roles')
      const state = getOnboardingState()
      expect(state).toBeNull()
    })
  })

  describe('completeOnboarding', () => {
    it('marks onboarding as completed', () => {
      startOnboarding()
      completeOnboarding()

      const state = getOnboardingState()
      expect(state?.completed).toBe(true)
      expect(state?.currentStep).toBe('completed')
      expect(state?.completedAt).toBeDefined()
    })

    it('does nothing if onboarding has not started', () => {
      completeOnboarding()
      const state = getOnboardingState()
      expect(state).toBeNull()
    })
  })

  describe('skipOnboarding', () => {
    it('marks onboarding as skipped', () => {
      startOnboarding()
      skipOnboarding()

      const state = getOnboardingState()
      expect(state?.skipped).toBe(true)
      expect(state?.completedAt).toBeDefined()
    })

    it('preserves current step when skipped', () => {
      startOnboarding()
      updateOnboardingStep('roles')
      skipOnboarding()

      const state = getOnboardingState()
      expect(state?.currentStep).toBe('roles')
      expect(state?.skipped).toBe(true)
    })
  })

  describe('isOnboardingCompleted', () => {
    it('returns false for new users', () => {
      expect(isOnboardingCompleted()).toBe(false)
    })

    it('returns false for users in progress', () => {
      startOnboarding()
      updateOnboardingStep('roles')
      expect(isOnboardingCompleted()).toBe(false)
    })

    it('returns true for completed onboarding', () => {
      startOnboarding()
      completeOnboarding()
      expect(isOnboardingCompleted()).toBe(true)
    })

    it('returns true for skipped onboarding', () => {
      startOnboarding()
      skipOnboarding()
      expect(isOnboardingCompleted()).toBe(true)
    })
  })

  describe('shouldShowOnboarding', () => {
    it('returns true for new users', () => {
      expect(shouldShowOnboarding()).toBe(true)
    })

    it('returns false for completed onboarding', () => {
      startOnboarding()
      completeOnboarding()
      expect(shouldShowOnboarding()).toBe(false)
    })

    it('returns false for skipped onboarding', () => {
      startOnboarding()
      skipOnboarding()
      expect(shouldShowOnboarding()).toBe(false)
    })

    it('returns true for onboarding in progress', () => {
      startOnboarding()
      updateOnboardingStep('roles')
      expect(shouldShowOnboarding()).toBe(true)
    })
  })

  describe('resetOnboarding', () => {
    it('removes onboarding state', () => {
      startOnboarding()
      updateOnboardingStep('features')

      resetOnboarding()

      const state = getOnboardingState()
      expect(state).toBeNull()
    })

    it('allows starting onboarding again after reset', () => {
      startOnboarding()
      completeOnboarding()
      resetOnboarding()

      expect(shouldShowOnboarding()).toBe(true)

      const newState = startOnboarding()
      expect(newState.currentStep).toBe('welcome')
      expect(newState.completed).toBe(false)
    })
  })

  describe('state transitions', () => {
    it('follows correct flow: welcome → roles → features → completed', () => {
      // Start
      const initialState = startOnboarding()
      expect(initialState.currentStep).toBe('welcome')

      // Move to roles
      updateOnboardingStep('roles')
      let state = getOnboardingState()
      expect(state?.currentStep).toBe('roles')

      // Move to features
      updateOnboardingStep('features')
      state = getOnboardingState()
      expect(state?.currentStep).toBe('features')

      // Complete
      completeOnboarding()
      state = getOnboardingState()
      expect(state?.currentStep).toBe('completed')
      expect(state?.completed).toBe(true)
    })

    it('allows skipping at any step', () => {
      startOnboarding()
      updateOnboardingStep('roles')

      skipOnboarding()

      const state = getOnboardingState()
      expect(state?.skipped).toBe(true)
      expect(isOnboardingCompleted()).toBe(true)
      expect(shouldShowOnboarding()).toBe(false)
    })
  })
})
