/**
 * Unit tests for PercentageSplitInput component
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { PercentageSplitInput } from '../PercentageSplitInput'

describe('PercentageSplitInput', () => {
  const mockParticipants = [
    { id: '1', name: 'Alice Johnson', avatar_url: 'https://example.com/alice.jpg' },
    { id: '2', name: 'Bob Smith' },
  ]

  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders input fields for each participant', () => {
    render(
      <PercentageSplitInput
        participants={mockParticipants}
        values={{}}
        onChange={mockOnChange}
        isValid={false}
      />
    )

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.getAllByRole('spinbutton')).toHaveLength(2)
  })

  it('displays current percentage values', () => {
    render(
      <PercentageSplitInput
        participants={mockParticipants}
        values={{ '1': 60, '2': 40 }}
        onChange={mockOnChange}
        isValid={true}
      />
    )

    const aliceInput = screen.getByDisplayValue('60')
    const bobInput = screen.getByDisplayValue('40')

    expect(aliceInput).toBeInTheDocument()
    expect(bobInput).toBeInTheDocument()
  })

  it('calls onChange when percentage is updated', () => {
    render(
      <PercentageSplitInput
        participants={mockParticipants}
        values={{ '1': 50, '2': 50 }}
        onChange={mockOnChange}
        isValid={true}
      />
    )

    const aliceInput = screen.getByDisplayValue('50')
    fireEvent.change(aliceInput, { target: { value: '60' } })

    expect(mockOnChange).toHaveBeenCalledWith({
      '1': 60,
      '2': 50,
    })
  })

  it('shows total percentage correctly', () => {
    render(
      <PercentageSplitInput
        participants={mockParticipants}
        values={{ '1': 60, '2': 40 }}
        onChange={mockOnChange}
        isValid={true}
      />
    )

    expect(screen.getByText('100.0%')).toBeInTheDocument()
  })

  it('displays validation error when total is not 100%', () => {
    render(
      <PercentageSplitInput
        participants={mockParticipants}
        values={{ '1': 60, '2': 30 }}
        onChange={mockOnChange}
        isValid={false}
      />
    )

    expect(screen.getByText(/percentages must add up to 100%/i)).toBeInTheDocument()
    expect(screen.getByText('90.0%')).toBeInTheDocument()
  })

  it('shows success indicator when total is 100%', () => {
    render(
      <PercentageSplitInput
        participants={mockParticipants}
        values={{ '1': 60, '2': 40 }}
        onChange={mockOnChange}
        isValid={true}
      />
    )

    const checkIcon = screen.getByText('100.0%').parentElement?.querySelector('svg')
    expect(checkIcon).toBeInTheDocument()
  })

  it('shows error indicator when total is not 100%', () => {
    render(
      <PercentageSplitInput
        participants={mockParticipants}
        values={{ '1': 50, '2': 30 }}
        onChange={mockOnChange}
        isValid={false}
      />
    )

    const xIcon = screen.getByText('80.0%').parentElement?.querySelector('svg')
    expect(xIcon).toBeInTheDocument()
  })

  it('has correct test IDs for inputs', () => {
    render(
      <PercentageSplitInput
        participants={mockParticipants}
        values={{}}
        onChange={mockOnChange}
        isValid={false}
      />
    )

    expect(screen.getByTestId('percentage-input-1')).toBeInTheDocument()
    expect(screen.getByTestId('percentage-input-2')).toBeInTheDocument()
  })

  it('handles empty percentage values', () => {
    render(
      <PercentageSplitInput
        participants={mockParticipants}
        values={{}}
        onChange={mockOnChange}
        isValid={false}
      />
    )

    expect(screen.getByText('0.0%')).toBeInTheDocument()
  })

  it('accepts decimal percentages', () => {
    render(
      <PercentageSplitInput
        participants={mockParticipants}
        values={{ '1': 33.33, '2': 66.67 }}
        onChange={mockOnChange}
        isValid={true}
      />
    )

    expect(screen.getByDisplayValue('33.33')).toBeInTheDocument()
    expect(screen.getByDisplayValue('66.67')).toBeInTheDocument()
  })
})
