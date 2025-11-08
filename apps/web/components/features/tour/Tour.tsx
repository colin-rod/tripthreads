'use client'

/**
 * Tour Component
 *
 * Main tour orchestrator that manages tour state and renders the spotlight and tooltip.
 * Features:
 * - Progress tracking in localStorage
 * - Skip/dismiss functionality
 * - Resume capability
 * - Analytics tracking
 */

import { useEffect, useState, useCallback } from 'react'
import { posthog } from '@/lib/analytics/posthog'
import { TourSpotlight } from './TourSpotlight'
import { TourTooltip } from './TourTooltip'
import type { TourConfig } from '@/lib/tour/types'
import {
  startTour,
  updateTourStep,
  completeTour,
  dismissTour,
  getTourProgress,
  shouldShowTour,
} from '@/lib/tour/storage'

interface TourProps {
  config: TourConfig
  onComplete?: () => void
  onDismiss?: () => void
  autoStart?: boolean
}

export function Tour({ config, onComplete, onDismiss, autoStart = true }: TourProps) {
  const [isActive, setIsActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isMounted, setIsMounted] = useState(false)

  // Hydration fix - only run on client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Initialize tour
  useEffect(() => {
    if (!isMounted) return

    // Check if tour should be shown
    if (!shouldShowTour(config.id, config.showOnce)) {
      return
    }

    // Check for existing progress
    const progress = getTourProgress(config.id)

    if (progress && !progress.completed && !progress.dismissed) {
      // Resume from last step
      setCurrentStepIndex(progress.currentStep)
      if (autoStart) {
        setIsActive(true)
      }
    } else if (autoStart) {
      // Start new tour
      startTour(config.id)
      setCurrentStepIndex(0)
      setIsActive(true)
    }
  }, [config.id, config.showOnce, autoStart, isMounted])

  // Track analytics when tour starts
  useEffect(() => {
    if (isActive && isMounted && currentStepIndex === 0) {
      posthog.capture('tour_started', { tour_id: config.id })
    }
  }, [isActive, currentStepIndex, config.id, isMounted])

  const currentStep = config.steps[currentStepIndex]

  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1

    if (nextIndex >= config.steps.length) {
      // Tour completed
      completeTour(config.id)
      setIsActive(false)

      posthog.capture('tour_completed', { tour_id: config.id })

      onComplete?.()
    } else {
      // Move to next step
      setCurrentStepIndex(nextIndex)
      updateTourStep(config.id, nextIndex)

      posthog.capture('tour_step_advanced', {
        tour_id: config.id,
        step: nextIndex,
        step_id: config.steps[nextIndex].id,
      })
    }
  }, [currentStepIndex, config, onComplete])

  const handlePrevious = useCallback(() => {
    const prevIndex = Math.max(0, currentStepIndex - 1)
    setCurrentStepIndex(prevIndex)
    updateTourStep(config.id, prevIndex)
  }, [currentStepIndex, config.id])

  const handleSkip = useCallback(() => {
    dismissTour(config.id)
    setIsActive(false)

    posthog.capture('tour_skipped', {
      tour_id: config.id,
      step: currentStepIndex,
    })

    onDismiss?.()
  }, [config.id, currentStepIndex, onDismiss])

  const handleDismiss = useCallback(() => {
    // Dismiss allows resuming (unlike skip)
    updateTourStep(config.id, currentStepIndex)
    setIsActive(false)

    // Track dismiss
    console.log('[Tour Analytics] tour_dismissed:', {
      tour_id: config.id,
      step: currentStepIndex,
    })

    onDismiss?.()
  }, [config.id, currentStepIndex, onDismiss])

  // Wait until element exists before showing tour
  const [targetExists, setTargetExists] = useState(false)

  useEffect(() => {
    if (!isActive || !currentStep) return

    const checkTarget = () => {
      const element = document.querySelector(currentStep.target)
      setTargetExists(!!element)
    }

    // Check immediately
    checkTarget()

    // Retry periodically for dynamic content
    const interval = setInterval(checkTarget, 100)
    const timeout = setTimeout(() => clearInterval(interval), 5000) // Give up after 5s

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [isActive, currentStep])

  // Don't render during SSR
  if (!isMounted) return null

  // Don't render if tour is not active or target doesn't exist
  if (!isActive || !currentStep || !targetExists) return null

  return (
    <>
      {/* Spotlight overlay */}
      <TourSpotlight target={currentStep.target} />

      {/* Tooltip with content */}
      <TourTooltip
        step={currentStep}
        stepIndex={currentStepIndex}
        totalSteps={config.steps.length}
        target={currentStep.target}
        onNext={handleNext}
        onPrevious={currentStepIndex > 0 ? handlePrevious : undefined}
        onSkip={config.canSkip ? handleSkip : undefined}
        onDismiss={config.canSkip ? handleDismiss : undefined}
        canSkip={config.canSkip}
      />
    </>
  )
}

/**
 * Hook to manually control a tour
 */
export function useTour(tourId: string) {
  const [isActive, setIsActive] = useState(false)

  const start = useCallback(() => {
    startTour(tourId)
    setIsActive(true)
  }, [tourId])

  const stop = useCallback(() => {
    setIsActive(false)
  }, [])

  const reset = useCallback(() => {
    dismissTour(tourId)
    setIsActive(false)
  }, [tourId])

  return { isActive, start, stop, reset }
}
