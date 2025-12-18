/**
 * Authenticated App Layout
 *
 * Layout for authenticated pages.
 * Includes global navigation bar, profile completion check, and first-run onboarding.
 * Wraps children with TripContextProvider to enable trip-aware navbar.
 */

import { AppNavBar } from '@/components/layouts/AppNavBar'
import { ProfileCompletionProvider } from '@/components/features/profile/ProfileCompletionProvider'
import { LazyOnboarding } from '@/components/features/onboarding/LazyOnboarding'
import { TripContextProvider } from '@/lib/contexts/trip-context'

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <TripContextProvider>
      <AppNavBar />
      <ProfileCompletionProvider />
      <LazyOnboarding autoStart={true} />
      {/*
        Padding: pt-24 (96px) accounts for two-row navbar on trip pages
        Non-trip pages have single-row (48px) but extra padding is acceptable
      */}
      <div className="pt-24">{children}</div>
    </TripContextProvider>
  )
}
