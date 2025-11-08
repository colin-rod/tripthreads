import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { Onboarding } from '@/components/features/onboarding/Onboarding'
import { posthog } from '@/lib/analytics/posthog'
import {
  startOnboarding,
  updateOnboardingStep,
  completeOnboarding,
  skipOnboarding,
  getOnboardingState,
  shouldShowOnboarding,
} from '@/lib/onboarding/storage'

jest.mock('@/lib/analytics/posthog', () => ({
  posthog: {
    capture: jest.fn(),
  },
}))

jest.mock('@/lib/onboarding/storage', () => ({
  startOnboarding: jest.fn(),
  updateOnboardingStep: jest.fn(),
  completeOnboarding: jest.fn(),
  skipOnboarding: jest.fn(),
  getOnboardingState: jest.fn(),
  shouldShowOnboarding: jest.fn(),
}))

jest.mock('@/components/features/onboarding/PlatformOnboardingScreen', () => {
  const React = require('react')
  return {
    PlatformOnboardingScreen: ({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) => (
      <div>
        <button data-testid="welcome-continue" onClick={onContinue}>
          Continue
        </button>
        <button data-testid="welcome-skip" onClick={onSkip}>
          Skip
        </button>
      </div>
    ),
  }
})

jest.mock('@/components/features/onboarding/RoleExplainer', () => {
  const React = require('react')
  return {
    RoleExplainer: ({
      onContinue,
      onBack,
      onSkip,
    }: {
      onContinue: () => void
      onBack: () => void
      onSkip: () => void
    }) => (
      <div>
        <button data-testid="roles-continue" onClick={onContinue}>
          Continue roles
        </button>
        <button data-testid="roles-back" onClick={onBack}>
          Back roles
        </button>
        <button data-testid="roles-skip" onClick={onSkip}>
          Skip roles
        </button>
      </div>
    ),
  }
})

jest.mock('@/components/features/onboarding/FeatureHighlights', () => {
  const React = require('react')
  return {
    FeatureHighlights: ({
      onContinue,
      onBack,
      onSkip,
    }: {
      onContinue: () => void
      onBack: () => void
      onSkip: () => void
    }) => (
      <div>
        <button data-testid="features-continue" onClick={onContinue}>
          Continue features
        </button>
        <button data-testid="features-back" onClick={onBack}>
          Back features
        </button>
        <button data-testid="features-skip" onClick={onSkip}>
          Skip features
        </button>
      </div>
    ),
  }
})

describe('Onboarding analytics', () => {
  const posthogCapture = posthog.capture as jest.Mock
  const startOnboardingMock = startOnboarding as jest.Mock
  const updateOnboardingStepMock = updateOnboardingStep as jest.Mock
  const completeOnboardingMock = completeOnboarding as jest.Mock
  const skipOnboardingMock = skipOnboarding as jest.Mock
  const getOnboardingStateMock = getOnboardingState as jest.Mock
  const shouldShowOnboardingMock = shouldShowOnboarding as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    shouldShowOnboardingMock.mockReturnValue(true)
    getOnboardingStateMock.mockReturnValue(null)
  })

  it('captures onboarding start when auto starting', async () => {
    render(<Onboarding autoStart />)

    await waitFor(() => expect(startOnboardingMock).toHaveBeenCalled())
    await waitFor(() => expect(posthogCapture).toHaveBeenCalledWith('onboarding_started'))
  })

  it('captures step navigation when continuing from welcome', async () => {
    render(<Onboarding autoStart />)

    await waitFor(() => expect(screen.getByTestId('welcome-continue')).toBeInTheDocument())
    await waitFor(() => expect(posthogCapture).toHaveBeenCalledWith('onboarding_started'))

    posthogCapture.mockClear()
    updateOnboardingStepMock.mockClear()

    fireEvent.click(screen.getByTestId('welcome-continue'))

    await waitFor(() => expect(updateOnboardingStepMock).toHaveBeenCalledWith('roles'))
    await waitFor(() =>
      expect(posthogCapture).toHaveBeenCalledWith('onboarding_step_viewed', { step: 'roles' }),
    )
  })

  it('captures completion when finishing onboarding', async () => {
    render(<Onboarding autoStart />)

    await waitFor(() => expect(screen.getByTestId('welcome-continue')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('welcome-continue'))

    await waitFor(() => expect(screen.getByTestId('roles-continue')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('roles-continue'))

    await waitFor(() => expect(screen.getByTestId('features-continue')).toBeInTheDocument())
    posthogCapture.mockClear()
    completeOnboardingMock.mockClear()

    fireEvent.click(screen.getByTestId('features-continue'))

    await waitFor(() => expect(completeOnboardingMock).toHaveBeenCalled())
    await waitFor(() => expect(posthogCapture).toHaveBeenCalledWith('onboarding_completed'))
  })

  it('captures skip event with the current step', async () => {
    render(<Onboarding autoStart />)

    await waitFor(() => expect(screen.getByTestId('welcome-skip')).toBeInTheDocument())
    await waitFor(() => expect(posthogCapture).toHaveBeenCalledWith('onboarding_started'))

    posthogCapture.mockClear()
    skipOnboardingMock.mockClear()

    fireEvent.click(screen.getByTestId('welcome-skip'))

    await waitFor(() => expect(skipOnboardingMock).toHaveBeenCalled())
    await waitFor(() =>
      expect(posthogCapture).toHaveBeenCalledWith('onboarding_skipped', { step: 'welcome' }),
    )
  })
})
