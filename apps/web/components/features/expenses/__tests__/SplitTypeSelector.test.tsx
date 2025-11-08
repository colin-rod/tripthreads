/**
 * Unit tests for SplitTypeSelector component
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { SplitTypeSelector } from '../SplitTypeSelector'

describe('SplitTypeSelector', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all split type options', () => {
    render(<SplitTypeSelector value="equal" onChange={mockOnChange} />)

    expect(screen.getByText('Equal Split')).toBeInTheDocument()
    expect(screen.getByText('Percentage Split')).toBeInTheDocument()
    expect(screen.getByText('Custom Amounts')).toBeInTheDocument()
  })

  it('displays descriptions for each option', () => {
    render(<SplitTypeSelector value="equal" onChange={mockOnChange} />)

    expect(screen.getByText('Split evenly among participants')).toBeInTheDocument()
    expect(screen.getByText('Split by percentage (e.g., 60/40)')).toBeInTheDocument()
    expect(screen.getByText('Set exact amount per person')).toBeInTheDocument()
  })

  it('shows the currently selected value', () => {
    render(<SplitTypeSelector value="percentage" onChange={mockOnChange} />)

    const percentageRadio = screen.getByRole('radio', { name: /percentage split/i })
    expect(percentageRadio).toBeChecked()
  })

  it('calls onChange when a different option is selected', () => {
    render(<SplitTypeSelector value="equal" onChange={mockOnChange} />)

    const percentageOption = screen.getByRole('radio', { name: /percentage split/i })
    fireEvent.click(percentageOption)

    expect(mockOnChange).toHaveBeenCalledWith('percentage')
  })

  it('has correct test IDs', () => {
    render(<SplitTypeSelector value="equal" onChange={mockOnChange} />)

    expect(screen.getByTestId('split-type-selector')).toBeInTheDocument()
    expect(screen.getByTestId('split-type-equal')).toBeInTheDocument()
    expect(screen.getByTestId('split-type-percentage')).toBeInTheDocument()
    expect(screen.getByTestId('split-type-amount')).toBeInTheDocument()
  })

  it('allows switching between all options', () => {
    const { rerender } = render(<SplitTypeSelector value="equal" onChange={mockOnChange} />)

    const amountOption = screen.getByRole('radio', { name: /custom amounts/i })
    fireEvent.click(amountOption)
    expect(mockOnChange).toHaveBeenCalledWith('amount')

    rerender(<SplitTypeSelector value="amount" onChange={mockOnChange} />)
    expect(amountOption).toBeChecked()
  })
})
