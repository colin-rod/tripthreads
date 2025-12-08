import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Trip } from '@/lib/utils/trip-utils'
import { TripsPageWrapper } from '@/components/features/trips/TripsPageWrapper'

jest.mock('@/components/features/trips/CreateTripButton', () => ({
  __esModule: true,
  CreateTripButton: () => <button type="button">Create Trip</button>,
}))

jest.mock('@/components/features/trips/TripsListClient', () => {
  return {
    __esModule: true,
    TripsListClient: ({ searchQuery, trips }: { searchQuery: string; trips: Trip[] }) => (
      <div data-testid="trips-list" data-search={searchQuery} data-count={trips.length}>
        {searchQuery}
      </div>
    ),
  }
})

describe('TripsPageWrapper', () => {
  const trips: Trip[] = [
    {
      id: 'trip-123',
      name: 'City Lights',
      description: 'Weekend getaway',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
      cover_image_url: null,
      owner_id: 'owner-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner: {
        id: 'owner-1',
        full_name: 'Owner User',
        avatar_url: null,
      },
      trip_participants: [],
    },
  ]

  it('renders the trip page layout', () => {
    render(<TripsPageWrapper trips={trips} />)

    expect(screen.getByRole('heading', { name: /your trips/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create trip/i })).toBeInTheDocument()
    expect(screen.getByTestId('trips-list')).toHaveAttribute('data-count', '1')
  })

  it('updates the search query when TopNavBar changes it', () => {
    render(<TripsPageWrapper trips={trips} />)

    expect(screen.getByTestId('trips-list')).toHaveAttribute('data-search', '')

    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'mountain' } })

    expect(screen.getByTestId('trips-list')).toHaveAttribute('data-search', 'mountain')
  })
})
