'use client'

import Link from 'next/link'
import { Home, MessageSquare, DollarSign, Calendar, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ParticipantsDropdown } from './ParticipantsDropdown'
import type { TripSection } from '@/hooks/useHashNavigation'

interface HorizontalNavProps {
  currentSection: TripSection
  tripId: string
  participants: Array<{
    id: string
    role: 'owner' | 'participant' | 'viewer'
    join_start_date?: string | null
    join_end_date?: string | null
    user: {
      id: string
      full_name: string | null
      avatar_url: string | null
    }
  }>
  unreadChatCount?: number
  className?: string
}

interface NavLinkProps {
  href: string
  active: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: number
}

function NavLink({ href, active, icon: Icon, label, badge }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors rounded-md',
        'hover:bg-accent hover:text-accent-foreground',
        active ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground'
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <Badge variant="default" className="ml-1 h-5 px-2">
          {badge}
        </Badge>
      )}
    </Link>
  )
}

export function HorizontalNav({
  currentSection,
  tripId,
  participants,
  unreadChatCount = 0,
  className,
}: HorizontalNavProps) {
  return (
    <div className={cn('border-b bg-background', className)}>
      <div className="flex items-center justify-between px-6 h-14">
        {/* Left: Main navigation */}
        <nav className="flex items-center gap-1">
          <NavLink
            href={`/trips/${tripId}`}
            active={currentSection === 'home'}
            icon={Home}
            label="Home"
          />
          <NavLink
            href={`/trips/${tripId}#chat`}
            active={currentSection === 'chat'}
            icon={MessageSquare}
            label="Chat"
            badge={unreadChatCount}
          />
          <NavLink
            href={`/trips/${tripId}#expenses`}
            active={currentSection === 'expenses'}
            icon={DollarSign}
            label="Expenses"
          />
          <NavLink
            href={`/trips/${tripId}#plan`}
            active={currentSection === 'plan'}
            icon={Calendar}
            label="Plan"
          />
          <NavLink
            href={`/trips/${tripId}#feed`}
            active={currentSection === 'feed'}
            icon={Camera}
            label="Feed"
          />
        </nav>

        {/* Right: Participants dropdown */}
        <ParticipantsDropdown participants={participants} tripId={tripId} />
      </div>
    </div>
  )
}
