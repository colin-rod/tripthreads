/**
 * SectionHeader Component
 *
 * Consistent section headers with icons for itinerary items.
 * Provides visual hierarchy and organization in the detail view.
 */

import type { LucideIcon } from 'lucide-react'

interface SectionHeaderProps {
  icon: LucideIcon
  title: string
}

export function SectionHeader({ icon: Icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
      <Icon className="h-4 w-4" />
      <span>{title}</span>
    </div>
  )
}
