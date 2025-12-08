/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { SettingsSection } from '@/components/features/trips/sections/SettingsSection'

// Mock components
jest.mock('@/components/features/trips/InviteButton', () => ({
  InviteButton: () => <button>Invite</button>,
}))

jest.mock('@/components/features/invites/PendingInvitesList', () => ({
  PendingInvitesList: () => <div>Pending Invites List</div>,
}))

jest.mock('@/components/features/trips/TripNotificationPreferencesSection', () => ({
  TripNotificationPreferencesSection: () => <div>Notification Preferences</div>,
}))

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
})

describe('SettingsSection', () => {
  const mockTrip = {
    id: 'trip-1',
    name: 'Test Trip',
    description: 'Test description',
    start_date: '2024-01-01',
    end_date: '2024-01-10',
    trip_participants: [
      {
        id: 'participant-1',
        role: 'owner',
        user: {
          id: 'user-1',
          full_name: 'Test User',
          avatar_url: null,
        },
      },
      {
        id: 'participant-2',
        role: 'participant',
        user: {
          id: 'user-2',
          full_name: 'Another User',
          avatar_url: null,
        },
      },
    ],
  }

  const mockGlobalPreferences = {
    invites: true,
    itinerary: true,
    expenses: true,
    photos: true,
    chat: true,
    settlements: true,
  }

  it('renders the Settings heading', () => {
    render(
      <SettingsSection
        trip={mockTrip}
        isOwner={true}
        currentUserId="user-1"
        tripNotificationPreferences={null}
        globalNotificationPreferences={mockGlobalPreferences}
      />
    )

    expect(screen.getByRole('heading', { name: 'Settings', level: 2 })).toBeInTheDocument()
  })

  it('does NOT render Trip Information section', () => {
    render(
      <SettingsSection
        trip={mockTrip}
        isOwner={true}
        currentUserId="user-1"
        tripNotificationPreferences={null}
        globalNotificationPreferences={mockGlobalPreferences}
      />
    )

    expect(screen.queryByText('Trip Information')).not.toBeInTheDocument()
  })

  it('renders Participants accordion section', () => {
    render(
      <SettingsSection
        trip={mockTrip}
        isOwner={true}
        currentUserId="user-1"
        tripNotificationPreferences={null}
        globalNotificationPreferences={mockGlobalPreferences}
      />
    )

    expect(screen.getByText('Participants')).toBeInTheDocument()
    expect(screen.getByText('Manage trip participants and invite new members')).toBeInTheDocument()
  })

  it('renders Invitations accordion section for owners', () => {
    render(
      <SettingsSection
        trip={mockTrip}
        isOwner={true}
        currentUserId="user-1"
        tripNotificationPreferences={null}
        globalNotificationPreferences={mockGlobalPreferences}
      />
    )

    expect(screen.getByText('Invitations')).toBeInTheDocument()
    expect(
      screen.getByText('Manage trip invitations and view invitation history')
    ).toBeInTheDocument()
  })

  it('does NOT render Invitations section for non-owners', () => {
    render(
      <SettingsSection
        trip={mockTrip}
        isOwner={false}
        currentUserId="user-2"
        tripNotificationPreferences={null}
        globalNotificationPreferences={mockGlobalPreferences}
      />
    )

    expect(screen.queryByText('Invitations')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Manage trip invitations and view invitation history')
    ).not.toBeInTheDocument()
  })

  it('renders Notification Preferences accordion section', () => {
    render(
      <SettingsSection
        trip={mockTrip}
        isOwner={true}
        currentUserId="user-1"
        tripNotificationPreferences={null}
        globalNotificationPreferences={mockGlobalPreferences}
      />
    )

    expect(screen.getByText('Notification Preferences')).toBeInTheDocument()
    expect(
      screen.getByText('Control which notifications you receive for this trip')
    ).toBeInTheDocument()
  })

  it('renders link to global notification settings', () => {
    render(
      <SettingsSection
        trip={mockTrip}
        isOwner={true}
        currentUserId="user-1"
        tripNotificationPreferences={null}
        globalNotificationPreferences={mockGlobalPreferences}
      />
    )

    const link = screen.getByRole('link', { name: /global notification settings/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/settings')
  })

  it('shows InviteButton for owners', () => {
    render(
      <SettingsSection
        trip={mockTrip}
        isOwner={true}
        currentUserId="user-1"
        tripNotificationPreferences={null}
        globalNotificationPreferences={mockGlobalPreferences}
      />
    )

    expect(screen.getByRole('button', { name: 'Invite' })).toBeInTheDocument()
  })

  it('displays all trip participants', () => {
    render(
      <SettingsSection
        trip={mockTrip}
        isOwner={true}
        currentUserId="user-1"
        tripNotificationPreferences={null}
        globalNotificationPreferences={mockGlobalPreferences}
      />
    )

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Another User')).toBeInTheDocument()
  })

  it('displays role badges for participants', () => {
    render(
      <SettingsSection
        trip={mockTrip}
        isOwner={true}
        currentUserId="user-1"
        tripNotificationPreferences={null}
        globalNotificationPreferences={mockGlobalPreferences}
      />
    )

    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(screen.getByText('Participant')).toBeInTheDocument()
  })

  it('renders three accordion sections for owners', () => {
    const { container } = render(
      <SettingsSection
        trip={mockTrip}
        isOwner={true}
        currentUserId="user-1"
        tripNotificationPreferences={null}
        globalNotificationPreferences={mockGlobalPreferences}
      />
    )

    // Count accordion items (they have data-state attribute from Radix)
    const accordionItems = container.querySelectorAll('[data-state]')
    // Should have 3 sections: Participants, Invitations, Notifications
    expect(accordionItems.length).toBeGreaterThanOrEqual(3)
  })

  it('renders two accordion sections for non-owners', () => {
    const { container } = render(
      <SettingsSection
        trip={mockTrip}
        isOwner={false}
        currentUserId="user-2"
        tripNotificationPreferences={null}
        globalNotificationPreferences={mockGlobalPreferences}
      />
    )

    // Count accordion items
    const accordionItems = container.querySelectorAll('[data-state]')
    // Should have 2 sections: Participants, Notifications (no Invitations)
    expect(accordionItems.length).toBeGreaterThanOrEqual(2)
    expect(accordionItems.length).toBeLessThan(4)
  })
})
