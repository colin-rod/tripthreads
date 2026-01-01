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
import { Footer } from '@/components/features/legal/Footer'
import { PushSubscriptionPrompt } from '@/components/features/notifications/PushSubscriptionPrompt'

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <TripContextProvider>
      <div className="flex flex-col min-h-screen">
        <AppNavBar />
        <ProfileCompletionProvider />
        <LazyOnboarding autoStart={true} />
        {/*
          Padding: pt-24 (96px) accounts for two-row navbar on trip pages
          Non-trip pages have single-row (48px) but extra padding is acceptable
        */}
        <main className="flex-1 pt-24">
          <div className="container mx-auto px-4 mb-6">
            <PushSubscriptionPrompt />
          </div>
          {children}
        </main>
        <Footer />
      </div>
    </TripContextProvider>
  )
}
