'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, MessageSquare, Calendar, DollarSign, Settings, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from '@/components/ui/sheet'
import { TripSwitcher } from './TripSwitcher'
import { TripWithParticipants } from '@tripthreads/core'

interface TripNavigationProps {
  tripId: string
  tripName: string
  userTrips: TripWithParticipants[]
}

const navItems = [
  {
    label: 'Home',
    href: (tripId: string) => `/trips/${tripId}`,
    icon: Home,
  },
  {
    label: 'Chat',
    href: (tripId: string) => `/trips/${tripId}/chat`,
    icon: MessageSquare,
  },
  {
    label: 'Plan',
    href: (tripId: string) => `/trips/${tripId}/plan`,
    icon: Calendar,
  },
  {
    label: 'Expenses',
    href: (tripId: string) => `/trips/${tripId}/expenses`,
    icon: DollarSign,
  },
  {
    label: 'Settings',
    href: (tripId: string) => `/trips/${tripId}/settings`,
    icon: Settings,
  },
]

export function TripNavigation({ tripId, tripName, userTrips }: TripNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    // Exact match for home
    if (href === `/trips/${tripId}`) {
      return pathname === href
    }
    // Starts with for sub-routes
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Hamburger Menu */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="p-6 border-b">
              <TripSwitcher
                currentTripId={tripId}
                currentTripName={tripName}
                trips={userTrips}
                onMobileSheetClose={() => setIsOpen(false)}
              />
            </SheetHeader>
            <nav className="flex flex-col space-y-1 p-3">
              {navItems.map(item => {
                const Icon = item.icon
                const href = item.href(tripId)
                const active = isActive(href)

                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-muted/10">
        <div className="p-6">
          <TripSwitcher currentTripId={tripId} currentTripName={tripName} trips={userTrips} />
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map(item => {
            const Icon = item.icon
            const href = item.href(tripId)
            const active = isActive(href)

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
