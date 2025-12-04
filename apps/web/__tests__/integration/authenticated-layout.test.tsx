import { render, screen } from '@testing-library/react'
import AppLayout from '@/app/(app)/layout'

// Mock child components that have dependencies we don't want to test here
jest.mock('@/components/features/profile/ProfileCompletionProvider', () => ({
  ProfileCompletionProvider: () => <div data-testid="profile-completion-provider" />,
}))

jest.mock('@/components/features/onboarding', () => ({
  Onboarding: () => <div data-testid="onboarding" />,
}))

jest.mock('@/components/layouts/AppNavBar', () => ({
  AppNavBar: () => (
    <header data-testid="app-navbar" role="banner">
      AppNavBar
    </header>
  ),
}))

describe('Authenticated Layout Integration', () => {
  it('should render AppNavBar component', () => {
    render(
      <AppLayout>
        <div>Page content</div>
      </AppLayout>
    )

    expect(screen.getByTestId('app-navbar')).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('should render ProfileCompletionProvider', () => {
    render(
      <AppLayout>
        <div>Page content</div>
      </AppLayout>
    )

    expect(screen.getByTestId('profile-completion-provider')).toBeInTheDocument()
  })

  it('should render Onboarding component', () => {
    render(
      <AppLayout>
        <div>Page content</div>
      </AppLayout>
    )

    expect(screen.getByTestId('onboarding')).toBeInTheDocument()
  })

  it('should render children content', () => {
    render(
      <AppLayout>
        <div data-testid="page-content">Test page content</div>
      </AppLayout>
    )

    expect(screen.getByTestId('page-content')).toBeInTheDocument()
    expect(screen.getByText('Test page content')).toBeInTheDocument()
  })

  it('should wrap children with top padding class (pt-16)', () => {
    const { container } = render(
      <AppLayout>
        <div data-testid="page-content">Test page content</div>
      </AppLayout>
    )

    // Find the wrapper div that has pt-16 class
    const wrapper = container.querySelector('.pt-16')
    expect(wrapper).toBeInTheDocument()

    // Ensure children are inside the wrapper
    const content = wrapper?.querySelector('[data-testid="page-content"]')
    expect(content).toBeInTheDocument()
  })

  it('should render components in correct order (navbar, providers, content)', () => {
    const { container } = render(
      <AppLayout>
        <div data-testid="page-content">Test page content</div>
      </AppLayout>
    )

    // Get all elements in the layout
    const elements = container.querySelectorAll('[data-testid]')
    const testIds = Array.from(elements).map(el => el.getAttribute('data-testid'))

    // Navbar should be first
    expect(testIds[0]).toBe('app-navbar')

    // Providers should come next
    expect(testIds).toContain('profile-completion-provider')
    expect(testIds).toContain('onboarding')

    // Page content should be last
    expect(testIds[testIds.length - 1]).toBe('page-content')
  })
})
