import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Bug, Lightbulb } from 'lucide-react'
import { ChipSelector, type ChipOption } from './chip-selector'

describe('ChipSelector', () => {
  const mockOptions: ChipOption<string>[] = [
    {
      value: 'option-1',
      label: 'Option 1',
      icon: Bug,
      description: 'First option description',
    },
    {
      value: 'option-2',
      label: 'Option 2',
      icon: Lightbulb,
      description: 'Second option description',
    },
  ]

  const mockOnValueChange = jest.fn()

  beforeEach(() => {
    mockOnValueChange.mockClear()
  })

  it('should render all options', () => {
    render(
      <ChipSelector
        options={mockOptions}
        value="option-1"
        onValueChange={mockOnValueChange}
        aria-label="Test selector"
      />
    )

    expect(screen.getByRole('radio', { name: /First option description/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Second option description/i })).toBeInTheDocument()
  })

  it('should highlight the selected option with default variant', () => {
    render(
      <ChipSelector
        options={mockOptions}
        value="option-1"
        onValueChange={mockOnValueChange}
        aria-label="Test selector"
      />
    )

    const selectedButton = screen.getByRole('radio', { name: /First option description/i })
    const unselectedButton = screen.getByRole('radio', { name: /Second option description/i })

    // Selected button should have the 'default' variant styling (bg-primary)
    expect(selectedButton).toHaveClass('bg-primary')

    // Unselected button should have 'ghost' variant styling
    expect(unselectedButton).not.toHaveClass('bg-primary')
  })

  it('should call onValueChange when a chip is clicked', async () => {
    const user = userEvent.setup()

    render(
      <ChipSelector
        options={mockOptions}
        value="option-1"
        onValueChange={mockOnValueChange}
        aria-label="Test selector"
      />
    )

    const secondOption = screen.getByRole('radio', { name: /Second option description/i })
    await user.click(secondOption)

    expect(mockOnValueChange).toHaveBeenCalledTimes(1)
    expect(mockOnValueChange).toHaveBeenCalledWith('option-2')
  })

  it('should render icons for each option', () => {
    const { container } = render(
      <ChipSelector
        options={mockOptions}
        value="option-1"
        onValueChange={mockOnValueChange}
        aria-label="Test selector"
      />
    )

    // lucide-react icons are rendered as SVG elements
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBe(2)
  })

  it('should be keyboard accessible with Tab and Enter', async () => {
    const user = userEvent.setup()

    render(
      <ChipSelector
        options={mockOptions}
        value="option-1"
        onValueChange={mockOnValueChange}
        aria-label="Test selector"
      />
    )

    // Tab to first button
    await user.tab()
    expect(screen.getByRole('radio', { name: /First option description/i })).toHaveFocus()

    // Tab to second button
    await user.tab()
    expect(screen.getByRole('radio', { name: /Second option description/i })).toHaveFocus()

    // Press Enter to select
    await user.keyboard('{Enter}')
    expect(mockOnValueChange).toHaveBeenCalledWith('option-2')
  })

  it('should be keyboard accessible with Space', async () => {
    const user = userEvent.setup()

    render(
      <ChipSelector
        options={mockOptions}
        value="option-1"
        onValueChange={mockOnValueChange}
        aria-label="Test selector"
      />
    )

    // Tab to second button and press Space
    await user.tab()
    await user.tab()
    await user.keyboard(' ')

    expect(mockOnValueChange).toHaveBeenCalledWith('option-2')
  })

  it('should have proper ARIA attributes', () => {
    render(
      <ChipSelector
        options={mockOptions}
        value="option-1"
        onValueChange={mockOnValueChange}
        aria-label="Test selector"
      />
    )

    const container = screen.getByRole('radiogroup', { name: 'Test selector' })
    expect(container).toBeInTheDocument()

    const selectedButton = screen.getByRole('radio', { name: /First option description/i })
    const unselectedButton = screen.getByRole('radio', { name: /Second option description/i })

    expect(selectedButton).toHaveAttribute('role', 'radio')
    expect(selectedButton).toHaveAttribute('aria-checked', 'true')

    expect(unselectedButton).toHaveAttribute('role', 'radio')
    expect(unselectedButton).toHaveAttribute('aria-checked', 'false')
  })

  it('should apply custom className to container', () => {
    const { container } = render(
      <ChipSelector
        options={mockOptions}
        value="option-1"
        onValueChange={mockOnValueChange}
        aria-label="Test selector"
        className="custom-class"
      />
    )

    const radiogroup = container.querySelector('[role="radiogroup"]')
    expect(radiogroup).toHaveClass('custom-class')
  })

  it('should use label as aria-label when description is not provided', () => {
    const optionsWithoutDescription: ChipOption<string>[] = [
      {
        value: 'option-1',
        label: 'Option 1',
        icon: Bug,
      },
    ]

    render(
      <ChipSelector
        options={optionsWithoutDescription}
        value="option-1"
        onValueChange={mockOnValueChange}
        aria-label="Test selector"
      />
    )

    expect(screen.getByRole('radio', { name: 'Option 1' })).toBeInTheDocument()
  })

  it('should disable all chips when disabled prop is true', async () => {
    const user = userEvent.setup()

    render(
      <ChipSelector
        options={mockOptions}
        value="option-1"
        onValueChange={mockOnValueChange}
        aria-label="Test selector"
        disabled={true}
      />
    )

    const firstButton = screen.getByRole('radio', { name: /First option description/i })
    const secondButton = screen.getByRole('radio', { name: /Second option description/i })

    // Both buttons should be disabled
    expect(firstButton).toBeDisabled()
    expect(secondButton).toBeDisabled()

    // Clicking should not trigger onChange
    await user.click(secondButton)
    expect(mockOnValueChange).not.toHaveBeenCalled()
  })
})
