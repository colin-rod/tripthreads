import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth/auth-context'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

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
      <body className={`${inter.variable} antialiased font-sans`}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
        <SonnerToaster position="top-right" />
      </body>
    </html>
  )
}
