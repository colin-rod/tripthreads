'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { UserIcon } from 'lucide-react'

export interface MentionableUser {
  id: string
  full_name: string | null
  email: string
  avatar_url?: string | null
}

interface MentionAutocompleteProps {
  participants: MentionableUser[]
  query: string
  onSelect: (user: MentionableUser) => void
  onClose: () => void
  position: { top: number; left: number }
}

export function MentionAutocomplete({
  participants,
  query,
  onSelect,
  onClose,
  position,
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter participants by query (case insensitive)
  const filteredParticipants = participants.filter(participant => {
    const searchText = query.toLowerCase()
    const fullNameMatch = participant.full_name?.toLowerCase().includes(searchText) ?? false
    const emailMatch = participant.email.toLowerCase().includes(searchText)
    const usernameMatch = participant.email.split('@')[0].toLowerCase().includes(searchText)

    return fullNameMatch || emailMatch || usernameMatch
  })

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredParticipants.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(
          prev => (prev - 1 + filteredParticipants.length) % filteredParticipants.length
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredParticipants[selectedIndex]) {
          onSelect(filteredParticipants[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, filteredParticipants, onSelect, onClose])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  if (filteredParticipants.length === 0) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-50 w-64 rounded-lg border bg-popover shadow-lg"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="max-h-64 overflow-y-auto p-1">
        {filteredParticipants.map((participant, index) => (
          <button
            key={participant.id}
            type="button"
            onClick={() => onSelect(participant)}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              selectedIndex === index && 'bg-accent text-accent-foreground'
            )}
          >
            {/* Avatar */}
            {participant.avatar_url ? (
              <img
                src={participant.avatar_url}
                alt={participant.full_name || 'User'}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            {/* User info */}
            <div className="flex-1 overflow-hidden">
              <p className="truncate font-medium">
                {participant.full_name || participant.email.split('@')[0]}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{participant.email.split('@')[0]}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
