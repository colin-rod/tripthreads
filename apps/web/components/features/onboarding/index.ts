/**
 * Onboarding Module Exports
 *
 * Centralizes all onboarding-related exports for easy importing.
 */

// Components
export { Onboarding, useOnboarding } from './Onboarding'
// Note: WelcomeScreen removed - unused legacy component
export { RoleExplainer } from './RoleExplainer'
export { FeatureHighlights } from './FeatureHighlights'
export { PlatformOnboardingScreen } from './PlatformOnboardingScreen'
export { WebHero } from './WebHero'
export { MobileSlides } from './MobileSlides'

// Configuration
export { ONBOARDING_CONFIG, ROLES, FEATURES } from '@/lib/onboarding/config'

// Storage utilities
export {
  startOnboarding,
  updateOnboardingStep,
  completeOnboarding,
  skipOnboarding,
  isOnboardingCompleted,
  shouldShowOnboarding,
  resetOnboarding,
  getOnboardingState,
} from '@/lib/onboarding/storage'

// Types
export type {
  OnboardingStep,
  OnboardingState,
  OnboardingConfig,
  RoleInfo,
  FeatureHighlight,
} from '@/lib/onboarding/types'
