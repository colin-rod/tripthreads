import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { AppNavBar } from '@/components/layouts/AppNavBar'

// Mock UserAvatarDropdown to isolate AppNavBar testing
jest.mock('@/components/layouts/UserAvatarDropdown', () => ({
  UserAvatarDropdown: () => <div data-testid="user-avatar-dropdown">Avatar</div>,
}))

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

describe('AppNavBar', () => {
  it('should render the logo with text "TripThreads"', () => {
    render(<AppNavBar />)

    const logo = screen.getByText('TripThreads')
    expect(logo).toBeInTheDocument()
  })

  it('should render logo that links to /trips', () => {
    render(<AppNavBar />)

    const logo = screen.getByText('TripThreads')
    const link = logo.closest('a')

    expect(link).toHaveAttribute('href', '/trips')
  })

  it('should render UserAvatarDropdown component', () => {
    render(<AppNavBar />)

    expect(screen.getByTestId('user-avatar-dropdown')).toBeInTheDocument()
  })

  it('should have fixed positioning at top with correct styling', () => {
    const { container } = render(<AppNavBar />)

    const header = container.querySelector('header')
    expect(header).toHaveClass('fixed')
    expect(header).toHaveClass('top-0')
    expect(header).toHaveClass('left-0')
    expect(header).toHaveClass('right-0')
  })

  it('should have z-index of 60', () => {
    const { container } = render(<AppNavBar />)

    const header = container.querySelector('header')
    expect(header).toHaveClass('z-[60]')
  })

  it('should have height of 16 (h-16)', () => {
    const { container } = render(<AppNavBar />)

    const header = container.querySelector('header')
    expect(header).toHaveClass('h-16')
  })

  it('should have border and shadow styling', () => {
    const { container } = render(<AppNavBar />)

    const header = container.querySelector('header')
    expect(header).toHaveClass('border-b')
    expect(header).toHaveClass('shadow-sm')
  })

  it('should have role="banner" for accessibility', () => {
    render(<AppNavBar />)

    const banner = screen.getByRole('banner')
    expect(banner).toBeInTheDocument()
  })

  it('should have proper layout structure (flexbox with space-between)', () => {
    const { container } = render(<AppNavBar />)

    const contentDiv = container.querySelector('header > div')
    expect(contentDiv).toHaveClass('flex')
    expect(contentDiv).toHaveClass('justify-between')
    expect(contentDiv).toHaveClass('items-center')
  })

  it('should use TripThreads branding with proper typography', () => {
    render(<AppNavBar />)

    const logo = screen.getByText('TripThreads')
    expect(logo).toHaveClass('text-2xl')
    expect(logo).toHaveClass('font-bold')
  })
})
