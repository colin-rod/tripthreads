/**
 * Authenticated App Layout
 *
 * Layout for authenticated pages.
 * Includes global navigation bar, profile completion check, and first-run onboarding.
 */

import { AppNavBar } from '@/components/layouts/AppNavBar'
import { ProfileCompletionProvider } from '@/components/features/profile/ProfileCompletionProvider'
import { Onboarding } from '@/components/features/onboarding'

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <AppNavBar />
      <ProfileCompletionProvider />
      <Onboarding autoStart={true} />
      <div className="pt-16">{children}</div>
    </>
  )
}
