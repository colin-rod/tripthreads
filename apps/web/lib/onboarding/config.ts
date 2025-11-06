/**
 * Onboarding Configuration
 *
 * Defines the first-run onboarding flow for new users.
 */

import type { OnboardingConfig, RoleInfo, FeatureHighlight } from './types'

/**
 * Main onboarding configuration
 */
export const ONBOARDING_CONFIG: OnboardingConfig = {
  id: 'first-run-onboarding',
  name: 'First Run Onboarding',
  canSkip: true,
  steps: ['welcome', 'roles', 'features', 'first-trip', 'completed'],
}

/**
 * Role information for role explainer
 */
export const ROLES: RoleInfo[] = [
  {
    id: 'owner',
    title: 'Trip Owner',
    description:
      'Full control over the trip. Can invite people, edit settings, and manage everything.',
    permissions: [
      'Create and edit trip details',
      'Invite and remove participants',
      'Manage expenses and settlements',
      'Delete the trip',
      'Change trip settings',
    ],
    icon: 'Crown',
    color: 'text-primary',
  },
  {
    id: 'participant',
    title: 'Participant',
    description:
      'Active trip member. Can add activities, track expenses, and share photos with the group.',
    permissions: [
      'View trip details',
      'Add itinerary items',
      'Add and view expenses',
      'Upload photos and videos',
      'View settlements',
    ],
    icon: 'Users',
    color: 'text-secondary',
  },
  {
    id: 'viewer',
    title: 'Viewer',
    description:
      'Read-only access. Perfect for keeping someone in the loop without full participation.',
    permissions: [
      'View trip details',
      'View itinerary',
      'View photos and feed',
      'Cannot add expenses',
      'Cannot see expense details',
    ],
    icon: 'Eye',
    color: 'text-muted-foreground',
  },
]

/**
 * Feature highlights for onboarding carousel
 */
export const FEATURES: FeatureHighlight[] = [
  {
    id: 'natural-language',
    title: 'Natural Language Input',
    description:
      'Just type "Split 60€ dinner 4 ways" or "Flight to Paris Mon 9am €200" - we\'ll handle the rest.',
    icon: 'MessageSquare',
    badge: '✨ Smart',
  },
  {
    id: 'offline-first',
    title: 'Works Offline',
    description:
      "Plan trips and track expenses without internet. Everything syncs automatically when you're back online.",
    icon: 'WifiOff',
    badge: '📶 Reliable',
  },
  {
    id: 'multi-currency',
    title: 'Multi-Currency Support',
    description:
      'Track expenses in any currency. We handle conversions with real-time exchange rates automatically.',
    icon: 'DollarSign',
    badge: '🌍 Global',
  },
  {
    id: 'smart-settlements',
    title: 'Smart Settlements',
    description:
      'Optimize who owes whom. We calculate the minimum number of transactions to settle everything.',
    icon: 'ArrowLeftRight',
    badge: '🧮 Optimized',
  },
  {
    id: 'shared-memories',
    title: 'Shared Trip Feed',
    description:
      'Upload photos and videos that everyone can see. Automatically organized by day for easy browsing.',
    icon: 'Image',
    badge: '📸 Memories',
  },
]
