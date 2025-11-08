'use client'

/**
 * ParticipantPicker Component
 *
 * Multi-select checkbox list for choosing expense participants.
 * Features:
 * - Avatar + name display
 * - Select All / Deselect All buttons
 * - Selected count indicator
 * - Highlights payer
 */

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users } from 'lucide-react'

interface Participant {
  id: string
  name: string
  avatar_url?: string
}

interface ParticipantPickerProps {
  participants: Participant[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
  payerId?: string
}

export function ParticipantPicker({
  participants,
  selectedIds,
  onChange,
  payerId,
}: ParticipantPickerProps) {
  const handleToggle = (participantId: string) => {
    const newSelection = selectedIds.includes(participantId)
      ? selectedIds.filter(id => id !== participantId)
      : [...selectedIds, participantId]
    onChange(newSelection)
  }

  const handleSelectAll = () => {
    onChange(participants.map(p => p.id))
  }

  const handleDeselectAll = () => {
    onChange([])
  }

  const allSelected = selectedIds.length === participants.length
  const noneSelected = selectedIds.length === 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Participants ({selectedIds.length} of {participants.length})
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            disabled={allSelected}
            className="h-8 text-xs"
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDeselectAll}
            disabled={noneSelected}
            className="h-8 text-xs"
          >
            Deselect All
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
        {participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mb-2" />
            <p className="text-sm">No participants available</p>
          </div>
        ) : (
          participants.map(participant => {
            const isSelected = selectedIds.includes(participant.id)
            const isPayer = payerId === participant.id
            const initials = participant.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()

            return (
              <div
                key={participant.id}
                className="flex items-center space-x-3 rounded-md p-2 hover:bg-accent transition-colors"
                data-testid={`participant-${participant.id}`}
              >
                <Checkbox
                  id={participant.id}
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(participant.id)}
                />
                <Avatar className="h-8 w-8">
                  <AvatarImage src={participant.avatar_url} alt={participant.name} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <Label htmlFor={participant.id} className="flex-1 cursor-pointer font-normal">
                  {participant.name}
                  {isPayer && <span className="ml-2 text-xs text-muted-foreground">(Payer)</span>}
                </Label>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
