/**
 * Tour Configurations
 *
 * Defines all available tours in the application.
 */

import { TourConfig } from './types'

/**
 * First Trip Creation Tour
 *
 * Guides new users through creating their first trip.
 * Triggered after profile completion for users with no trips.
 */
export const FIRST_TRIP_TOUR: TourConfig = {
  id: 'first-trip-creation',
  name: 'Create Your First Trip',
  canSkip: true,
  canResume: true,
  showOnce: true,
  steps: [
    {
      id: 'welcome',
      title: "Let's create your first trip!",
      content:
        "Welcome to TripThreads! We'll guide you through creating your first trip in just a few steps. You can skip or pause this tour at any time.",
      target: '[data-tour="create-trip-button"]',
      placement: 'bottom',
      action: 'click',
    },
    {
      id: 'trip-name',
      title: 'Give it a memorable name',
      content:
        'Choose a name that captures the essence of your adventure. Something like "Paris Summer 2025" or "Iceland Road Trip" works great!',
      target: '[data-tour="trip-name-input"]',
      placement: 'top',
      action: 'none',
    },
    {
      id: 'start-date',
      title: 'When does your adventure begin?',
      content:
        'Set your trip start date. This helps organize your itinerary and lets your travel buddies know when to pack their bags!',
      target: '[data-tour="start-date-picker"]',
      placement: 'right',
      action: 'none',
    },
    {
      id: 'end-date',
      title: 'When does it end?',
      content:
        'Choose your return date. TripThreads will help you plan activities and track expenses throughout your entire journey.',
      target: '[data-tour="end-date-picker"]',
      placement: 'right',
      action: 'none',
    },
    {
      id: 'create-button',
      title: 'Hit create when ready',
      content:
        "You can add more details later. For now, let's get your trip created so you can start planning!",
      target: '[data-tour="create-trip-submit"]',
      placement: 'top',
      action: 'click',
    },
    {
      id: 'invite-friends',
      title: 'Now invite your travel buddies!',
      content:
        'Great job! Your trip is created. Now you can invite friends to collaborate on the itinerary, split expenses, and share memories together.',
      target: '[data-tour="invite-button"]',
      placement: 'bottom',
      action: 'none',
    },
  ],
}

/**
 * All available tours
 */
export const TOURS: Record<string, TourConfig> = {
  'first-trip-creation': FIRST_TRIP_TOUR,
}

/**
 * Get tour configuration by ID
 */
export function getTourConfig(tourId: string): TourConfig | undefined {
  return TOURS[tourId]
}
