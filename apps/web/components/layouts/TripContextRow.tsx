'use client'

/**
 * TripContextRow Component
 *
 * Row 2 of the two-row navbar - displays trip-specific information and actions.
 * Only rendered when trip context is present (on trip pages).
 *
 * Desktop layout: Full trip info (name, dates, participants) + action menu + settings
 * Mobile layout: Simplified (back arrow, trip name, hamburger menu)
 */

import {
  ArrowLeft,
  Plus,
  ChevronDown,
  Menu,
  MessageSquare,
  DollarSign,
  Calendar,
  Camera,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { TripActions } from '@/components/features/trips/TripActions'
import type { TripSection } from '@/hooks/useHashNavigation'
import type { TripContextData } from '@/lib/contexts/trip-context'

interface TripContextRowProps {
  trip: TripContextData['trip']
  isOwner: boolean
  userRole: 'owner' | 'participant' | 'viewer'
  activeSection: TripSection
  onNavigate: (section: TripSection) => void
}

export function TripContextRow({
  trip,
  isOwner,
  userRole,
  activeSection,
  onNavigate,
}: TripContextRowProps) {
  const router = useRouter()

  // Format dates
  const startDate = new Date(trip.start_date)
  const endDate = new Date(trip.end_date)
  const dateRange = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`

  const participantCount = trip.trip_participants?.length || 0

  const handleBackClick = () => {
    router.push(`/trips/${trip.id}`)
    window.location.hash = ''
  }

  const handleTripNameClick = () => {
    onNavigate('home')
  }

  return (
    <div className="flex h-12 items-center justify-between px-6 border-t border-border bg-background">
      {/* Left Section */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Back Arrow - only show if not on home section */}
        {activeSection !== 'home' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleBackClick}
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Trip Name - clickable */}
        <button
          onClick={handleTripNameClick}
          className="text-base sm:text-lg font-semibold hover:text-primary transition-colors truncate min-w-0"
          aria-label="Return to trip dashboard"
        >
          {trip.name}
        </button>

        {/* Role Badge - Desktop only */}
        {isOwner && (
          <Badge variant="outline" className="text-xs hidden sm:inline-flex flex-shrink-0">
            Owner
          </Badge>
        )}
        {userRole === 'viewer' && (
          <Badge variant="secondary" className="text-xs hidden sm:inline-flex flex-shrink-0">
            Viewer
          </Badge>
        )}

        {/* Separator - Desktop only */}
        <span className="text-muted-foreground hidden sm:inline flex-shrink-0">•</span>

        {/* Dates - Desktop only */}
        <span className="text-sm text-muted-foreground hidden md:inline whitespace-nowrap flex-shrink-0">
          {dateRange}
        </span>

        {/* Separator - Desktop only */}
        <span className="text-muted-foreground hidden md:inline flex-shrink-0">•</span>

        {/* Participant Avatars - Desktop only */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-auto p-0 hover:bg-transparent hover:text-primary hidden md:flex flex-shrink-0"
            >
              <div className="flex items-center -space-x-2">
                {trip.trip_participants?.slice(0, 3).map(p => (
                  <Avatar key={p.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={p.user.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {p.user.full_name
                        ?.split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {participantCount > 3 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium">
                    +{participantCount - 3}
                  </div>
                )}
              </div>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel>Trip Participants</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-96 overflow-y-auto">
              {trip.trip_participants?.map(participant => (
                <DropdownMenuItem key={participant.id} className="flex items-center gap-3 py-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={participant.user.avatar_url || undefined} />
                    <AvatarFallback>
                      {participant.user.full_name
                        ?.split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {participant.user.full_name || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge
                        variant={
                          participant.role === 'owner'
                            ? 'default'
                            : participant.role === 'participant'
                              ? 'secondary'
                              : 'outline'
                        }
                        className="text-xs"
                      >
                        {participant.role === 'owner'
                          ? 'Owner'
                          : participant.role === 'participant'
                            ? 'Participant'
                            : 'Viewer'}
                      </Badge>
                      {participant.join_start_date && participant.join_end_date && (
                        <Badge variant="outline" className="text-xs">
                          Partial
                        </Badge>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right Section - Desktop */}
      <div className="hidden md:flex items-center gap-2 flex-shrink-0">
        {/* + Add Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onNavigate('chat')}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('expenses')}>
              <DollarSign className="mr-2 h-4 w-4" />
              Add Expense
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('plan')}>
              <Calendar className="mr-2 h-4 w-4" />
              Add Activity
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('feed')}>
              <Camera className="mr-2 h-4 w-4" />
              Upload Photo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings Gear (TripActions) */}
        <TripActions trip={trip} tripId={trip.id} isOwner={isOwner} onNavigate={onNavigate} />
      </div>

      {/* Right Section - Mobile (Hamburger Menu) */}
      <div className="md:hidden flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate('chat')}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('expenses')}>
              <DollarSign className="mr-2 h-4 w-4" />
              Add Expense
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('plan')}>
              <Calendar className="mr-2 h-4 w-4" />
              Add Activity
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('feed')}>
              <Camera className="mr-2 h-4 w-4" />
              Upload Photo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Participants ({participantCount})</DropdownMenuLabel>
            {trip.trip_participants?.slice(0, 5).map(participant => (
              <DropdownMenuItem key={participant.id} className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={participant.user.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {participant.user.full_name
                      ?.split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{participant.user.full_name || 'Unknown'}</span>
              </DropdownMenuItem>
            ))}
            {participantCount > 5 && (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                +{participantCount - 5} more
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
