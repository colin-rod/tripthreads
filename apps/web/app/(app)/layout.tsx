/**
 * Authenticated App Layout
 *
 * Layout for authenticated pages.
 * Includes profile completion check and first-run onboarding.
 */

import { ProfileCompletionProvider } from '@/components/features/profile/ProfileCompletionProvider'
import { Onboarding } from '@/components/features/onboarding'

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <ProfileCompletionProvider />
      <Onboarding autoStart={true} />
      {children}
    </>
  )
}
