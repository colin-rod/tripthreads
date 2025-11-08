import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Home Page', () => {
  it('should render welcome message', () => {
    render(<Home />)
    expect(screen.getByText(/TripThreads/i)).toBeInTheDocument()
  })

  it('should render tagline', () => {
    render(<Home />)
    expect(screen.getByText(/Make memories, not spreadsheets/i)).toBeInTheDocument()
  })

  it('should render without errors', () => {
    const { container } = render(<Home />)
    expect(container.firstChild).toBeTruthy()
  })
})
