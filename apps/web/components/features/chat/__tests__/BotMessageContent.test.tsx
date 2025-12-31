import { render, screen } from '@testing-library/react'
import { BotMessageContent } from '../BotMessageContent'

describe('BotMessageContent', () => {
  const mockTripId = 'trip-123'
  const mockParticipants = [
    { id: 'user-1', full_name: 'John Doe', email: 'john@example.com', avatar_url: null },
  ]

  it('renders plain text when no items in metadata', () => {
    render(
      <BotMessageContent
        content="This is a plain bot message"
        metadata={{}}
        tripId={mockTripId}
        tripParticipants={mockParticipants}
      />
    )

    expect(screen.getByText('This is a plain bot message')).toBeInTheDocument()
  })

  it('renders plain text when items array is empty', () => {
    render(
      <BotMessageContent
        content="Another plain message"
        metadata={{ items: [] }}
        tripId={mockTripId}
        tripParticipants={mockParticipants}
      />
    )

    expect(screen.getByText('Another plain message')).toBeInTheDocument()
  })

  it('parses single itinerary item and renders clickable link', () => {
    const content = '✅ Added flight: Flight to Boston'
    const items = [
      {
        id: 'item-123',
        type: 'itinerary' as const,
        itineraryType: 'transport',
        title: 'Flight to Boston',
      },
    ]

    render(
      <BotMessageContent
        content={content}
        metadata={{ items }}
        tripId={mockTripId}
        tripParticipants={mockParticipants}
      />
    )

    // Check that the clickable link is rendered
    const link = screen.getByRole('button', { name: /Added flight: Flight to Boston/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveClass('text-primary')
  })

  it('parses single expense item and renders clickable link', () => {
    const content = '✅ Added expense: Dinner - €60.00'
    const items = [
      {
        id: 'expense-123',
        type: 'expense' as const,
        title: 'Dinner - €60.00',
      },
    ]

    render(
      <BotMessageContent
        content={content}
        metadata={{ items }}
        tripId={mockTripId}
        tripParticipants={mockParticipants}
      />
    )

    const link = screen.getByRole('button', { name: /Added expense: Dinner - €60.00/i })
    expect(link).toBeInTheDocument()
  })

  it('parses multiple items and renders both clickable links', () => {
    const content = '✅ Added flight: Flight to Boston | Added expense: Dinner - €60.00'
    const items = [
      {
        id: 'item-123',
        type: 'itinerary' as const,
        itineraryType: 'transport',
        title: 'Flight to Boston',
      },
      {
        id: 'expense-123',
        type: 'expense' as const,
        title: 'Dinner - €60.00',
      },
    ]

    render(
      <BotMessageContent
        content={content}
        metadata={{ items }}
        tripId={mockTripId}
        tripParticipants={mockParticipants}
      />
    )

    // Both links should be present
    expect(
      screen.getByRole('button', { name: /Added flight: Flight to Boston/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Added expense: Dinner - €60.00/i })
    ).toBeInTheDocument()

    // The separator should also be present as plain text
    expect(screen.getByText('|', { exact: false })).toBeInTheDocument()
  })

  it('handles special characters in item titles', () => {
    const content = '✅ Added activity: Dinner | Lunch Special'
    const items = [
      {
        id: 'item-123',
        type: 'itinerary' as const,
        itineraryType: 'activity',
        title: 'Dinner | Lunch Special',
      },
    ]

    render(
      <BotMessageContent
        content={content}
        metadata={{ items }}
        tripId={mockTripId}
        tripParticipants={mockParticipants}
      />
    )

    // Should still render the link correctly despite special characters
    const link = screen.getByRole('button', { name: /Added activity: Dinner \| Lunch Special/i })
    expect(link).toBeInTheDocument()
  })

  it('maintains backward compatibility with old messages (no items field)', () => {
    const content = '✅ Added flight: Old Message'

    render(
      <BotMessageContent
        content={content}
        metadata={undefined}
        tripId={mockTripId}
        tripParticipants={mockParticipants}
      />
    )

    // Should render as plain text without crashing
    expect(screen.getByText(content)).toBeInTheDocument()
  })
})
