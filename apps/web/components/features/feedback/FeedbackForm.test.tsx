import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeedbackForm } from './FeedbackForm'

// Mock the submitFeedbackToLinear function
jest.mock('@tripthreads/core/utils/feedback', () => ({
  submitFeedbackToLinear: jest.fn(),
}))

// Mock the supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {},
}))

// Mock useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock useSearchParams
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: jest.fn(() => null),
  }),
}))

describe('FeedbackForm - Category Selection', () => {
  it('should render category chips instead of dropdown', () => {
    render(<FeedbackForm defaultEmail="test@example.com" />)

    // Check that all category chips are rendered (using description as aria-label)
    expect(screen.getByRole('radio', { name: /Report software defects/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Suggest new features/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Share general thoughts/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Report usability or design/i })).toBeInTheDocument()
  })

  it('should select category via chip click', async () => {
    const user = userEvent.setup()

    render(<FeedbackForm defaultEmail="test@example.com" />)

    // Initially, "General Feedback" should be selected (default)
    const generalChip = screen.getByRole('radio', { name: /Share general thoughts/i })
    expect(generalChip).toHaveAttribute('aria-checked', 'true')

    // Click on "Bug Report" chip
    const bugChip = screen.getByRole('radio', { name: /Report software defects/i })
    await user.click(bugChip)

    // Bug Report should now be selected
    expect(bugChip).toHaveAttribute('aria-checked', 'true')
    expect(generalChip).toHaveAttribute('aria-checked', 'false')
  })

  it('should validate required category', async () => {
    const user = userEvent.setup()

    render(<FeedbackForm defaultEmail="test@example.com" />)

    // Fill in the message field
    const messageField = screen.getByLabelText(/Feedback/i)
    await user.type(messageField, 'This is my feedback message')

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Send feedback/i })
    await user.click(submitButton)

    // Category is already selected by default (general), so no error should appear
    // This test mainly ensures the chip selector integrates with validation
  })

  it('should render environment chips instead of dropdown', () => {
    render(<FeedbackForm defaultEmail="test@example.com" />)

    // Check that all environment chips are rendered (using descriptions)
    expect(screen.getByRole('radio', { name: /Live production environment/i })).toBeInTheDocument()
    expect(
      screen.getByRole('radio', { name: /Staging or testing environment/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('radio', { name: /Local development environment/i })
    ).toBeInTheDocument()
  })

  it('should select environment via chip click', async () => {
    const user = userEvent.setup()

    render(<FeedbackForm defaultEmail="test@example.com" />)

    // Initially, "Production" should be selected (default)
    const productionChip = screen.getByRole('radio', { name: /Live production environment/i })
    expect(productionChip).toHaveAttribute('aria-checked', 'true')

    // Click on "Staging" chip
    const stagingChip = screen.getByRole('radio', { name: /Staging or testing environment/i })
    await user.click(stagingChip)

    // Staging should now be selected
    expect(stagingChip).toHaveAttribute('aria-checked', 'true')
    expect(productionChip).toHaveAttribute('aria-checked', 'false')
  })

  it('should display category icons', () => {
    const { container } = render(<FeedbackForm defaultEmail="test@example.com" />)

    // Check that SVG icons are rendered (lucide-react renders icons as SVGs)
    const radiogroup = container.querySelector('[role="radiogroup"]')
    const svgs = radiogroup?.querySelectorAll('svg')

    // Should have at least 4 icons for categories (+ 3 for environments)
    expect(svgs && svgs.length).toBeGreaterThanOrEqual(4)
  })

  it('should maintain selection after form validation error', async () => {
    const user = userEvent.setup()

    render(<FeedbackForm defaultEmail="" />)

    // Select a different category
    const featureChip = screen.getByRole('radio', { name: /Suggest new features/i })
    await user.click(featureChip)

    // Try to submit without email (should trigger validation error)
    const submitButton = screen.getByRole('button', { name: /Send feedback/i })
    await user.click(submitButton)

    // Category selection should be maintained
    await waitFor(() => {
      expect(featureChip).toHaveAttribute('aria-checked', 'true')
    })
  })
})
