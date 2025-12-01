/**
 * Unit tests for SplitPreview component
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { SplitPreview } from '../SplitPreview'

describe('SplitPreview', () => {
  const mockParticipants = [
    {
      id: '1',
      name: 'Alice Johnson',
      avatar_url: 'https://example.com/alice.jpg',
      amount: 60,
      percentage: 60,
    },
    {
      id: '2',
      name: 'Bob Smith',
      amount: 40,
      percentage: 40,
    },
  ]

  it('renders split preview with total amount', () => {
    render(
      <SplitPreview
        totalAmount={100}
        currency="EUR"
        splitType="percentage"
        participants={mockParticipants}
      />
    )

    expect(screen.getByText('EUR 100.00')).toBeInTheDocument()
    expect(screen.getByText('2 participants')).toBeInTheDocument()
  })

  it('displays correct split type label', () => {
    const { rerender } = render(
      <SplitPreview
        totalAmount={100}
        currency="EUR"
        splitType="equal"
        participants={mockParticipants}
      />
    )

    expect(screen.getByText('Equal Split')).toBeInTheDocument()

    rerender(
      <SplitPreview
        totalAmount={100}
        currency="EUR"
        splitType="percentage"
        participants={mockParticipants}
      />
    )

    expect(screen.getByText('Percentage Split')).toBeInTheDocument()

    rerender(
      <SplitPreview
        totalAmount={100}
        currency="EUR"
        splitType="amount"
        participants={mockParticipants}
      />
    )

    expect(screen.getByText('Custom Amounts')).toBeInTheDocument()
  })

  it('shows participant breakdown when expanded', () => {
    render(
      <SplitPreview
        totalAmount={100}
        currency="EUR"
        splitType="percentage"
        participants={mockParticipants}
      />
    )

    // Should be expanded by default
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.getByText('EUR 60.00')).toBeInTheDocument()
    expect(screen.getByText('EUR 40.00')).toBeInTheDocument()
  })

  it('displays percentages for each participant', () => {
    render(
      <SplitPreview
        totalAmount={100}
        currency="EUR"
        splitType="percentage"
        participants={mockParticipants}
      />
    )

    expect(screen.getByText('(60%)')).toBeInTheDocument()
    expect(screen.getByText('(40%)')).toBeInTheDocument()
  })

  it('can be collapsed and expanded', () => {
    render(
      <SplitPreview
        totalAmount={100}
        currency="EUR"
        splitType="percentage"
        participants={mockParticipants}
      />
    )

    // Should be expanded by default
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()

    // Click to collapse
    const collapseButton = screen.getByRole('button', { name: /hide breakdown/i })
    fireEvent.click(collapseButton)

    // Breakdown should be hidden
    expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument()

    // Click to expand
    const expandButton = screen.getByRole('button', { name: /show breakdown/i })
    fireEvent.click(expandButton)

    // Breakdown should be visible again
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
  })

  it('handles participants without avatar_url', () => {
    render(
      <SplitPreview
        totalAmount={100}
        currency="EUR"
        splitType="equal"
        participants={[
          { id: '1', name: 'Alice Johnson', amount: 50, percentage: 50 },
          { id: '2', name: 'Bob Smith', amount: 50, percentage: 50 },
        ]}
      />
    )

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
  })

  it('formats amounts with two decimal places', () => {
    render(
      <SplitPreview
        totalAmount={100}
        currency="EUR"
        splitType="percentage"
        participants={[
          { id: '1', name: 'Alice', amount: 33.333, percentage: 33.333 },
          { id: '2', name: 'Bob', amount: 66.667, percentage: 66.667 },
        ]}
      />
    )

    expect(screen.getByText('EUR 33.33')).toBeInTheDocument()
    expect(screen.getByText('EUR 66.67')).toBeInTheDocument()
  })

  it('formats percentages as integers', () => {
    render(
      <SplitPreview
        totalAmount={100}
        currency="EUR"
        splitType="percentage"
        participants={[
          { id: '1', name: 'Alice', amount: 33.33, percentage: 33.333 },
          { id: '2', name: 'Bob', amount: 66.67, percentage: 66.667 },
        ]}
      />
    )

    expect(screen.getByText('(33%)')).toBeInTheDocument()
    expect(screen.getByText('(67%)')).toBeInTheDocument()
  })

  it('handles empty participant list', () => {
    render(<SplitPreview totalAmount={100} currency="EUR" splitType="equal" participants={[]} />)

    expect(screen.getByText('0 participants')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <SplitPreview
        totalAmount={100}
        currency="EUR"
        splitType="equal"
        participants={mockParticipants}
        className="custom-class"
      />
    )

    const previewElement = container.querySelector('.custom-class')
    expect(previewElement).toBeInTheDocument()
  })
})
