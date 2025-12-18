'use client'

/**
 * Lazy-loaded Onboarding Wrapper
 *
 * Dynamically imports the onboarding component to reduce bundle size
 * for returning users who have already completed onboarding.
 */

import dynamic from 'next/dynamic'

// Dynamic import with SSR disabled and no loading state
const Onboarding = dynamic(
  () => import('./Onboarding').then(mod => ({ default: mod.Onboarding })),
  {
    ssr: false,
    loading: () => null,
  }
)

interface LazyOnboardingProps {
  autoStart?: boolean
  onComplete?: () => void
  onSkip?: () => void
}

export function LazyOnboarding(props: LazyOnboardingProps) {
  return <Onboarding {...props} />
}
