/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
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
    render(<TripActions trip={mockTrip} tripId="trip-1" />)

    const button = screen.getByRole('button', { name: /trip settings/i })
    expect(button).toBeInTheDocument()
  })

  it('shows Invite menu item for owner', async () => {
    const user = userEvent.setup()
    render(<TripActions trip={mockTrip} tripId="trip-1" />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    await user.click(button)

    // Wait for menu items to appear
    expect(await screen.findByText('Invite')).toBeInTheDocument()
  })

  it('does not render Edit Trip menu item', async () => {
    const user = userEvent.setup()
    render(<TripActions trip={mockTrip} tripId="trip-1" />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    await user.click(button)

    // Wait for Invite to appear, then verify Edit Trip is not present
    await screen.findByText('Invite')
    expect(screen.queryByText('Edit Trip')).not.toBeInTheDocument()
  })

  it('does not render Delete Trip menu item', async () => {
    const user = userEvent.setup()
    render(<TripActions trip={mockTrip} tripId="trip-1" />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    await user.click(button)

    // Wait for Invite to appear, then verify Delete Trip is not present
    await screen.findByText('Invite')
    expect(screen.queryByText('Delete Trip')).not.toBeInTheDocument()
  })

  it('renders Settings menu item when onNavigate is provided', async () => {
    const user = userEvent.setup()
    const onNavigate = jest.fn()
    render(<TripActions trip={mockTrip} tripId="trip-1" onNavigate={onNavigate} />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    await user.click(button)

    // Wait for Settings menu item to appear
    expect(await screen.findByText('Settings')).toBeInTheDocument()
  })

  it('does not render Settings menu item when onNavigate is undefined', async () => {
    const user = userEvent.setup()
    render(<TripActions trip={mockTrip} tripId="trip-1" />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    await user.click(button)

    // Wait for Invite to appear, then verify Settings is not present
    await screen.findByText('Invite')
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('calls onNavigate with "settings" when Settings is clicked', async () => {
    const user = userEvent.setup()
    const onNavigate = jest.fn()
    render(<TripActions trip={mockTrip} tripId="trip-1" onNavigate={onNavigate} />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    await user.click(button)

    // Wait for and click Settings
    const settingsItem = await screen.findByText('Settings')
    await user.click(settingsItem)

    expect(onNavigate).toHaveBeenCalledWith('settings')
  })

  it('Invite appears at the top of the menu', async () => {
    const user = userEvent.setup()
    render(<TripActions trip={mockTrip} tripId="trip-1" />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    await user.click(button)

    // Wait for menu items to appear
    await screen.findByText('Invite')
    const menuItems = screen.getAllByRole('menuitem')
    const inviteIndex = menuItems.findIndex(item => item.textContent?.includes('Invite'))

    expect(inviteIndex).toBe(0)
  })

  it('Menu order is Invite, Settings when Settings is present', async () => {
    const user = userEvent.setup()
    const onNavigate = jest.fn()
    render(<TripActions trip={mockTrip} tripId="trip-1" onNavigate={onNavigate} />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    await user.click(button)

    // Wait for menu items to appear
    await screen.findByText('Invite')
    const menuItems = screen.getAllByRole('menuitem')
    const inviteIndex = menuItems.findIndex(item => item.textContent?.includes('Invite'))
    const settingsIndex = menuItems.findIndex(item => item.textContent?.includes('Settings'))

    expect(inviteIndex).toBe(0)
    expect(settingsIndex).toBe(1)
    expect(menuItems).toHaveLength(2)
  })
})
