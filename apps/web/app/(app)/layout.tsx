/**
 * Authenticated App Layout
 *
 * Layout for authenticated pages.
 * Includes global navigation bar, profile completion check, and first-run onboarding.
 */

import { AppNavBar } from '@/components/layouts/AppNavBar'
import { ProfileCompletionProvider } from '@/components/features/profile/ProfileCompletionProvider'
import { LazyOnboarding } from '@/components/features/onboarding/LazyOnboarding'

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <AppNavBar />
      <ProfileCompletionProvider />
      <LazyOnboarding autoStart={true} />
      <div className="pt-16">{children}</div>
    </>
  )
}
