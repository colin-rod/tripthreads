import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  ErrorState,
  NetworkError,
  PermissionError,
  NotFoundError,
  ServerError,
} from '../../components/error-state'

describe('ErrorState', () => {
  it('should render generic error by default', () => {
    render(<ErrorState />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
  })

  it('should render network error', () => {
    render(<ErrorState type="network" />)

    expect(screen.getByText('No internet connection')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('should render permission error', () => {
    render(<ErrorState type="permission" />)

    expect(screen.getByText('Access denied')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })

  it('should render 404 error', () => {
    render(<ErrorState type="404" />)

    expect(screen.getByText('Page not found')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument()
  })

  it('should render 500 error', () => {
    render(<ErrorState type="500" />)

    expect(screen.getByText('Server error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('should use custom title and description', () => {
    render(<ErrorState title="Custom Title" description="Custom description" />)

    expect(screen.getByText('Custom Title')).toBeInTheDocument()
    expect(screen.getByText('Custom description')).toBeInTheDocument()
  })

  it('should call custom action when button is clicked', () => {
    const action = jest.fn()
    render(<ErrorState action={action} />)

    fireEvent.click(screen.getByRole('button'))
    expect(action).toHaveBeenCalled()
  })

  it('should hide action button when showAction is false', () => {
    render(<ErrorState showAction={false} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  describe('Convenience components', () => {
    it('should render NetworkError', () => {
      render(<NetworkError />)
      expect(screen.getByText('No internet connection')).toBeInTheDocument()
    })

    it('should render PermissionError', () => {
      render(<PermissionError />)
      expect(screen.getByText('Access denied')).toBeInTheDocument()
    })

    it('should render NotFoundError', () => {
      render(<NotFoundError />)
      expect(screen.getByText('Page not found')).toBeInTheDocument()
    })

    it('should render ServerError', () => {
      render(<ServerError />)
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })
})
