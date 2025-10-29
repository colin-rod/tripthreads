/**
 * Authenticated App Layout
 *
 * Layout for authenticated pages.
 * Includes profile completion check.
 */

import { ProfileCompletionProvider } from '@/components/features/profile/ProfileCompletionProvider'

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <ProfileCompletionProvider />
      {children}
    </>
  )
}
