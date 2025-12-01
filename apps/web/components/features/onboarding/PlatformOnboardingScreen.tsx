'use client'

/**
 * PlatformOnboardingScreen Component
 *
 * Platform-aware onboarding that shows:
 * - WebHero for desktop/web
 * - MobileSlides for mobile devices
 *
 * Replaces the generic WelcomeScreen with optimized experiences.
 */

import { useEffect, useState } from 'react'
import { posthog } from '@/lib/analytics/posthog'
import { WebHero } from './WebHero'
import { MobileSlides } from './MobileSlides'
import { isMobile } from '@/lib/utils/platform'

interface PlatformOnboardingScreenProps {
  onContinue: () => void
  onSkip: () => void
  variant?: 'A' | 'B' // For A/B testing
}

export function PlatformOnboardingScreen({
  onContinue,
  onSkip,
  variant = 'A',
}: PlatformOnboardingScreenProps) {
  const [platform, setPlatform] = useState<'mobile' | 'web'>('web')
  const [isMounted, setIsMounted] = useState(false)

  // Detect platform on client side only
  useEffect(() => {
    setIsMounted(true)
    const detectedPlatform = isMobile() ? 'mobile' : 'web'
    setPlatform(detectedPlatform)

    posthog.capture('onboarding_platform_detected', {
      platform: detectedPlatform,
      variant,
    })
  }, [variant])

  // Don't render during SSR
  if (!isMounted) {
    // Return loading skeleton to prevent layout shift
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <div className="h-16 w-16 bg-primary/20 rounded-full" />
        </div>
      </div>
    )
  }

  // Render platform-specific component
  if (platform === 'mobile') {
    return <MobileSlides onComplete={onContinue} onSkip={onSkip} />
  }

  return <WebHero onGetStarted={onContinue} onSkip={onSkip} />
}
