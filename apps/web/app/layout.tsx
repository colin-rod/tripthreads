import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth/auth-context'
import { PostHogProvider } from '@/lib/analytics/posthog-provider'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { FloatingFeedbackButton } from '@/components/features/feedback/FloatingFeedbackButton'
import { CookieConsentBanner } from '@/components/features/legal/CookieConsentBanner'
import { ServiceWorkerRegistration } from '@/components/features/notifications/ServiceWorkerRegistration'
import { initializeAnalytics } from '@/lib/analytics'

// Initialize analytics trackers on app load
initializeAnalytics()

export const metadata: Metadata = {
  title: 'TripThreads - Collaborative Trip Planning',
  description: 'Plan, track, and share trips with your group',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <ServiceWorkerRegistration />
        <AuthProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </AuthProvider>
        <Toaster />
        <SonnerToaster position="top-right" />
        <FloatingFeedbackButton />
        <CookieConsentBanner />
      </body>
    </html>
  )
}
