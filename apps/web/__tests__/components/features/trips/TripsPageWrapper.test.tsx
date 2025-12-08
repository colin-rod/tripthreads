import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TripsPageWrapper } from '@/components/features/trips/TripsPageWrapper'
import { type Trip } from '@/lib/utils/trip-utils'

// Mock child components
jest.mock('@/components/features/trips/TripsListClient', () => ({
  TripsListClient: ({ searchQuery }: { searchQuery: string }) => (
    <div data-testid="trips-list-client">Trips List (search: {searchQuery})</div>
  ),
}))

jest.mock('@/components/features/trips/CreateTripButton', () => ({
  CreateTripButton: () => <button data-testid="create-trip-button">Create Trip</button>,
}))

// Mock TopNavBar should NOT be rendered anymore
jest.mock('@/components/layouts/TopNavBar', () => ({
  TopNavBar: () => <div data-testid="top-nav-bar">TopNavBar</div>,
}))

describe('TripsPageWrapper', () => {
  const mockTrips: Trip[] = [
    {
      id: '1',
      name: 'Test Trip 1',
      start_date: '2025-01-01',
      end_date: '2025-01-05',
      owner_id: 'user-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      description: null,
      cover_image_url: null,
      owner: {
        id: 'user-1',
        full_name: 'Test User',
        avatar_url: null,
      },
      trip_participants: [],
    },
    {
      id: '2',
      name: 'Test Trip 2',
      start_date: '2025-02-01',
      end_date: '2025-02-05',
      owner_id: 'user-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      description: null,
      cover_image_url: null,
      owner: {
        id: 'user-1',
        full_name: 'Test User',
        avatar_url: null,
      },
      trip_participants: [],
    },
  ]

  it('should NOT render TopNavBar component', () => {
    render(<TripsPageWrapper trips={mockTrips} />)

    // TopNavBar should not be in the document (removed in refactor)
    expect(screen.queryByTestId('top-nav-bar')).not.toBeInTheDocument()
  })

  it('should render search input in content area', () => {
    render(<TripsPageWrapper trips={mockTrips} />)

    const searchInput = screen.getByPlaceholderText(/search trips/i)
    expect(searchInput).toBeInTheDocument()
  })

  it('should render page header with title and description', () => {
    render(<TripsPageWrapper trips={mockTrips} />)

    expect(screen.getByText('Your Trips')).toBeInTheDocument()
    expect(screen.getByText(/Plan, organize, and track your adventures/i)).toBeInTheDocument()
  })

  it('should render CreateTripButton', () => {
    render(<TripsPageWrapper trips={mockTrips} />)

    expect(screen.getByTestId('create-trip-button')).toBeInTheDocument()
  })

  it('should render TripsListClient with search query', async () => {
    const user = userEvent.setup()
    render(<TripsPageWrapper trips={mockTrips} />)

    const searchInput = screen.getByPlaceholderText(/search trips/i)

    // Initially empty search
    expect(screen.getByText(/Trips List \(search: \)/i)).toBeInTheDocument()

    // Type in search
    await user.type(searchInput, 'Paris')

    // Search query should update
    expect(screen.getByText(/Trips List \(search: Paris\)/i)).toBeInTheDocument()
  })

  it('should NOT have pt-20 or pt-16 wrapper (spacing handled by layout)', () => {
    const { container } = render(<TripsPageWrapper trips={mockTrips} />)

    // Should not have the old padding wrapper
    const ptWrapper = container.querySelector('.pt-20')
    const mdPtWrapper = container.querySelector('.md\\:pt-16')

    expect(ptWrapper).not.toBeInTheDocument()
    expect(mdPtWrapper).not.toBeInTheDocument()
  })

  it('should have container layout with proper spacing', () => {
    const { container } = render(<TripsPageWrapper trips={mockTrips} />)

    const containerDiv = container.querySelector('.container')
    expect(containerDiv).toBeInTheDocument()
    expect(containerDiv).toHaveClass('mx-auto', 'py-8', 'px-4')
  })

  it('should render search input with correct styling', () => {
    render(<TripsPageWrapper trips={mockTrips} />)

    const searchInput = screen.getByPlaceholderText(/search trips/i)
    expect(searchInput).toHaveAttribute('type', 'search')
  })
})
