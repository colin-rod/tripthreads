/**
 * Unit tests for ParticipantPicker component
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { ParticipantPicker } from '../ParticipantPicker'

describe('ParticipantPicker', () => {
  const mockParticipants = [
    { id: '1', name: 'Alice Johnson', avatar_url: 'https://example.com/alice.jpg' },
    { id: '2', name: 'Bob Smith', avatar_url: 'https://example.com/bob.jpg' },
    { id: '3', name: 'Charlie Davis' },
  ]

  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all participants', () => {
    render(
      <ParticipantPicker participants={mockParticipants} selectedIds={[]} onChange={mockOnChange} />
    )

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.getByText('Charlie Davis')).toBeInTheDocument()
  })

  it('shows the correct participant count', () => {
    render(
      <ParticipantPicker
        participants={mockParticipants}
        selectedIds={['1', '2']}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('Participants (2 of 3)')).toBeInTheDocument()
  })

  it('checks selected participants', () => {
    render(
      <ParticipantPicker
        participants={mockParticipants}
        selectedIds={['1', '3']}
        onChange={mockOnChange}
      />
    )

    const aliceCheckbox = screen.getByRole('checkbox', { name: /alice johnson/i })
    const bobCheckbox = screen.getByRole('checkbox', { name: /bob smith/i })
    const charlieCheckbox = screen.getByRole('checkbox', { name: /charlie davis/i })

    expect(aliceCheckbox).toBeChecked()
    expect(bobCheckbox).not.toBeChecked()
    expect(charlieCheckbox).toBeChecked()
  })

  it('calls onChange when a participant is selected', () => {
    render(
      <ParticipantPicker
        participants={mockParticipants}
        selectedIds={['1']}
        onChange={mockOnChange}
      />
    )

    const bobCheckbox = screen.getByRole('checkbox', { name: /bob smith/i })
    fireEvent.click(bobCheckbox)

    expect(mockOnChange).toHaveBeenCalledWith(['1', '2'])
  })

  it('calls onChange when a participant is deselected', () => {
    render(
      <ParticipantPicker
        participants={mockParticipants}
        selectedIds={['1', '2']}
        onChange={mockOnChange}
      />
    )

    const aliceCheckbox = screen.getByRole('checkbox', { name: /alice johnson/i })
    fireEvent.click(aliceCheckbox)

    expect(mockOnChange).toHaveBeenCalledWith(['2'])
  })

  it('selects all participants when "Select All" is clicked', () => {
    render(
      <ParticipantPicker
        participants={mockParticipants}
        selectedIds={['1']}
        onChange={mockOnChange}
      />
    )

    const selectAllButton = screen.getByRole('button', { name: /select all/i })
    fireEvent.click(selectAllButton)

    expect(mockOnChange).toHaveBeenCalledWith(['1', '2', '3'])
  })

  it('deselects all participants when "Deselect All" is clicked', () => {
    render(
      <ParticipantPicker
        participants={mockParticipants}
        selectedIds={['1', '2', '3']}
        onChange={mockOnChange}
      />
    )

    const deselectAllButton = screen.getByRole('button', { name: /deselect all/i })
    fireEvent.click(deselectAllButton)

    expect(mockOnChange).toHaveBeenCalledWith([])
  })

  it('disables "Select All" when all are selected', () => {
    render(
      <ParticipantPicker
        participants={mockParticipants}
        selectedIds={['1', '2', '3']}
        onChange={mockOnChange}
      />
    )

    const selectAllButton = screen.getByRole('button', { name: /select all/i })
    expect(selectAllButton).toBeDisabled()
  })

  it('disables "Deselect All" when none are selected', () => {
    render(
      <ParticipantPicker participants={mockParticipants} selectedIds={[]} onChange={mockOnChange} />
    )

    const deselectAllButton = screen.getByRole('button', { name: /deselect all/i })
    expect(deselectAllButton).toBeDisabled()
  })

  it('highlights the payer', () => {
    render(
      <ParticipantPicker
        participants={mockParticipants}
        selectedIds={['1', '2']}
        onChange={mockOnChange}
        payerId="1"
      />
    )

    expect(screen.getByText('(Payer)')).toBeInTheDocument()
  })

  it('shows empty state when no participants', () => {
    render(<ParticipantPicker participants={[]} selectedIds={[]} onChange={mockOnChange} />)

    expect(screen.getByText('No participants available')).toBeInTheDocument()
  })

  it('has correct test IDs for each participant', () => {
    render(
      <ParticipantPicker participants={mockParticipants} selectedIds={[]} onChange={mockOnChange} />
    )

    expect(screen.getByTestId('participant-1')).toBeInTheDocument()
    expect(screen.getByTestId('participant-2')).toBeInTheDocument()
    expect(screen.getByTestId('participant-3')).toBeInTheDocument()
  })
})
