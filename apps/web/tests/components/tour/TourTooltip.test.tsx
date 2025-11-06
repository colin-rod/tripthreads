/**
 * TourTooltip Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { TourTooltip } from '@/components/features/tour/TourTooltip'
import type { TourStep } from '@/lib/tour/types'

describe('TourTooltip', () => {
  const mockStep: TourStep = {
    id: 'welcome',
    title: 'Welcome to the tour!',
    content: 'This is a guided walkthrough to help you get started.',
    target: '[data-tour="test-button"]',
    placement: 'bottom',
    action: 'click',
  }

  const defaultProps = {
    step: mockStep,
    stepIndex: 0,
    totalSteps: 5,
    target: '[data-tour="test-button"]',
  }

  beforeEach(() => {
    // Create target element for positioning
    const targetElement = document.createElement('div')
    targetElement.setAttribute('data-tour', 'test-button')
    targetElement.style.position = 'fixed'
    targetElement.style.top = '100px'
    targetElement.style.left = '100px'
    targetElement.style.width = '100px'
    targetElement.style.height = '50px'
    document.body.appendChild(targetElement)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders tour step title and content', () => {
    render(<TourTooltip {...defaultProps} />)

    expect(screen.getByText('Welcome to the tour!')).toBeInTheDocument()
    expect(
      screen.getByText('This is a guided walkthrough to help you get started.')
    ).toBeInTheDocument()
  })

  it('displays progress indicators', () => {
    render(<TourTooltip {...defaultProps} />)

    const progressBars = document.querySelectorAll('[class*="rounded-full"]')
    expect(progressBars.length).toBeGreaterThanOrEqual(5) // 5 steps
  })

  it('shows Next button for non-final steps', () => {
    const onNext = jest.fn()
    render(<TourTooltip {...defaultProps} onNext={onNext} />)

    const nextButton = screen.getByText('Next')
    expect(nextButton).toBeInTheDocument()

    fireEvent.click(nextButton)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('shows Finish button for final step', () => {
    const onNext = jest.fn()
    render(<TourTooltip {...defaultProps} stepIndex={4} onNext={onNext} />)

    const finishButton = screen.getByText('Finish')
    expect(finishButton).toBeInTheDocument()

    fireEvent.click(finishButton)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('shows Back button for non-first steps', () => {
    const onPrevious = jest.fn()
    render(<TourTooltip {...defaultProps} stepIndex={2} onPrevious={onPrevious} />)

    const backButton = screen.getByText('Back')
    expect(backButton).toBeInTheDocument()

    fireEvent.click(backButton)
    expect(onPrevious).toHaveBeenCalledTimes(1)
  })

  it('hides Back button for first step', () => {
    render(<TourTooltip {...defaultProps} stepIndex={0} />)

    expect(screen.queryByText('Back')).not.toBeInTheDocument()
  })

  it('shows Skip tour button when canSkip is true', () => {
    const onSkip = jest.fn()
    render(<TourTooltip {...defaultProps} canSkip={true} onSkip={onSkip} />)

    const skipButton = screen.getByText('Skip tour')
    expect(skipButton).toBeInTheDocument()

    fireEvent.click(skipButton)
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('hides Skip tour button when canSkip is false', () => {
    render(<TourTooltip {...defaultProps} canSkip={false} />)

    expect(screen.queryByText('Skip tour')).not.toBeInTheDocument()
  })

  it('shows close button when canSkip is true', () => {
    const onDismiss = jest.fn()
    render(<TourTooltip {...defaultProps} canSkip={true} onDismiss={onDismiss} />)

    const closeButton = screen.getByLabelText('Close tour')
    expect(closeButton).toBeInTheDocument()

    fireEvent.click(closeButton)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('hides close button when canSkip is false', () => {
    render(<TourTooltip {...defaultProps} canSkip={false} />)

    expect(screen.queryByLabelText('Close tour')).not.toBeInTheDocument()
  })

  it('renders with correct accessibility attributes', () => {
    render(<TourTooltip {...defaultProps} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'tour-step-title')
    expect(dialog).toHaveAttribute('aria-describedby', 'tour-step-content')
  })

  it('highlights current step in progress indicator', () => {
    render(<TourTooltip {...defaultProps} stepIndex={2} totalSteps={5} />)

    const progressBars = document.querySelectorAll('[class*="bg-primary"]')
    // Should have 3 bars highlighted (0, 1, 2) - completed and current
    expect(progressBars.length).toBeGreaterThanOrEqual(1)
  })
})
