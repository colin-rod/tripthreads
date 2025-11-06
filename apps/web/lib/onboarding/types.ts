/**
 * Onboarding Types
 *
 * Type definitions for the first-run onboarding system.
 */

export type OnboardingStep = 'welcome' | 'roles' | 'features' | 'first-trip' | 'completed'

export interface OnboardingState {
  currentStep: OnboardingStep
  completed: boolean
  skipped: boolean
  startedAt?: string
  completedAt?: string
  lastActiveAt?: string
}

export interface OnboardingConfig {
  id: string
  name: string
  canSkip: boolean
  steps: OnboardingStep[]
}

export interface RoleInfo {
  id: 'owner' | 'participant' | 'viewer'
  title: string
  description: string
  permissions: string[]
  icon: string
  color: string
}

export interface FeatureHighlight {
  id: string
  title: string
  description: string
  icon: string
  badge?: string
}
