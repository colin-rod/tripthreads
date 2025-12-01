/**
 * Tour Types
 *
 * Type definitions for the interactive tour/walkthrough system.
 */

export type TourStep = {
  id: string
  title: string
  content: string
  target: string // CSS selector for the element to highlight
  placement?: 'top' | 'bottom' | 'left' | 'right'
  action?: 'click' | 'none' // Required action to advance
}

export type TourConfig = {
  id: string
  name: string
  steps: TourStep[]
  canSkip: boolean
  canResume: boolean
  showOnce: boolean
}

export type TourProgress = {
  tourId: string
  currentStep: number
  completed: boolean
  dismissed: boolean
  startedAt: string
  completedAt?: string
  lastActiveAt: string
}

export type TourState = {
  activeTour: string | null
  currentStep: number
  isActive: boolean
}
