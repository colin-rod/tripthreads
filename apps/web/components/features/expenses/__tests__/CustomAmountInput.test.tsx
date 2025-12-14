/**
 * Unit tests for CustomAmountInput component
 */

import { render, screen, fireEvent, within } from '@testing-library/react'
import { CustomAmountInput } from '../CustomAmountInput'

describe('CustomAmountInput', () => {
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
      <CustomAmountInput
        participants={mockParticipants}
        totalAmount={100}
        currency="EUR"
        values={{}}
        onChange={mockOnChange}
        isValid={false}
      />
    )

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.getAllByRole('spinbutton')).toHaveLength(2)
  })

  it('displays current amount values', () => {
    render(
      <CustomAmountInput
        participants={mockParticipants}
        totalAmount={100}
        currency="EUR"
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

  it('calls onChange when amount is updated', () => {
    render(
      <CustomAmountInput
        participants={mockParticipants}
        totalAmount={100}
        currency="EUR"
        values={{ '1': 50, '2': 50 }}
        onChange={mockOnChange}
        isValid={true}
      />
    )

    const aliceInput = within(screen.getByTestId('amount-input-1')).getByRole('spinbutton')
    fireEvent.change(aliceInput, { target: { value: '60' } })

    expect(mockOnChange).toHaveBeenCalledWith({
      '1': 60,
      '2': 50,
    })
  })

  it('shows total assigned correctly', () => {
    render(
      <CustomAmountInput
        participants={mockParticipants}
        totalAmount={100}
        currency="EUR"
        values={{ '1': 60, '2': 40 }}
        onChange={mockOnChange}
        isValid={true}
      />
    )

    expect(screen.getByText(/EUR 100.00 \/ EUR 100.00/)).toBeInTheDocument()
  })

  it('calculates remaining amount correctly', () => {
    render(
      <CustomAmountInput
        participants={mockParticipants}
        totalAmount={100}
        currency="EUR"
        values={{ '1': 60, '2': 30 }}
        onChange={mockOnChange}
        isValid={false}
      />
    )

    expect(screen.getByText('EUR 10.00')).toBeInTheDocument() // Remaining
  })

  it('displays validation error when total does not match', () => {
    render(
      <CustomAmountInput
        participants={mockParticipants}
        totalAmount={100}
        currency="EUR"
        values={{ '1': 60, '2': 30 }}
        onChange={mockOnChange}
        isValid={false}
      />
    )

    expect(screen.getByText(/custom amounts must add up to EUR 100.00/i)).toBeInTheDocument()
  })

  it('shows success indicator when total matches', () => {
    render(
      <CustomAmountInput
        participants={mockParticipants}
        totalAmount={100}
        currency="EUR"
        values={{ '1': 60, '2': 40 }}
        onChange={mockOnChange}
        isValid={true}
      />
    )

    const checkIcon = screen
      .getByText(/EUR 100.00 \/ EUR 100.00/)
      .parentElement?.querySelector('svg')
    expect(checkIcon).toBeInTheDocument()
  })

  it('has correct test IDs for inputs', () => {
    render(
      <CustomAmountInput
        participants={mockParticipants}
        totalAmount={100}
        currency="EUR"
        values={{}}
        onChange={mockOnChange}
        isValid={false}
      />
    )

    expect(screen.getByTestId('amount-input-1')).toBeInTheDocument()
    expect(screen.getByTestId('amount-input-2')).toBeInTheDocument()
  })

  it('handles empty amount values', () => {
    render(
      <CustomAmountInput
        participants={mockParticipants}
        totalAmount={100}
        currency="EUR"
        values={{}}
        onChange={mockOnChange}
        isValid={false}
      />
    )

    expect(screen.getByText('EUR 0.00 / EUR 100.00')).toBeInTheDocument()
  })

  it('displays currency symbol for each input', () => {
    render(
      <CustomAmountInput
        participants={mockParticipants}
        totalAmount={100}
        currency="USD"
        values={{}}
        onChange={mockOnChange}
        isValid={false}
      />
    )

    const currencyLabels = screen.getAllByText('USD')
    expect(currencyLabels.length).toBeGreaterThan(0)
  })

  it('accepts decimal amounts', () => {
    render(
      <CustomAmountInput
        participants={mockParticipants}
        totalAmount={100}
        currency="EUR"
        values={{ '1': 33.33, '2': 66.67 }}
        onChange={mockOnChange}
        isValid={true}
      />
    )

    expect(screen.getByDisplayValue('33.33')).toBeInTheDocument()
    expect(screen.getByDisplayValue('66.67')).toBeInTheDocument()
  })
})
