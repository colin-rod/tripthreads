/**
 * Onboarding Storage
 *
 * Manages onboarding progress persistence in localStorage.
 */

import type { OnboardingState, OnboardingStep } from './types'

const STORAGE_KEY = 'tripthreads_onboarding_state'

/**
 * Get onboarding state from localStorage
 */
export function getOnboardingState(): OnboardingState | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.error('Failed to load onboarding state:', error)
    return null
  }
}

/**
 * Save onboarding state
 */
export function saveOnboardingState(state: OnboardingState): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save onboarding state:', error)
  }
}

/**
 * Start onboarding
 */
export function startOnboarding(): OnboardingState {
  const state: OnboardingState = {
    currentStep: 'welcome',
    completed: false,
    skipped: false,
    startedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  }

  saveOnboardingState(state)
  return state
}

/**
 * Update current step
 */
export function updateOnboardingStep(step: OnboardingStep): void {
  const state = getOnboardingState()
  if (!state) return

  const updatedState: OnboardingState = {
    ...state,
    currentStep: step,
    lastActiveAt: new Date().toISOString(),
  }

  saveOnboardingState(updatedState)
}

/**
 * Complete onboarding
 */
export function completeOnboarding(): void {
  const state = getOnboardingState()
  if (!state) return

  const updatedState: OnboardingState = {
    ...state,
    currentStep: 'completed',
    completed: true,
    completedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  }

  saveOnboardingState(updatedState)
}

/**
 * Skip onboarding
 */
export function skipOnboarding(): void {
  const state = getOnboardingState()
  if (!state) return

  const updatedState: OnboardingState = {
    ...state,
    skipped: true,
    completedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  }

  saveOnboardingState(updatedState)
}

/**
 * Check if onboarding is completed
 */
export function isOnboardingCompleted(): boolean {
  const state = getOnboardingState()
  return state?.completed || state?.skipped || false
}

/**
 * Check if onboarding should be shown
 */
export function shouldShowOnboarding(): boolean {
  const state = getOnboardingState()

  // Never started
  if (!state) return true

  // Already completed or skipped
  if (state.completed || state.skipped) return false

  // In progress
  return true
}

/**
 * Reset onboarding (for testing or user-initiated reset)
 */
export function resetOnboarding(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to reset onboarding:', error)
  }
}
