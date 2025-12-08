/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
    render(<TripActions trip={mockTrip} />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Edit Trip')).toBeInTheDocument()
      expect(screen.getByText('Delete Trip')).toBeInTheDocument()
    })
  })

  it('renders Settings menu item when onNavigate is provided', async () => {
    const onNavigate = jest.fn()
    render(<TripActions trip={mockTrip} onNavigate={onNavigate} />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('does not render Settings menu item when onNavigate is undefined', async () => {
    render(<TripActions trip={mockTrip} />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    })
  })

  it('calls onNavigate with "settings" when Settings is clicked', async () => {
    const onNavigate = jest.fn()
    render(<TripActions trip={mockTrip} onNavigate={onNavigate} />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    fireEvent.click(button)

    // Click Settings
    await waitFor(() => {
      const settingsItem = screen.getByText('Settings')
      fireEvent.click(settingsItem)
    })

    expect(onNavigate).toHaveBeenCalledWith('settings')
  })

  it('Settings appears before Edit Trip when present', async () => {
    const onNavigate = jest.fn()
    render(<TripActions trip={mockTrip} onNavigate={onNavigate} />)

    // Open dropdown
    const button = screen.getByRole('button', { name: /trip settings/i })
    fireEvent.click(button)

    await waitFor(() => {
      const menuItems = screen.getAllByRole('menuitem')
      const settingsIndex = menuItems.findIndex(item => item.textContent?.includes('Settings'))
      const editIndex = menuItems.findIndex(item => item.textContent?.includes('Edit Trip'))

      expect(settingsIndex).toBeLessThan(editIndex)
    })
  })
})
