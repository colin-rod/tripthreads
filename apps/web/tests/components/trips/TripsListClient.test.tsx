import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import type { Trip } from '@/lib/utils/trip-utils'
import { TripsListClient } from '@/components/features/trips/TripsListClient'
import { filterAndCategorizeTrips } from '@/lib/utils/trip-utils'

jest.mock('@/components/features/trips/EditTripDialog', () => ({
  __esModule: true,
  EditTripDialog: () => <div data-testid="edit-trip-dialog" />,
}))

jest.mock('@/components/features/trips/DeleteTripDialog', () => ({
  __esModule: true,
  DeleteTripDialog: () => <div data-testid="delete-trip-dialog" />,
}))

jest.mock('@/lib/utils/trip-utils', () => {
  const actual = jest.requireActual('@/lib/utils/trip-utils')
  return {
    __esModule: true,
    ...actual,
    filterAndCategorizeTrips: jest.fn(),
  }
})

const filterAndCategorizeTripsMock = filterAndCategorizeTrips as jest.MockedFunction<
  typeof filterAndCategorizeTrips
>

afterEach(() => {
  filterAndCategorizeTripsMock.mockReset()
})

describe('TripsListClient', () => {
  const sampleTrip = (overrides: Partial<Trip> = {}): Trip => ({
    id: `trip-${Math.random().toString(36).slice(2, 7)}`,
    name: 'Adventure Time',
    description: 'Fun in the sun',
    start_date: new Date(Date.now() + 86400000).toISOString(),
    end_date: new Date(Date.now() + 172800000).toISOString(),
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
    ...overrides,
  })

  it('renders category sections when trips exist', () => {
    const ongoingTrip = sampleTrip({ id: 'ongoing-trip' })
    const upcomingTrip = sampleTrip({ id: 'upcoming-trip' })
    const pastTrip = sampleTrip({ id: 'past-trip' })

    filterAndCategorizeTripsMock.mockReturnValue({
      ongoing: [ongoingTrip],
      upcoming: [upcomingTrip],
      past: [pastTrip],
    })

    render(<TripsListClient trips={[ongoingTrip, upcomingTrip, pastTrip]} searchQuery="" />)

    expect(screen.getByRole('heading', { level: 2, name: /ongoing trips/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /upcoming trips/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /past trips/i })).toBeInTheDocument()
  })

  it('shows the empty search state when no trips match', () => {
    const trips = [sampleTrip({ name: 'City Break' }), sampleTrip({ name: 'Mountain Escape' })]

    filterAndCategorizeTripsMock.mockReturnValue({ ongoing: [], upcoming: [], past: [] })

    render(<TripsListClient trips={trips} searchQuery="desert" />)

    expect(screen.getByText('No trips found')).toBeInTheDocument()
    expect(
      screen.getByText('No trips match your search "desert". Try a different search term.')
    ).toBeInTheDocument()
  })
})
