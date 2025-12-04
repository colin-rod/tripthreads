'use client'

import Link from 'next/link'
import { UserAvatarDropdown } from './UserAvatarDropdown'

/**
 * AppNavBar Component
 *
 * Global navigation bar for all authenticated pages.
 * Provides consistent navigation with TripThreads logo (links to /trips)
 * and user menu dropdown (Settings, Feedback, Logout).
 *
 * Features:
 * - Fixed positioning at top of viewport
 * - No search functionality (simplified for global use)
 * - Mobile-responsive
 * - Z-index of 60 to sit above content but below modals
 */
export function AppNavBar() {
  return (
    <header
      role="banner"
      className="fixed top-0 left-0 right-0 z-[60] h-16 border-b border-border bg-background shadow-sm"
    >
      <div className="flex h-full items-center justify-between px-6">
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
    </header>
  )
}
