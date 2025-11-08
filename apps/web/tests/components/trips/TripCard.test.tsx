import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Trip } from '@/lib/utils/trip-utils'
import { TripCard } from '@/components/features/trips/TripCard'
import { createElement } from 'react'

const navigateCalls: Array<string | undefined> = []
;(globalThis as unknown as { __navigateCalls: typeof navigateCalls }).__navigateCalls =
  navigateCalls

jest.mock('next/link', () => {
  const Link = ({
    href,
    children,
    ...props
  }: {
    href: string | { pathname: string }
    children: React.ReactNode
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
    [key: string]: unknown
  }) => {
    return createElement(
      'a',
      {
        ...props,
        href: typeof href === 'string' ? href : (href?.pathname ?? '/'),
        onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
          props.onClick?.(event)

          if (!event.defaultPrevented) {
            const calls = (globalThis as unknown as { __navigateCalls: typeof navigateCalls })
              .__navigateCalls
            calls.push(typeof href === 'string' ? href : href?.pathname)
          }
        },
      },
      children
    )
  }

  return { __esModule: true, default: Link }
})

describe('TripCard', () => {
  const baseTrip: Trip = {
    id: 'trip-1',
    name: 'Summer Escape',
    description: 'Exploring the coast together',
    start_date: new Date(Date.now() + 86400000).toISOString(),
    end_date: new Date(Date.now() + 172800000).toISOString(),
    cover_image_url: null,
    owner_id: 'owner-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner: {
      id: 'owner-1',
      full_name: 'Owner User',
      avatar_url: null,
    },
    trip_participants: [
      {
        id: 'participant-1',
        role: 'member',
        user: {
          id: 'user-1',
          full_name: 'Jane Doe',
          avatar_url: null,
        },
      },
      {
        id: 'participant-2',
        role: 'member',
        user: {
          id: 'user-2',
          full_name: 'Alex Smith',
          avatar_url: 'https://example.com/avatar.png',
        },
      },
    ],
  }

  beforeEach(() => {
    navigateCalls.splice(0, navigateCalls.length)
  })

  it('calls edit and delete callbacks without triggering navigation', () => {
    const handleEdit = jest.fn()
    const handleDelete = jest.fn()

    render(<TripCard trip={baseTrip} onEdit={handleEdit} onDelete={handleDelete} />)

    fireEvent.click(screen.getByRole('button', { name: /edit trip/i }))
    fireEvent.click(screen.getByRole('button', { name: /delete trip/i }))

    expect(handleEdit).toHaveBeenCalledWith(baseTrip.id)
    expect(handleDelete).toHaveBeenCalledWith(baseTrip.id)
    expect(navigateCalls).toHaveLength(0)
  })

  it('renders avatar fallbacks and status badge consistently', () => {
    const { container } = render(<TripCard trip={baseTrip} />)

    expect(screen.getByText('Upcoming')).toBeInTheDocument()
    expect(screen.getByText('Upcoming')).toMatchInlineSnapshot(`
<div
  class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80"
>
  Upcoming
</div>
`)

    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument()

    const fallback = screen.getByText('JD')
    expect(fallback).toBeInTheDocument()
    expect(fallback).toMatchInlineSnapshot(`
<span
  class="flex h-full w-full items-center justify-center rounded-full bg-muted text-xs"
>
  JD
</span>
`)

    const participantsContainer = container.querySelector('.flex.-space-x-2')
    expect(participantsContainer).toMatchSnapshot()
  })
})
