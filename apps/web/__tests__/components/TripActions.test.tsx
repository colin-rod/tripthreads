/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TripActions } from '@/components/features/trips/TripActions'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

describe('TripActions', () => {
  const mockTrip = {
    id: 'trip-1',
    name: 'Test Trip',
    description: 'Test description',
    start_date: '2024-01-01',
    end_date: '2024-01-10',
  }

  it('renders the settings menu button', () => {
    render(<TripActions trip={mockTrip} />)

    const button = screen.getByRole('button', { name: /trip settings/i })
    expect(button).toBeInTheDocument()
  })

  it('shows Edit Trip and Delete Trip menu items', async () => {
    const user = userEvent.setup()
    render(<TripActions trip={mockTrip} />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    await user.click(button)

    // Wait for menu items to appear
    expect(await screen.findByText('Edit Trip')).toBeInTheDocument()
    expect(await screen.findByText('Delete Trip')).toBeInTheDocument()
  })

  it('renders Settings menu item when onNavigate is provided', async () => {
    const user = userEvent.setup()
    const onNavigate = jest.fn()
    render(<TripActions trip={mockTrip} onNavigate={onNavigate} />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    await user.click(button)

    // Wait for Settings menu item to appear
    expect(await screen.findByText('Settings')).toBeInTheDocument()
  })

  it('does not render Settings menu item when onNavigate is undefined', async () => {
    const user = userEvent.setup()
    render(<TripActions trip={mockTrip} />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    await user.click(button)

    // Wait for Edit Trip to appear, then verify Settings is not present
    await screen.findByText('Edit Trip')
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('calls onNavigate with "settings" when Settings is clicked', async () => {
    const user = userEvent.setup()
    const onNavigate = jest.fn()
    render(<TripActions trip={mockTrip} onNavigate={onNavigate} />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    await user.click(button)

    // Wait for and click Settings
    const settingsItem = await screen.findByText('Settings')
    await user.click(settingsItem)

    expect(onNavigate).toHaveBeenCalledWith('settings')
  })

  it('Settings appears before Edit Trip when present', async () => {
    const user = userEvent.setup()
    const onNavigate = jest.fn()
    render(<TripActions trip={mockTrip} onNavigate={onNavigate} />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    await user.click(button)

    // Wait for menu items to appear
    await screen.findByText('Settings')
    const menuItems = screen.getAllByRole('menuitem')
    const settingsIndex = menuItems.findIndex(item => item.textContent?.includes('Settings'))
    const editIndex = menuItems.findIndex(item => item.textContent?.includes('Edit Trip'))

    expect(settingsIndex).toBeLessThan(editIndex)
  })
})
