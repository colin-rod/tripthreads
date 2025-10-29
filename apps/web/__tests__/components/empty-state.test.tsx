import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  EmptyState,
  EmptyTrips,
  EmptyParticipants,
  EmptyExpenses,
  EmptyPhotos,
  EmptyItinerary,
} from '../../components/empty-state'

describe('EmptyState', () => {
  it('should render generic empty state by default', () => {
    render(<EmptyState />)

    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.getByText('There are no items to display.')).toBeInTheDocument()
  })

  it('should render trips empty state', () => {
    render(<EmptyState type="trips" />)

    expect(screen.getByText('No trips yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create trip/i })).toBeInTheDocument()
  })

  it('should render participants empty state', () => {
    render(<EmptyState type="participants" />)

    expect(screen.getByText('No participants')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /invite participants/i })).toBeInTheDocument()
  })

  it('should render expenses empty state', () => {
    render(<EmptyState type="expenses" />)

    expect(screen.getByText('No expenses tracked')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument()
  })

  it('should render photos empty state', () => {
    render(<EmptyState type="photos" />)

    expect(screen.getByText('No photos yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload photo/i })).toBeInTheDocument()
  })

  it('should render itinerary empty state', () => {
    render(<EmptyState type="itinerary" />)

    expect(screen.getByText('No itinerary items')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument()
  })

  it('should use custom title and description', () => {
    render(<EmptyState title="Custom Title" description="Custom description" />)

    expect(screen.getByText('Custom Title')).toBeInTheDocument()
    expect(screen.getByText('Custom description')).toBeInTheDocument()
  })

  it('should call custom action when button is clicked', () => {
    const action = jest.fn()
    render(<EmptyState type="trips" action={action} />)

    fireEvent.click(screen.getByRole('button'))
    expect(action).toHaveBeenCalled()
  })

  it('should hide action button when showAction is false', () => {
    render(<EmptyState type="trips" showAction={false} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  describe('Convenience components', () => {
    it('should render EmptyTrips', () => {
      render(<EmptyTrips />)
      expect(screen.getByText('No trips yet')).toBeInTheDocument()
    })

    it('should render EmptyParticipants', () => {
      render(<EmptyParticipants />)
      expect(screen.getByText('No participants')).toBeInTheDocument()
    })

    it('should render EmptyExpenses', () => {
      render(<EmptyExpenses />)
      expect(screen.getByText('No expenses tracked')).toBeInTheDocument()
    })

    it('should render EmptyPhotos', () => {
      render(<EmptyPhotos />)
      expect(screen.getByText('No photos yet')).toBeInTheDocument()
    })

    it('should render EmptyItinerary', () => {
      render(<EmptyItinerary />)
      expect(screen.getByText('No itinerary items')).toBeInTheDocument()
    })
  })
})
