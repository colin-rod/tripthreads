'use client'

import { Search } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { UserAvatarDropdown } from './UserAvatarDropdown'

interface TopNavBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function TopNavBar({ searchQuery, onSearchChange }: TopNavBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background shadow-sm">
      <div className="flex h-full items-center justify-between px-6">
        {/* Logo/Title */}
        <div className="flex items-center">
          <Link href="/trips" className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-foreground">TripThreads</h1>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative mx-8 hidden flex-1 max-w-xl md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search trips..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-10 bg-muted/50 border-border focus:bg-background"
          />
        </div>

        {/* User Avatar */}
        <div className="flex items-center">
          <UserAvatarDropdown />
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="relative mx-4 pb-3 md:hidden">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search trips..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-10 bg-muted/50 border-border focus:bg-background"
        />
      </div>
    </header>
  )
}
