/**
 * InfoRow Component
 *
 * Reusable label + value display component for itinerary metadata.
 * Used in view mode to display type-specific fields.
 */

import type { LucideIcon } from 'lucide-react'

interface InfoRowProps {
  label: string
  value: string | null | undefined
  icon?: LucideIcon
}

export function InfoRow({ label, value, icon: Icon }: InfoRowProps) {
  if (!value) return null

  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-base break-words">{value}</p>
      </div>
    </div>
  )
}
