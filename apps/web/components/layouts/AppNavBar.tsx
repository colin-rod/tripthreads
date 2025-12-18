'use client'

import Link from 'next/link'
import { UserAvatarDropdown } from './UserAvatarDropdown'
import { TripContextRow } from './TripContextRow'
import { useTripContext } from '@/lib/contexts/trip-context'
import { cn } from '@/lib/utils'
import type { TripSection } from '@/hooks/useHashNavigation'

/**
 * AppNavBar Component
 *
 * Global navigation bar for all authenticated pages.
 * Dynamically renders as single-row or two-row navbar based on trip context.
 *
 * Single-row (non-trip pages):
 * - Row 1: TripThreads logo + user menu (48px)
 *
 * Two-row (trip pages):
 * - Row 1: TripThreads logo + user menu (48px)
 * - Row 2: Trip context (name, dates, participants, actions) (48px)
 *
 * Features:
 * - Fixed positioning at top of viewport
 * - Context-aware height (h-12 vs h-24)
 * - Mobile-responsive
 * - Z-index of 60 to sit above content but below modals
 */
export function AppNavBar() {
  const { tripContext, updateActiveSection } = useTripContext()

  // Dynamic height based on whether trip context exists
  const navHeight = tripContext ? 'h-24' : 'h-12'

  const handleNavigate = (section: TripSection) => {
    // Update context
    updateActiveSection(section)
    // Update URL hash
    window.location.hash = section === 'home' ? '' : section
  }

  return (
    <header
      role="banner"
      className={cn(
        'fixed top-0 left-0 right-0 z-[60] border-b border-border bg-background shadow-sm',
        navHeight
      )}
    >
      {/* Row 1: Global Navigation - ALWAYS VISIBLE */}
      <div className="flex h-12 items-center justify-between px-6">
        {/* Logo/Title - Links to trips list */}
        <div className="flex items-center">
          <Link href="/trips" className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-foreground">TripThreads</h1>
          </Link>
        </div>

        {/* User Avatar Dropdown */}
        <div className="flex items-center">
          <UserAvatarDropdown />
        </div>
      </div>

      {/* Row 2: Trip Context - CONDITIONAL */}
      {tripContext && (
        <TripContextRow
          trip={tripContext.trip}
          isOwner={tripContext.isOwner}
          userRole={tripContext.userRole}
          activeSection={tripContext.activeSection}
          onNavigate={handleNavigate}
        />
      )}
    </header>
  )
}
