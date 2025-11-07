import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth/auth-context'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'

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
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
        <SonnerToaster position="top-right" />
      </body>
    </html>
  )
}
