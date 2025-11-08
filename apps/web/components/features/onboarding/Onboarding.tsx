'use client'

/**
 * Onboarding Component
 *
 * Main orchestrator for the first-run onboarding experience.
 * Manages navigation between welcome, roles, features, and first trip tour.
 */

import { useEffect, useState, useCallback } from 'react'
import { posthog } from '@/lib/analytics/posthog'
import { PlatformOnboardingScreen } from './PlatformOnboardingScreen'
import { RoleExplainer } from './RoleExplainer'
import { FeatureHighlights } from './FeatureHighlights'
import type { OnboardingStep } from '@/lib/onboarding/types'
import {
  startOnboarding,
  updateOnboardingStep,
  completeOnboarding,
  skipOnboarding,
  getOnboardingState,
  shouldShowOnboarding,
} from '@/lib/onboarding/storage'

interface OnboardingProps {
  onComplete?: () => void
  onSkip?: () => void
  autoStart?: boolean
}

export function Onboarding({ onComplete, onSkip, autoStart = true }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Hydration fix - only run on client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Initialize onboarding
  useEffect(() => {
    if (!isMounted) return

    // Check if onboarding should be shown
    if (!shouldShowOnboarding()) {
      return
    }

    // Check for existing progress
    const state = getOnboardingState()

    if (state && state.currentStep !== 'completed') {
      // Resume from last step
      setCurrentStep(state.currentStep)
    } else if (autoStart) {
      // Start new onboarding
      startOnboarding()
      setCurrentStep('welcome')

      posthog.capture('onboarding_started')
    }
  }, [autoStart, isMounted])

  const handleNavigateToStep = useCallback((step: OnboardingStep) => {
    setCurrentStep(step)
    updateOnboardingStep(step)

    posthog.capture('onboarding_step_viewed', { step })
  }, [])

  const handleComplete = useCallback(() => {
    completeOnboarding()
    setCurrentStep('completed')

    posthog.capture('onboarding_completed')

    onComplete?.()
  }, [onComplete])

  const handleSkip = useCallback(() => {
    skipOnboarding()
    setCurrentStep(null)

    posthog.capture('onboarding_skipped', { step: currentStep })

    onSkip?.()
  }, [currentStep, onSkip])

  // Navigation handlers
  const handleWelcomeContinue = () => handleNavigateToStep('roles')
  const handleRolesContinue = () => handleNavigateToStep('features')
  const handleRolesBack = () => handleNavigateToStep('welcome')
  const handleFeaturesContinue = () => {
    handleComplete()
    // Note: First trip tour will be triggered separately when user visits /trips
  }
  const handleFeaturesBack = () => handleNavigateToStep('roles')

  // Don't render during SSR
  if (!isMounted) return null

  // Don't render if onboarding is not active
  if (!currentStep || currentStep === 'completed') return null

  return (
    <>
      {currentStep === 'welcome' && (
        <PlatformOnboardingScreen
          onContinue={handleWelcomeContinue}
          onSkip={handleSkip}
          variant="A"
        />
      )}

      {currentStep === 'roles' && (
        <RoleExplainer
          onContinue={handleRolesContinue}
          onBack={handleRolesBack}
          onSkip={handleSkip}
        />
      )}

      {currentStep === 'features' && (
        <FeatureHighlights
          onContinue={handleFeaturesContinue}
          onBack={handleFeaturesBack}
          onSkip={handleSkip}
        />
      )}

      {/* Note: first-trip step is handled by the FirstTripTourProvider */}
    </>
  )
}

/**
 * Hook to manually control onboarding
 */
export function useOnboarding() {
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    const state = getOnboardingState()
    setIsCompleted(state?.completed || state?.skipped || false)
  }, [])

  const restart = useCallback(() => {
    startOnboarding()
    setIsCompleted(false)
    // Trigger re-render or navigation
    window.location.reload()
  }, [])

  return { isCompleted, restart }
}
