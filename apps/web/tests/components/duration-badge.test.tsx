/**
 * DurationBadge Component Tests
 *
 * Tests the duration badge component that displays calculated durations
 * for itinerary items (e.g., "2h 30m", "3 days").
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { DurationBadge } from '../../components/features/itinerary/DurationBadge'

describe('DurationBadge', () => {
  describe('rendering with duration', () => {
    it('renders duration with Clock icon', () => {
      render(
        <DurationBadge
          startTime="2025-06-15T08:00:00Z"
          endTime="2025-06-15T10:30:00Z"
          isAllDay={false}
        />
      )

      expect(screen.getByText('2h 30m')).toBeInTheDocument()
      // Clock icon should be present (SVG element)
      const badge = screen.getByText('2h 30m').parentElement
      expect(badge?.querySelector('svg')).toBeInTheDocument()
    })

    it('renders hours-only duration', () => {
      render(
        <DurationBadge
          startTime="2025-06-15T08:00:00Z"
          endTime="2025-06-15T11:00:00Z"
          isAllDay={false}
        />
      )

      expect(screen.getByText('3h')).toBeInTheDocument()
    })

    it('renders minutes-only duration', () => {
      render(
        <DurationBadge
          startTime="2025-06-15T08:00:00Z"
          endTime="2025-06-15T08:45:00Z"
          isAllDay={false}
        />
      )

      expect(screen.getByText('45m')).toBeInTheDocument()
    })

    it('renders multi-day duration', () => {
      render(
        <DurationBadge
          startTime="2025-06-15T08:00:00Z"
          endTime="2025-06-18T08:00:00Z"
          isAllDay={false}
        />
      )

      expect(screen.getByText('3 days')).toBeInTheDocument()
    })

    it('renders single day duration', () => {
      render(
        <DurationBadge
          startTime="2025-06-15T08:00:00Z"
          endTime="2025-06-16T08:00:00Z"
          isAllDay={false}
        />
      )

      expect(screen.getByText('1 day')).toBeInTheDocument()
    })
  })

  describe('null cases', () => {
    it('returns null when end_time is null', () => {
      const { container } = render(
        <DurationBadge startTime="2025-06-15T08:00:00Z" endTime={null} isAllDay={false} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('returns null for all-day events', () => {
      const { container } = render(
        <DurationBadge
          startTime="2025-06-15T08:00:00Z"
          endTime="2025-06-15T18:00:00Z"
          isAllDay={true}
        />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('size variants', () => {
    it('applies small size classes by default', () => {
      render(
        <DurationBadge
          startTime="2025-06-15T08:00:00Z"
          endTime="2025-06-15T10:30:00Z"
          isAllDay={false}
        />
      )

      const badge = screen.getByText('2h 30m').parentElement
      expect(badge).toHaveClass('text-xs')
      expect(badge).toHaveClass('px-1.5')
      expect(badge).toHaveClass('py-0.5')
    })

    it('applies small size classes explicitly', () => {
      render(
        <DurationBadge
          startTime="2025-06-15T08:00:00Z"
          endTime="2025-06-15T10:30:00Z"
          isAllDay={false}
          size="sm"
        />
      )

      const badge = screen.getByText('2h 30m').parentElement
      expect(badge).toHaveClass('text-xs')
      expect(badge).toHaveClass('px-1.5')
      expect(badge).toHaveClass('py-0.5')

      // Check icon size
      const icon = badge?.querySelector('svg')
      expect(icon).toHaveClass('h-3')
      expect(icon).toHaveClass('w-3')
    })

    it('applies medium size classes', () => {
      render(
        <DurationBadge
          startTime="2025-06-15T08:00:00Z"
          endTime="2025-06-15T10:30:00Z"
          isAllDay={false}
          size="md"
        />
      )

      const badge = screen.getByText('2h 30m').parentElement
      expect(badge).toHaveClass('text-sm')
      expect(badge).toHaveClass('px-2')
      expect(badge).toHaveClass('py-1')

      // Check icon size
      const icon = badge?.querySelector('svg')
      expect(icon).toHaveClass('h-4')
      expect(icon).toHaveClass('w-4')
    })
  })

  describe('styling', () => {
    it('applies correct base styling classes', () => {
      render(
        <DurationBadge
          startTime="2025-06-15T08:00:00Z"
          endTime="2025-06-15T10:30:00Z"
          isAllDay={false}
        />
      )

      const badge = screen.getByText('2h 30m').parentElement
      expect(badge).toHaveClass('inline-flex')
      expect(badge).toHaveClass('items-center')
      expect(badge).toHaveClass('gap-1')
      expect(badge).toHaveClass('rounded-md')
      expect(badge).toHaveClass('bg-gray-100')
      expect(badge).toHaveClass('text-gray-600')
    })

    it('applies custom className when provided', () => {
      render(
        <DurationBadge
          startTime="2025-06-15T08:00:00Z"
          endTime="2025-06-15T10:30:00Z"
          isAllDay={false}
          className="custom-class"
        />
      )

      const badge = screen.getByText('2h 30m').parentElement
      expect(badge).toHaveClass('custom-class')
      // Should still have base classes
      expect(badge).toHaveClass('bg-gray-100')
    })

    it('Clock icon has correct color class', () => {
      render(
        <DurationBadge
          startTime="2025-06-15T08:00:00Z"
          endTime="2025-06-15T10:30:00Z"
          isAllDay={false}
        />
      )

      const badge = screen.getByText('2h 30m').parentElement
      const icon = badge?.querySelector('svg')
      expect(icon).toHaveClass('text-gray-500')
    })
  })

  describe('edge cases', () => {
    it('handles zero duration', () => {
      render(
        <DurationBadge
          startTime="2025-06-15T08:00:00Z"
          endTime="2025-06-15T08:00:00Z"
          isAllDay={false}
        />
      )

      expect(screen.getByText('0m')).toBeInTheDocument()
    })

    it('handles very long durations', () => {
      render(
        <DurationBadge
          startTime="2025-06-15T08:00:00Z"
          endTime="2025-06-22T08:00:00Z"
          isAllDay={false}
        />
      )

      expect(screen.getByText('7 days')).toBeInTheDocument()
    })
  })
})
