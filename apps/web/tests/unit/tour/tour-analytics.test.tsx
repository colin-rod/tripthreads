import '@testing-library/jest-dom'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { Tour } from '@/components/features/tour/Tour'
import { posthog } from '@/lib/analytics/posthog'
import {
  startTour,
  updateTourStep,
  completeTour,
  dismissTour,
  getTourProgress,
  shouldShowTour,
} from '@/lib/tour/storage'
import type { TourConfig } from '@/lib/tour/types'

jest.mock('@/lib/analytics/posthog', () => ({
  posthog: {
    capture: jest.fn(),
  },
}))

jest.mock('@/lib/tour/storage', () => ({
  startTour: jest.fn(),
  updateTourStep: jest.fn(),
  completeTour: jest.fn(),
  dismissTour: jest.fn(),
  getTourProgress: jest.fn(),
  shouldShowTour: jest.fn(),
}))

jest.mock('@/components/features/tour/TourSpotlight', () => {
  return {
    TourSpotlight: () => <div data-testid="tour-spotlight" />,
  }
})

jest.mock('@/components/features/tour/TourTooltip', () => {
  return {
    TourTooltip: ({
      onNext,
      onPrevious,
      onSkip,
      onDismiss,
    }: {
      onNext: () => void
      onPrevious?: () => void
      onSkip?: () => void
      onDismiss?: () => void
    }) => (
      <div data-testid="tour-tooltip">
        <button data-testid="tour-next" onClick={onNext}>
          Next
        </button>
        {onPrevious ? (
          <button data-testid="tour-prev" onClick={onPrevious}>
            Previous
          </button>
        ) : null}
        {onSkip ? (
          <button data-testid="tour-skip" onClick={onSkip}>
            Skip
          </button>
        ) : null}
        {onDismiss ? (
          <button data-testid="tour-dismiss" onClick={onDismiss}>
            Dismiss
          </button>
        ) : null}
      </div>
    ),
  }
})

describe('Tour analytics', () => {
  const posthogCapture = posthog.capture as jest.Mock
  const startTourMock = startTour as jest.Mock
  const updateTourStepMock = updateTourStep as jest.Mock
  const completeTourMock = completeTour as jest.Mock
  const dismissTourMock = dismissTour as jest.Mock
  const getTourProgressMock = getTourProgress as jest.Mock
  const shouldShowTourMock = shouldShowTour as jest.Mock

  const config: TourConfig = {
    id: 'test-tour',
    name: 'Test Tour',
    canSkip: true,
    canResume: true,
    showOnce: false,
    steps: [
      {
        id: 'step-one',
        title: 'Step 1',
        content: 'Content 1',
        target: '#step-one',
      },
      {
        id: 'step-two',
        title: 'Step 2',
        content: 'Content 2',
        target: '#step-two',
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    document.body.innerHTML = '<div id="step-one"></div><div id="step-two"></div>'
    shouldShowTourMock.mockReturnValue(true)
    getTourProgressMock.mockReturnValue(null)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('captures tour start when auto starting', async () => {
    render(<Tour config={config} />)

    await waitFor(() => expect(startTourMock).toHaveBeenCalledWith(config.id))
    await waitFor(() =>
      expect(posthogCapture).toHaveBeenCalledWith('tour_started', { tour_id: config.id })
    )
  })

  it('captures step advancement when moving forward', async () => {
    render(<Tour config={config} />)

    await waitFor(() => expect(screen.getByTestId('tour-next')).toBeInTheDocument())
    await waitFor(() =>
      expect(posthogCapture).toHaveBeenCalledWith('tour_started', { tour_id: config.id })
    )

    posthogCapture.mockClear()
    updateTourStepMock.mockClear()

    fireEvent.click(screen.getByTestId('tour-next'))

    await waitFor(() => expect(updateTourStepMock).toHaveBeenCalledWith(config.id, 1))
    await waitFor(() =>
      expect(posthogCapture).toHaveBeenCalledWith('tour_step_advanced', {
        tour_id: config.id,
        step: 1,
        step_id: 'step-two',
      })
    )
  })

  it('captures completion when finishing the last step', async () => {
    render(<Tour config={config} />)

    await waitFor(() => expect(screen.getByTestId('tour-next')).toBeInTheDocument())
    await waitFor(() =>
      expect(posthogCapture).toHaveBeenCalledWith('tour_started', { tour_id: config.id })
    )

    fireEvent.click(screen.getByTestId('tour-next'))
    await waitFor(() => expect(updateTourStepMock).toHaveBeenCalledWith(config.id, 1))

    posthogCapture.mockClear()
    completeTourMock.mockClear()

    fireEvent.click(screen.getByTestId('tour-next'))

    await waitFor(() => expect(completeTourMock).toHaveBeenCalledWith(config.id))
    await waitFor(() =>
      expect(posthogCapture).toHaveBeenCalledWith('tour_completed', { tour_id: config.id })
    )
  })

  it('captures skip event with current step index', async () => {
    render(<Tour config={config} />)

    await waitFor(() => expect(screen.getByTestId('tour-skip')).toBeInTheDocument())
    await waitFor(() =>
      expect(posthogCapture).toHaveBeenCalledWith('tour_started', { tour_id: config.id })
    )

    posthogCapture.mockClear()
    dismissTourMock.mockClear()

    fireEvent.click(screen.getByTestId('tour-skip'))

    await waitFor(() => expect(dismissTourMock).toHaveBeenCalledWith(config.id))
    await waitFor(() =>
      expect(posthogCapture).toHaveBeenCalledWith('tour_skipped', { tour_id: config.id, step: 0 })
    )
  })

  it('captures dismiss event with current step index', async () => {
    render(<Tour config={config} />)

    await waitFor(() => expect(screen.getByTestId('tour-dismiss')).toBeInTheDocument())
    await waitFor(() =>
      expect(posthogCapture).toHaveBeenCalledWith('tour_started', { tour_id: config.id })
    )

    posthogCapture.mockClear()
    updateTourStepMock.mockClear()

    fireEvent.click(screen.getByTestId('tour-dismiss'))

    await waitFor(() => expect(updateTourStepMock).toHaveBeenCalledWith(config.id, 0))
    await waitFor(() =>
      expect(posthogCapture).toHaveBeenCalledWith('tour_dismissed', { tour_id: config.id, step: 0 })
    )
  })
})
